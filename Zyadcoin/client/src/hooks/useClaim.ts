// ============================================================================
// useClaim: turns answered questions into real ZYD.
//
//   1. POST /api/claim with { sessionId, answers, userAddress }. The backend
//      grades server-side and, only if all 3 are correct, returns a signed
//      EIP-712 claim (amount, nonce, deadline, signature).
//   2. Submit that signed claim to the faucet on-chain (the connected wallet
//      pays gas). On success, refresh the real balance and fire confetti.
//
// The backend consumes the session on the first /api/claim call, but the signed
// claim it returns stays valid on-chain until its deadline / until the nonce is
// used. So if the on-chain step fails (user rejects, out of gas), we keep the
// signed claim and let the user retry the on-chain step WITHOUT re-grading.
// ============================================================================

import { useCallback, useState } from "react";
import confetti from "canvas-confetti";
import { claimReward, claimGasless, type ReviewItem } from "../lib/api";
import { claimFromFaucet } from "../lib/wallet";
import { SEPOLIA_CHAIN_ID } from "../config";
import type { UseWalletReturn } from "./useWallet";

export type ClaimStatus =
  | "idle"
  | "submitting" // asking the backend to grade + sign
  | "claiming" // sending the signed claim on-chain
  | "success"
  | "wrong" // not all correct (or session expired) — no reward
  | "error";

interface SignedClaim {
  amount: string;
  nonce: string;
  deadline: string;
  signature: string;
}

// Map an ethers/MetaMask/contract error to a friendly, specific message.
function describeClaimError(err: unknown): string {
  const e = err as {
    code?: string | number;
    shortMessage?: string;
    reason?: string;
    message?: string;
    info?: { error?: { code?: number } };
  };
  const code = e?.code;
  if (code === 4001 || code === "ACTION_REJECTED" || e?.info?.error?.code === 4001) {
    return "You rejected the transaction in MetaMask.";
  }
  if (code === "INSUFFICIENT_FUNDS") {
    return "Not enough Sepolia ETH for gas. Get some from a Sepolia faucet and try again.";
  }
  const text = `${e?.reason ?? ""} ${e?.shortMessage ?? ""} ${e?.message ?? ""}`.toLowerCase();
  
  // Check for the specific "missing revert data" / "execution reverted" error
  if (text.includes("missing revert data") || (text.includes("execution reverted") && text.includes("no data"))) {
    return "Transaction failed - likely insufficient Sepolia ETH for gas, or you're on the wrong network. Make sure you're on Sepolia and have at least 0.001 Sepolia ETH.";
  }
  
  if (text.includes("deadline") || text.includes("expired")) {
    return "This claim expired (signatures are valid for 10 minutes). Get a new set and try again.";
  }
  if (text.includes("nonce") || text.includes("already") || text.includes("claimed") || text.includes("used")) {
    return "This claim was already used. Get a new set of questions to earn again.";
  }
  if (text.includes("insufficient") || text.includes("balance") || text.includes("empty")) {
    return "The faucet is out of ZYD right now. Try again later.";
  }
  if (text.includes("gas")) {
    return "Not enough Sepolia ETH for gas. Get testnet ETH from a Sepolia faucet and try again.";
  }
  return e?.shortMessage ?? e?.reason ?? "The claim transaction failed. Make sure you're on Sepolia and have Sepolia ETH for gas.";
}

export function useClaim(wallet: UseWalletReturn) {
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [signedClaim, setSignedClaim] = useState<SignedClaim | null>(null);
  const [canUseGasless, setCanUseGasless] = useState(false);

  // Send a (already obtained) signed claim to the faucet on-chain.
  const sendOnChain = useCallback(
    async (claim: SignedClaim) => {
      if (!wallet.address) {
        setStatus("error");
        setError("Connect your wallet first.");
        return;
      }
      // Don't waste gas on a doomed transaction if the signature already expired.
      if (Number(claim.deadline) <= Math.floor(Date.now() / 1000)) {
        setStatus("error");
        setError("This claim expired (valid for 10 minutes). Get a new set and try again.");
        return;
      }
      setStatus("claiming");
      setError(null);
      try {
        const hash = await claimFromFaucet({ recipient: wallet.address, ...claim });
        setTxHash(hash);
        setStatus("success");
        confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
        await wallet.refreshBalance(); // show the new on-chain ZYD balance
      } catch (err) {
        setStatus("error");
        setError(describeClaimError(err));
        // If it's a gas/revert issue, offer gasless as an alternative
        const errText = String(err).toLowerCase();
        if (errText.includes("gas") || errText.includes("insufficient") || errText.includes("revert")) {
          setCanUseGasless(true);
        }
      }
    },
    [wallet],
  );

  // Full flow: grade on the backend, then (if all correct) claim on-chain.
  const claim = useCallback(
    async (sessionId: string, answers: number[]) => {
      setError(null);
      setMessage(null);
      setReview(null);
      setTxHash(null);
      setSignedClaim(null);

      // Preconditions: connected wallet on Sepolia.
      if (!wallet.address) {
        setStatus("error");
        setError("Connect your wallet first.");
        return;
      }
      if (wallet.chainId !== SEPOLIA_CHAIN_ID) {
        setStatus("error");
        setError("Wrong network. Switch to Sepolia to claim.");
        return;
      }

      // 1) Ask the backend to grade and sign.
      setStatus("submitting");
      let resp;
      try {
        resp = await claimReward({ sessionId, answers, userAddress: wallet.address });
      } catch {
        setStatus("error");
        setError("Could not reach the server. Is the backend running?");
        return;
      }

      if (!resp.success) {
        // Wrong answers, or the session expired/was already used.
        setStatus("wrong");
        setMessage(resp.message ?? "Not all correct — get a new set and try again.");
        setReview(resp.review ?? null); // answer key (absent if session expired)
        return;
      }

      // Check if this was a partial credit gasless transfer (1-2 correct)
      if (resp.partialCredit && resp.txHash) {
        setTxHash(resp.txHash);
        setStatus("success");
        setMessage(resp.message ?? `You got ${resp.correctCount}/3 correct and earned ${resp.correctCount} ZYD!`);
        setReview(resp.review ?? null);
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
        await wallet.refreshBalance();
        return;
      }

      if (!resp.signature || !resp.amount || !resp.nonce || !resp.deadline) {
        setStatus("error");
        setError("The server did not return a valid signed claim.");
        return;
      }

      // 2) Submit the signed claim on-chain (keep it for a possible retry).
      const claimData: SignedClaim = {
        amount: resp.amount,
        nonce: resp.nonce,
        deadline: resp.deadline,
        signature: resp.signature,
      };
      setSignedClaim(claimData);
      await sendOnChain(claimData);
    },
    [wallet, sendOnChain],
  );

  // Retry only the on-chain step with the already-signed claim (e.g. after the
  // user rejected the MetaMask prompt or topped up gas). No new backend call.
  const retry = useCallback(async () => {
    if (signedClaim) await sendOnChain(signedClaim);
  }, [signedClaim, sendOnChain]);

  // Use gasless transfer: backend sends ZYD directly (no gas required from user)
  const useGasless = useCallback(async () => {
    if (!wallet.address) {
      setStatus("error");
      setError("Connect your wallet first.");
      return;
    }
    setStatus("claiming");
    setError(null);
    try {
      const result = await claimGasless(wallet.address);
      if (result.success && result.txHash) {
        setTxHash(result.txHash);
        setStatus("success");
        confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
        await wallet.refreshBalance();
      } else {
        setStatus("error");
        setError(result.message || "Gasless transfer failed.");
      }
    } catch (err) {
      setStatus("error");
      setError("Could not complete gasless transfer. Please try again later.");
    }
  }, [wallet]);

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage(null);
    setReview(null);
    setError(null);
    setTxHash(null);
    setSignedClaim(null);
    setCanUseGasless(false);
  }, []);

  return {
    status,
    message,
    review,
    error,
    txHash,
    canRetry: signedClaim !== null,
    canUseGasless,
    claim,
    retry,
    useGasless,
    reset,
  };
}
