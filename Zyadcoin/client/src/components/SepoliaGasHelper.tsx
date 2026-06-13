import { AlertCircle, ExternalLink, Fuel } from "lucide-react";
import { useEffect, useState } from "react";
import type { UseWalletReturn } from "../hooks/useWallet";
import { BrowserProvider } from "ethers";
import { SEPOLIA_CHAIN_ID } from "../config";

/**
 * SepoliaGasHelper: Shows a prominent banner when user is on Sepolia but has
 * 0 or very low ETH, guiding them to get testnet ETH before claiming.
 */
interface SepoliaGasHelperProps {
  wallet: UseWalletReturn;
}

export default function SepoliaGasHelper({ wallet }: SepoliaGasHelperProps) {
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (wallet.status !== "connected" || wallet.chainId !== SEPOLIA_CHAIN_ID) {
      setEthBalance(null);
      return;
    }

    let cancelled = false;
    setIsChecking(true);

    async function checkEth() {
      try {
        if (!window.ethereum || !wallet.address) return;
        const provider = new BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(wallet.address);
        if (!cancelled) setEthBalance(balance);
      } catch (err) {
        console.error("Failed to check ETH balance:", err);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }

    checkEth();
    return () => {
      cancelled = true;
    };
  }, [wallet.status, wallet.chainId, wallet.address]);

  // Only show if connected on Sepolia and ETH is 0 or very low (< 0.001 ETH)
  if (
    wallet.status !== "connected" ||
    wallet.chainId !== SEPOLIA_CHAIN_ID ||
    isChecking ||
    ethBalance === null ||
    ethBalance >= 1_000_000_000_000_000n // 0.001 ETH in wei
  ) {
    return null;
  }

  return (
    <div className="px-5 py-6">
      <div className="brutal-border mx-auto max-w-6xl rounded-2xl bg-yellow p-6 shadow-brutal">
        <div className="flex items-start gap-4">
          <div className="brutal-border rounded-xl bg-cream p-3">
            <Fuel className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h3 className="mb-2 font-display text-xl font-bold">
              You need Sepolia ETH for gas ⛽
            </h3>
            <p className="mb-4 text-sm font-medium leading-relaxed text-zinc-700">
              Your wallet has <strong>{(Number(ethBalance) / 1e18).toFixed(4)} ETH</strong> on
              Sepolia. To claim your ZYD reward, you need <strong>at least 0.001 Sepolia
              ETH</strong> to pay for the transaction (gas). Sepolia ETH is free testnet
              currency — it has no real value.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://sepoliafaucet.com"
                target="_blank"
                rel="noopener noreferrer"
                className="brutal-border bg-ink brutal-hover inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-brutal-sm"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
                Get Free Sepolia ETH (Alchemy)
              </a>
              <a
                href="https://www.alchemy.com/faucets/ethereum-sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="brutal-border bg-cream brutal-hover inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-brutal-sm"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
                Alternative Faucet (Alchemy)
              </a>
              <a
                href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="brutal-border bg-cream brutal-hover inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-brutal-sm"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
                Google Cloud Faucet
              </a>
            </div>
            <div className="brutal-border mt-4 flex items-start gap-2 rounded-lg bg-cream p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
              <p className="text-xs font-medium text-zinc-700">
                <strong>After getting Sepolia ETH:</strong> Refresh this page and try claiming
                again. The claim transaction should succeed once you have gas funds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
