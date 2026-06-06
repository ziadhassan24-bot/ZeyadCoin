import { useState } from "react";
import { parseUnits } from "ethers";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  History,
  Loader2,
  Send,
} from "lucide-react";
import { SEPOLIA_CHAIN_ID, TOKEN } from "../config";
import { isValidAddress, shortAddress } from "../lib/wallet";
import { useTransfers } from "../hooks/useTransfers";
import type { UseWalletReturn } from "../hooks/useWallet";

// Base URL for a transaction on the Sepolia block explorer.
const TX_BASE = "https://sepolia.etherscan.io/tx/";

/**
 * "Send ZYD": a real ERC-20 transfer on Sepolia using the connected signer.
 * The on-chain transfer is real; the note/memo is stored only in the browser.
 *
 * This section is only rendered when a wallet is connected (see App.tsx). It
 * still guards against the wrong network and validates inputs before sending.
 */
interface SendZydProps {
  wallet: UseWalletReturn;
}

export default function SendZyd({ wallet }: SendZydProps) {
  const { transfers, status, error, lastHash, send, clearStatus } = useTransfers();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const onSepolia = wallet.chainId === SEPOLIA_CHAIN_ID;
  const sending = status === "sending";

  async function handleSend() {
    setFormError(null);
    clearStatus();

    // Must be on Sepolia (chainId 11155111n).
    if (!onSepolia) {
      setFormError("Wrong network. Switch to Sepolia to send ZYD.");
      return;
    }
    // Valid recipient address — do NOT send and do NOT reset the form if invalid.
    const to = recipient.trim();
    if (!isValidAddress(to)) {
      setFormError("Enter a valid recipient address (0x…).");
      return;
    }
    // Amount must be a number greater than 0.
    const amt = amount.trim();
    const amtNum = Number(amt);
    if (!amt || !Number.isFinite(amtNum) || amtNum <= 0) {
      setFormError("Enter an amount greater than 0.");
      return;
    }
    // Convert to base units (18 decimals). parseUnits throws on a bad amount.
    let parsed: bigint;
    try {
      parsed = parseUnits(amt, TOKEN.decimals);
    } catch {
      setFormError("Invalid amount (too many decimals?).");
      return;
    }
    // Must not exceed the current balance.
    if (wallet.balance != null) {
      let bal: bigint;
      try {
        bal = parseUnits(wallet.balance, TOKEN.decimals);
      } catch {
        bal = 0n;
      }
      if (parsed > bal) {
        setFormError(`Amount exceeds your balance (${wallet.balance} ${TOKEN.symbol}).`);
        return;
      }
    }

    // Validation passed -> perform the real transfer (MetaMask will prompt).
    const ok = await send(to, amt, note.trim(), wallet.address ?? "");
    if (ok) {
      await wallet.refreshBalance(); // update the displayed balance
      setRecipient("");
      setAmount("");
      setNote("");
    }
    // On failure we keep the form values so the user can retry.
  }

  return (
    <section id="send" className="px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center gap-2">
          <Send className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            Step 3 · Send tokens
          </span>
        </div>
        <h2 className="font-display mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          Send {TOKEN.symbol}
        </h2>

        {/* Honest note about the on-chain transfer vs the local memo. */}
        <div className="brutal-border bg-yellow mb-8 flex items-start gap-3 rounded-xl p-4 shadow-brutal-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
          <p className="text-sm font-semibold leading-relaxed">
            The transfer is real on-chain. The memo is stored only in your browser —
            the ERC-20 standard does not carry text on-chain, so Etherscan shows only
            sender, recipient, and amount.
          </p>
        </div>

        {!onSepolia ? (
          // Wrong network: prompt to switch instead of showing the form.
          <div className="brutal-border bg-pink rounded-2xl p-6 shadow-brutal">
            <p className="mb-4 font-semibold">
              You are on the wrong network. Switch to Sepolia to send {TOKEN.symbol}.
            </p>
            <button
              type="button"
              onClick={wallet.switchToSepolia}
              className="brutal-border bg-ink brutal-hover rounded-xl px-6 py-3 font-bold text-white shadow-brutal"
            >
              Switch to Sepolia
            </button>
          </div>
        ) : (
          // The send form.
          <div className="brutal-border bg-cream rounded-2xl p-6 shadow-brutal md:p-8">
            <div className="grid gap-5">
              <Field label="Recipient address">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x… (any Sepolia address)"
                  className="brutal-border w-full rounded-lg bg-white p-3 font-mono text-sm focus:outline-none"
                />
              </Field>

              <Field label={`Amount (${TOKEN.symbol})`}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1.5"
                  className="brutal-border w-full rounded-lg bg-white p-3 font-mono text-sm focus:outline-none"
                />
                {wallet.balance != null && (
                  <span className="mt-1 block text-xs font-semibold text-zinc-500">
                    Your balance: {wallet.balance} {TOKEN.symbol}
                  </span>
                )}
              </Field>

              <Field label="Note for yourself (optional)">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Saved in your browser only — not sent on-chain"
                  className="brutal-border w-full rounded-lg bg-white p-3 text-sm focus:outline-none"
                />
              </Field>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="brutal-border bg-ink brutal-hover inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 font-bold text-white shadow-brutal disabled:cursor-wait disabled:opacity-70"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                ) : (
                  <Send className="h-5 w-5" strokeWidth={2} />
                )}
                {sending ? "Sending… confirm in MetaMask" : `Send ${TOKEN.symbol}`}
              </button>

              {/* Validation error (form kept, nothing sent). */}
              {formError && (
                <div className="brutal-border bg-pink flex items-center gap-3 rounded-xl p-3 text-sm font-semibold">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                  {formError}
                </div>
              )}

              {/* On-chain / send error (e.g. user rejected, insufficient gas). */}
              {status === "error" && error && (
                <div className="brutal-border bg-pink flex items-center gap-3 rounded-xl p-3 text-sm font-semibold">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                  {error}
                </div>
              )}

              {/* Success + Etherscan link. */}
              {status === "success" && lastHash && (
                <div className="brutal-border bg-green flex flex-col gap-2 rounded-xl p-4 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                    Sent! Confirmed on Sepolia.
                  </span>
                  <a
                    href={`${TX_BASE}${lastHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline decoration-2 underline-offset-2"
                  >
                    View transaction
                    <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent transfers feed (local history). */}
        <RecentTransfers transfers={transfers} />
      </div>
    </section>
  );
}

/** A labelled form field wrapper. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-zinc-600">
        {label}
      </span>
      {children}
    </label>
  );
}

/** The "Recent transfers" list, read from localStorage via the hook. */
function RecentTransfers({
  transfers,
}: {
  transfers: { hash: string; from: string; to: string; amount: string; note: string; timestamp: number }[];
}) {
  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-5 w-5" strokeWidth={2.5} />
        <h3 className="font-display text-2xl font-bold">Recent transfers</h3>
      </div>

      {transfers.length === 0 ? (
        <p className="text-sm font-semibold text-zinc-500">
          No transfers yet. Send some {TOKEN.symbol} above to see it here.
        </p>
      ) : (
        <ul className="space-y-3">
          {transfers.map((t) => (
            <li
              key={t.hash}
              className="brutal-border flex flex-col gap-2 rounded-xl bg-white p-4 shadow-brutal-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-mono text-sm font-semibold">
                  <span>{shortAddress(t.from)}</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  <span>{shortAddress(t.to)}</span>
                  <span className="brutal-border bg-green rounded px-2 py-0.5 text-xs">
                    {t.amount} {TOKEN.symbol}
                  </span>
                </div>
                {t.note && (
                  <div className="mt-1 truncate text-sm italic text-zinc-600">
                    “{t.note}”
                  </div>
                )}
                <div className="mt-0.5 text-xs font-semibold text-zinc-400">
                  {timeAgo(t.timestamp)}
                </div>
              </div>
              <a
                href={`${TX_BASE}${t.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-2"
              >
                Etherscan
                <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Compact "time ago" label from a millisecond timestamp. */
function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
