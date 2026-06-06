import { Coins, Loader2, Wallet } from "lucide-react";

/**
 * Sticky top navigation: the Zeyad Coin logo on the left and a Connect Wallet
 * button on the right. The button shows the connected address once a wallet is
 * attached, and a spinner while restoring a session or connecting.
 */
interface NavBarProps {
  onConnect?: () => void;
  walletLabel?: string; // e.g. a short address once connected; falls back to "Connect Wallet"
  busy?: boolean; // restoring or connecting — disable the button and show a spinner
}

export default function NavBar({ onConnect, walletLabel, busy }: NavBarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-black bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        {/* Logo */}
        <a href="#top" className="group flex items-center gap-2">
          <div className="brutal-border bg-green flex h-10 w-10 items-center justify-center rounded-lg shadow-brutal-sm transition-transform group-hover:rotate-6">
            <Coins className="h-6 w-6" strokeWidth={2} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Zeyad&nbsp;Coin
          </span>
          <span className="brutal-border bg-yellow rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider">
            ZYD
          </span>
        </a>

        {/* Connect Wallet */}
        <button
          type="button"
          onClick={onConnect}
          disabled={busy}
          className="brutal-border bg-ink brutal-hover flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-brutal disabled:cursor-wait disabled:opacity-80"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Wallet className="h-4 w-4" strokeWidth={2} />
          )}
          {walletLabel ?? (busy ? "Loading…" : "Connect Wallet")}
        </button>
      </div>
    </nav>
  );
}
