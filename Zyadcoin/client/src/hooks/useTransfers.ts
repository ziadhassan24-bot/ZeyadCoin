// ============================================================================
// useTransfers: owns the "Send ZYD" send lifecycle and a local history feed.
//   - send() performs a real ERC-20 transfer (via lib/wallet.sendTokens)
//   - on success it records {hash, from, to, amount, note, timestamp} to
//     localStorage so a "Recent transfers" list survives refreshes
//
// The on-chain transfer is real. The note/memo is stored ONLY in the browser —
// the ERC-20 standard does not carry text on-chain.
// ============================================================================

import { useCallback, useState } from "react";
import { sendTokens } from "../lib/wallet";

export interface TransferRecord {
  hash: string;
  from: string;
  to: string;
  amount: string; // human amount, e.g. "1.5"
  note: string; // local-only memo
  timestamp: number; // ms since epoch
}

export type SendStatus = "idle" | "sending" | "success" | "error";

const TRANSFERS_KEY = "zyd_transfers";
const MAX_RECORDS = 20; // keep the feed small

function loadTransfers(): TransferRecord[] {
  try {
    const raw = localStorage.getItem(TRANSFERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as TransferRecord[]) : [];
  } catch {
    return [];
  }
}

function saveTransfers(list: TransferRecord[]) {
  localStorage.setItem(TRANSFERS_KEY, JSON.stringify(list));
}

// Turn an ethers/MetaMask error into a friendly message. ethers v6 reports a
// user rejection as code "ACTION_REJECTED" (and EIP-1193 code 4001 underneath).
function describeSendError(err: unknown): string {
  const e = err as {
    code?: number | string;
    shortMessage?: string;
    info?: { error?: { code?: number } };
  };
  const rejected =
    e?.code === 4001 ||
    e?.code === "ACTION_REJECTED" ||
    e?.info?.error?.code === 4001;
  if (rejected) return "Transaction rejected in MetaMask.";
  return e?.shortMessage ?? "Transaction failed. Please try again.";
}

export function useTransfers() {
  const [transfers, setTransfers] = useState<TransferRecord[]>(() => loadTransfers());
  const [status, setStatus] = useState<SendStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);

  // Perform the transfer. Returns true on success. Validation of the inputs
  // (address, amount, balance, network) happens in the component before this.
  const send = useCallback(
    async (to: string, amount: string, note: string, from: string): Promise<boolean> => {
      setStatus("sending");
      setError(null);
      setLastHash(null);
      try {
        const hash = await sendTokens(to, amount);
        const record: TransferRecord = {
          hash,
          from,
          to,
          amount,
          note,
          timestamp: Date.now(),
        };
        setTransfers((prev) => {
          const next = [record, ...prev].slice(0, MAX_RECORDS);
          saveTransfers(next);
          return next;
        });
        setLastHash(hash);
        setStatus("success");
        return true;
      } catch (err) {
        setError(describeSendError(err));
        setStatus("error");
        return false;
      }
    },
    [],
  );

  // Reset the status/error (e.g. when the user edits the form to try again).
  const clearStatus = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { transfers, status, error, lastHash, send, clearStatus };
}
