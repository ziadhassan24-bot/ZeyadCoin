import { Coins } from "lucide-react";
import { TOKEN } from "../config";

/** Page footer with a short class-project note. */
export default function Footer() {
  return (
    <footer className="border-t-2 border-black bg-cream px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="brutal-border bg-green flex h-8 w-8 items-center justify-center rounded-lg">
            <Coins className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="font-display font-bold">
            {TOKEN.name} ({TOKEN.symbol})
          </span>
        </div>
        <p className="text-sm font-medium text-zinc-500">
          University blockchain class demo · ERC-20 on Sepolia testnet
        </p>
      </div>
    </footer>
  );
}
