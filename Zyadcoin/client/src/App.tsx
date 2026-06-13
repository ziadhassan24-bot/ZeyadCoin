import NavBar from "./components/NavBar";
import Hero from "./components/Hero";
import HonestyNote from "./components/HonestyNote";
import EarnTasks from "./components/EarnTasks";
import WalletPanel from "./components/WalletPanel";
import SendZyd from "./components/SendZyd";
import ContractSection from "./components/ContractSection";
import Footer from "./components/Footer";
import SepoliaGasHelper from "./components/SepoliaGasHelper";
import { useWallet } from "./hooks/useWallet";
import { shortAddress } from "./lib/wallet";

/**
 * The single page. Composes every section top to bottom.
 *
 * Wallet state is owned here (one source of truth) and shared with the nav bar
 * and the wallet panel. Task state lives inside <EarnTasks /> via useTasks.
 */
export default function App() {
  const wallet = useWallet();

  // Show the short address in the nav once connected, otherwise the default label.
  const navLabel =
    wallet.status === "connected" && wallet.address
      ? shortAddress(wallet.address)
      : undefined;

  // While restoring a prior session or connecting, show a loading state in the
  // nav instead of "Connect Wallet" (kills the flash on every page load).
  const navBusy = wallet.status === "restoring" || wallet.status === "connecting";

  return (
    <div id="top">
      <NavBar onConnect={wallet.connect} walletLabel={navLabel} busy={navBusy} />
      <Hero />

      {/* Honesty note, kept prominent right under the hero. */}
      <div className="px-5">
        <div className="mx-auto max-w-6xl">
          <HonestyNote />
        </div>
      </div>

      <EarnTasks wallet={wallet} />
      
      {/* Gas helper: show if user is on Sepolia but has no/low ETH */}
      <SepoliaGasHelper wallet={wallet} />
      
      <WalletPanel wallet={wallet} />

      {/* Send ZYD — only shown once a wallet is connected. */}
      {wallet.address && <SendZyd wallet={wallet} />}

      <ContractSection />
      <Footer />
    </div>
  );
}
