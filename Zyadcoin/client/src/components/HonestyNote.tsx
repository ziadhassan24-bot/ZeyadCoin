import { ShieldCheck } from "lucide-react";

/**
 * Explains how the reward is earned. The reward is a REAL on-chain transfer:
 * the backend grades the answers and signs a claim, and the faucet releases ZYD
 * only for a valid signature. (No simulated balance anymore.)
 */
export default function HonestyNote() {
  return (
    <div className="brutal-border bg-yellow text-ink rounded-xl shadow-brutal flex items-start gap-3 p-4 md:p-5">
      <div className="brutal-border bg-cream flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <p className="text-sm font-semibold leading-relaxed md:text-base">
        <span className="font-bold uppercase tracking-wide">How the reward works:&nbsp;</span>
        the backend checks your answers, and only if all 3 are correct does it sign
        a claim. The ZydFaucet on Sepolia releases real ZYD only for a valid
        signature from the trusted signer — so your reward is a real on-chain
        transfer, not a simulated number.
      </p>
    </div>
  );
}
