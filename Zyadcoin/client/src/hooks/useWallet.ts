// ============================================================================
// useWallet: owns the MetaMask connection state and the on-chain balance read.
//   - connect()          prompts MetaMask, auto-switches to Sepolia, reads balance
//                         (on mobile with no wallet, hands off to the MetaMask app)
//   - disconnect()        clears the local session and blocks silent reconnect
//   - switchToSepolia()   switches the wallet to the Sepolia network
//   - listens for account/network changes from MetaMask
//   - restores an already-connected wallet on load (no prompt, unless disconnected)
// Handles the three required cases: no wallet, wrong network, user rejection.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildMetaMaskDeepLink,
  connectWallet,
  getChainId,
  getConnectedAccount,
  hasWallet,
  isMobileUA,
  isSepolia,
  readBalance,
  switchToSepolia as switchChain,
} from "../lib/wallet";

export type WalletStatus =
  | "idle"
  | "restoring" // checking for an already-authorized account on load
  | "connecting"
  | "connected"
  | "wrong-network"
  | "no-wallet";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  chainId: bigint | null;
  balance: string | null; // formatted ZYD balance, e.g. "12.5"
  error: string | null;
}

const INITIAL: WalletState = {
  status: "idle",
  address: null,
  chainId: null,
  balance: null,
  error: null,
};

// A dApp can't make MetaMask revoke access, but we can remember that the user
// chose Disconnect and skip the silent reconnect until they connect again.
const DISCONNECT_FLAG_KEY = "zyd-wallet-disconnected-v1";

function isManuallyDisconnected(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISCONNECT_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

function setManuallyDisconnected(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(DISCONNECT_FLAG_KEY, "true");
    else window.localStorage.removeItem(DISCONNECT_FLAG_KEY);
  } catch {
    /* ignore storage quota errors */
  }
}

export function useWallet() {
  // If MetaMask is already injected we immediately try a silent restore, so
  // start in "restoring" (a loading state) rather than "idle" — otherwise the
  // UI flashes "Connect Wallet" on every load before the restore resolves.
  // Skip the restore (start idle) if the user explicitly disconnected last time.
  const [state, setState] = useState<WalletState>(() => ({
    ...INITIAL,
    status: hasWallet() && !isManuallyDisconnected() ? "restoring" : "idle",
  }));
  // Guards against firing a second connect prompt while one is already open.
  const connecting = useRef(false);

  // Read network + balance for an address and set the resulting state. Used by
  // connect(), the silent restore, and the MetaMask change listeners.
  const loadFor = useCallback(async (address: string) => {
    const chainId = await getChainId();
    if (!isSepolia(chainId)) {
      setState({
        status: "wrong-network",
        address,
        chainId,
        balance: null,
        error: "Wrong network. Switch to Sepolia to see your ZYD balance.",
      });
      return;
    }
    // Mark connected immediately (address + network are confirmed); let the
    // balance fill in after the read. Gating "connected" on balanceOf would
    // keep the UI looking disconnected during a slow Sepolia RPC round-trip.
    setState({ status: "connected", address, chainId, balance: null, error: null });
    try {
      const balance = await readBalance(address);
      // Drop a stale read if the account changed while it was in flight.
      setState((s) =>
        s.status === "connected" && s.address === address
          ? { ...s, balance }
          : s,
      );
    } catch {
      /* leave balance as "—"; the manual refresh button can retry */
    }
  }, []);

  // Triggered by the Connect button. Prompts MetaMask, then auto-switches to
  // Sepolia. On a phone with no injected wallet, hands off to the MetaMask app.
  const connect = useCallback(async () => {
    if (!hasWallet()) {
      // No injected provider. On phones this usually means a normal mobile
      // browser (not MetaMask's in-app browser), so hand off to the MetaMask
      // app — it opens this dApp in-app, or routes to the app store.
      if (isMobileUA()) {
        window.location.href = buildMetaMaskDeepLink();
        return;
      }
      setState({
        ...INITIAL,
        status: "no-wallet",
        error: "MetaMask not found. Install it to connect your wallet.",
      });
      return;
    }
    // Avoid a duplicate prompt while one is already open (MetaMask throws
    // -32002 otherwise). Both the nav and the panel call connect().
    if (connecting.current) return;
    connecting.current = true;
    setState((s) => ({ ...s, status: "connecting", error: null }));
    try {
      const { address, chainId } = await connectWallet(); // prompts MetaMask
      setManuallyDisconnected(false); // a fresh connect clears the disconnect flag
      // Auto-switch to Sepolia so the user doesn't need a second click. If they
      // reject, loadFor settles into the wrong-network state (which still shows
      // the manual "Switch to Sepolia" button).
      if (!isSepolia(chainId)) {
        try {
          await switchChain();
        } catch {
          /* rejected/failed — loadFor handles the wrong-network fallback below */
        }
      }
      await loadFor(address); // shared chain-check + connected + async balance
    } catch (err) {
      // 4001 = user rejected the request; -32002 = a request is already pending.
      const code = (err as { code?: number })?.code;
      setState({
        ...INITIAL,
        status: "idle",
        error:
          code === 4001
            ? "Connection request was rejected."
            : code === -32002
              ? "A MetaMask request is already open — check the extension."
              : "Could not connect to your wallet. Please try again.",
      });
    } finally {
      connecting.current = false;
    }
  }, [loadFor]);

  // Triggered by the "Switch to Sepolia" button when on the wrong network.
  const switchToSepolia = useCallback(async () => {
    try {
      await switchChain();
      // The chainChanged listener below refreshes state after the switch.
    } catch (err) {
      const code = (err as { code?: number })?.code;
      setState((s) => ({
        ...s,
        error:
          code === 4001
            ? "Network switch was rejected."
            : "Could not switch network. Please switch to Sepolia in MetaMask.",
      }));
    }
  }, []);

  // Explicit Disconnect. MetaMask has no dApp-callable "revoke", so we clear
  // our local session and set a flag so we won't silently reconnect on the next
  // load until the user clicks Connect again.
  const disconnect = useCallback(() => {
    setManuallyDisconnected(true);
    connecting.current = false;
    setState({ ...INITIAL, status: "idle" });
  }, []);

  // Re-read the balance for the current account (manual refresh button).
  const refreshBalance = useCallback(async () => {
    if (!state.address) return;
    try {
      const balance = await readBalance(state.address);
      setState((s) => ({ ...s, balance }));
    } catch {
      /* ignore transient read errors */
    }
  }, [state.address]);

  // On mount: silently restore an already-connected wallet (unless the user
  // explicitly disconnected), and subscribe to MetaMask account/network changes.
  useEffect(() => {
    if (!hasWallet()) return;

    let active = true;

    if (!isManuallyDisconnected()) {
      void (async () => {
        const account = await getConnectedAccount();
        if (!active) return;
        if (account) {
          await loadFor(account);
        } else {
          // No prior authorization — settle from "restoring" to "Connect Wallet".
          setState((s) => (s.status === "restoring" ? { ...s, status: "idle" } : s));
        }
      })();
    }

    const onAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setState({ ...INITIAL, status: "idle" }); // all accounts disconnected
      } else {
        // The user actively picked an account — treat it as a (re)connection.
        setManuallyDisconnected(false);
        void loadFor(accounts[0]);
      }
    };
    const onChainChanged = () => {
      // Network changed; re-read for the current account — but honor an explicit
      // disconnect (don't silently reconnect just because the chain flipped).
      if (isManuallyDisconnected()) return;
      void getConnectedAccount().then((acc) => {
        if (acc) void loadFor(acc);
      });
    };

    window.ethereum?.on?.("accountsChanged", onAccountsChanged);
    window.ethereum?.on?.("chainChanged", onChainChanged);

    return () => {
      active = false;
      window.ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", onChainChanged);
    };
  }, [loadFor]);

  return {
    ...state,
    connect,
    disconnect,
    switchToSepolia,
    refreshBalance,
    walletAvailable: hasWallet(),
  };
}

export type UseWalletReturn = ReturnType<typeof useWallet>;
