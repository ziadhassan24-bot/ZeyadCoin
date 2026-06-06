import {
  AlertCircle,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { CONTRACT_ADDRESS, TOKEN } from "../config";
import { shortAddress } from "../lib/wallet";
import type { UseWalletReturn } from "../hooks/useWallet";

/**
 * Wallet panel: connect MetaMask and show the real on-chain ZYD balance.
 * Renders different states: not connected, connecting, wrong network,
 * no wallet installed, and connected.
 */
interface WalletPanelProps {
  wallet: UseWalletReturn;
}

export default function WalletPanel({ wallet }: WalletPanelProps) {
  const { status, address, balance, error } = wallet;

  return (
    <section id="wallet" className="px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            Step 2 · Check your real balance
          </span>
        </div>
        <h2 className="font-display mb-8 text-4xl font-bold tracking-tight md:text-5xl">
          Your {TOKEN.symbol} wallet
        </h2>

        <div className="brutal-border bg-blue rounded-2xl p-6 shadow-brutal md:p-8">
          {/* Balance + address */}
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-zinc-700">
                On-chain {TOKEN.symbol} balance
              </div>
              <div className="font-display mt-1 flex items-center gap-3 text-4xl font-bold">
                {status === "connected" && balance !== null
                  ? `${balance} ${TOKEN.symbol}`
                  : `— ${TOKEN.symbol}`}
                {status === "connected" && (
                  <button
                    type="button"
                    onClick={wallet.refreshBalance}
                    title="Refresh balance"
                    className="brutal-border bg-cream brutal-hover rounded-lg p-2 shadow-brutal-sm"
                  >
                    <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {status === "connected" && address && (
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 underline decoration-2 underline-offset-2"
                >
                  {shortAddress(address)}
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
                </a>
              )}
              {status !== "connected" && (
                <div className="mt-1 text-sm font-medium text-zinc-700">
                  Connect MetaMask on Sepolia to read your balance from the contract.
                </div>
              )}
            </div>

            {/* Action button depends on state */}
            <ActionButton wallet={wallet} />
          </div>

          {/* Error / wrong-network / no-wallet messages */}
          {error && (
            <div className="brutal-border mt-6 flex items-start gap-3 rounded-xl bg-cream p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
              <div className="text-sm font-semibold">
                {error}
                {status === "no-wallet" && (
                  <>
                    {" "}
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-2 underline-offset-2"
                    >
                      Install MetaMask
                    </a>
                    .
                  </>
                )}
              </div>
            </div>
          )}

          {/* Note: the contract being read is the same one shown below. */}
          <p className="mt-4 text-xs font-medium text-zinc-600">
            Reading the balance is a real on-chain call to{" "}
            <code className="font-mono">{shortAddress(CONTRACT_ADDRESS)}</code>. The
            earned reward above is simulated and separate from this number.
          </p>
        </div>
      </div>
    </section>
  );
}

/** The right-hand action button: Connect, Connecting…, or Switch to Sepolia. */
function ActionButton({ wallet }: { wallet: UseWalletReturn }) {
  const { status } = wallet;

  if (status === "wrong-network") {
    return (
      <button
        type="button"
        onClick={wallet.switchToSepolia}
        className="brutal-border bg-yellow brutal-hover inline-flex flex-shrink-0 items-center gap-2 rounded-xl px-6 py-3.5 font-bold shadow-brutal"
      >
        Switch to Sepolia
      </button>
    );
  }

  // Once connected, the action becomes Disconnect — the address and balance are
  // shown to the left, so a static "Connected" button would be a dead control.
  if (status === "connected") {
    return (
      <button
        type="button"
        onClick={wallet.disconnect}
        className="brutal-border bg-cream brutal-hover inline-flex flex-shrink-0 items-center gap-2 rounded-xl px-6 py-3.5 font-bold shadow-brutal"
      >
        <LogOut className="h-5 w-5" strokeWidth={2} />
        Disconnect
      </button>
    );
  }

  const busy = status === "connecting" || status === "restoring";

  return (
    <button
      type="button"
      onClick={wallet.connect}
      disabled={busy}
      className="brutal-border bg-ink brutal-hover inline-flex flex-shrink-0 items-center gap-2 rounded-xl px-6 py-3.5 font-bold text-white shadow-brutal disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
      ) : (
        <Wallet className="h-5 w-5" strokeWidth={2} />
      )}
      {status === "restoring"
        ? "Loading…"
        : status === "connecting"
          ? "Connecting..."
          : "Connect Wallet"}
    </button>
  );
}
