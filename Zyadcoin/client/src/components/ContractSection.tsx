import { useState } from "react";
import { Check, Copy, ExternalLink, FileCode2 } from "lucide-react";
import {
  CONTRACT_ADDRESS,
  ETHERSCAN_URL,
  SEPOLIA_CHAIN_ID,
  TOKEN,
} from "../config";

/**
 * Shows the real, deployed contract: its address (with a copy button), the
 * token metadata, and a link to view it on the Sepolia block explorer.
 * This part is fully real — the token exists on-chain.
 */
export default function ContractSection() {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      // Reset the "copied" label after a short moment.
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (e.g. non-secure context); ignore silently.
    }
  }

  return (
    <section id="contract" className="px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center gap-2">
          <FileCode2 className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            The real token
          </span>
        </div>
        <h2 className="font-display mb-8 text-4xl font-bold tracking-tight md:text-5xl">
          Contract on Sepolia
        </h2>

        <div className="brutal-border bg-pink rounded-2xl p-6 shadow-brutal md:p-8">
          {/* Metadata row */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Meta label="Name" value={TOKEN.name} />
            <Meta label="Symbol" value={TOKEN.symbol} />
            <Meta label="Decimals" value={String(TOKEN.decimals)} />
            <Meta label="Network" value={`Sepolia (${SEPOLIA_CHAIN_ID})`} />
          </div>

          {/* Address + copy */}
          <div className="brutal-border rounded-xl bg-cream p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Contract address
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="break-all font-mono text-sm font-semibold md:text-base">
                {CONTRACT_ADDRESS}
              </code>
              <button
                type="button"
                onClick={copyAddress}
                className="brutal-border bg-yellow brutal-hover inline-flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold shadow-brutal-sm"
              >
                {copied ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={2.5} />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Etherscan link */}
          <a
            href={ETHERSCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-border bg-ink brutal-hover mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-bold text-white shadow-brutal"
          >
            <ExternalLink className="h-5 w-5" strokeWidth={2} />
            View on Sepolia Etherscan
          </a>
        </div>
      </div>
    </section>
  );
}

/** Small labelled metadata cell. */
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="brutal-border rounded-lg bg-cream p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="font-display mt-0.5 truncate font-bold" title={value}>
        {value}
      </div>
    </div>
  );
}
