import { ExternalLink, PartyPopper, RotateCcw } from "lucide-react";
import { TOKEN } from "../config";

const TX_BASE = "https://sepolia.etherscan.io/tx/";

/**
 * Shown after a successful on-chain claim or gasless transfer. The reward is REAL:
 * ZYD was sent to the user's wallet. Links to the transaction on Etherscan
 * and offers another quiz.
 */
interface RewardBannerProps {
  txHash: string;
  amount?: number; // Optional: how many ZYD (defaults to 3)
  message?: string; // Optional custom message
  onAgain: () => void;
}

export default function RewardBanner({ txHash, amount = 3, message, onAgain }: RewardBannerProps) {
  const displayMessage = message || `You earned ${amount} ${TOKEN.symbol}!`;
  
  return (
    <div className="brutal-border bg-green mt-10 rounded-2xl p-6 shadow-brutal-lg md:p-8">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <div className="brutal-border bg-yellow flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
            <PartyPopper className="h-7 w-7" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              {displayMessage}
            </h3>
            <p className="mt-1 text-sm font-semibold text-zinc-800">
              Real {TOKEN.symbol} was sent to your wallet on Sepolia.
            </p>
            <a
              href={`${TX_BASE}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-2"
            >
              View transaction on Etherscan
              <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={onAgain}
          className="brutal-border bg-cream brutal-hover inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 font-bold shadow-brutal-sm"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
          Do another quiz
        </button>
      </div>
    </div>
  );
}
