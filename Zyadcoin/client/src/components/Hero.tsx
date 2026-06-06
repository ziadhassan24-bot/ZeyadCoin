import { ArrowRight, Code2, Coins, Sparkles } from "lucide-react";

/**
 * Hero section: the headline, a one-line explanation, and a primary CTA that
 * scrolls down to the task-earning area. Right side shows a small "coin" card
 * for visual flavor (purely decorative).
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-12 pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* Left: copy */}
        <div className="max-w-xl">
          <div className="brutal-border bg-pink rotate-left mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 shadow-brutal-sm">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-wide">
              ERC-20 token · Sepolia testnet
            </span>
          </div>

          <h1 className="font-display mb-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Earn{" "}
            <span className="relative inline-block px-2">
              <span className="brutal-border bg-yellow absolute inset-0 -z-10 -rotate-2 rounded-lg shadow-brutal-sm"></span>
              Zeyad Coin
            </span>{" "}
            by solving 3 coding tasks.
          </h1>

          <p className="mb-9 text-lg font-medium leading-relaxed text-zinc-700">
            Get three beginner coding tasks, finish them, and earn{" "}
            <span className="font-bold">3 ZYD</span>. Then connect MetaMask to see
            your real on-chain balance of my token.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href="#earn"
              className="brutal-border bg-ink brutal-hover inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 font-bold text-white shadow-brutal"
            >
              <Code2 className="h-5 w-5" strokeWidth={2} />
              Start earning
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </a>
            <a
              href="#contract"
              className="brutal-border bg-cream brutal-hover inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 font-bold shadow-brutal"
            >
              View the contract
            </a>
          </div>
        </div>

        {/* Right: decorative coin card */}
        <div className="relative hidden h-[360px] items-center justify-center lg:flex">
          <div className="brutal-border bg-blue rotate-right w-72 rounded-2xl p-6 shadow-brutal-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Your reward</span>
              <div className="brutal-border bg-green flex h-12 w-12 items-center justify-center rounded-full">
                <Coins className="h-6 w-6" strokeWidth={2} />
              </div>
            </div>
            <div className="font-display text-5xl font-bold tracking-tight">
              3 ZYD
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-700">
              after 3 finished tasks
            </div>
            <div className="brutal-border mt-5 rounded-lg bg-cream p-3 text-xs font-semibold">
              Simulated in your browser — see the honesty note below.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
