// ============================================================================
// Wallet helpers (ethers v6). These read data from MetaMask and the contract.
//
// Honesty boundary: reading the on-chain balance via balanceOf is REAL. Nothing
// here sends a transaction or moves tokens — the demo never writes to the chain.
// ============================================================================

import {
  BrowserProvider,
  Contract,
  formatUnits,
  isAddress,
  parseUnits,
} from "ethers";
import {
  CONTRACT_ADDRESS,
  ERC20_ABI,
  FAUCET_ABI,
  FAUCET_ADDRESS,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_CHAIN_ID_HEX,
  TOKEN,
} from "../config";

// The shape MetaMask injects at window.ethereum (EIP-1193). The request()
// signature matches ethers' Eip1193Provider so we can pass it straight to
// BrowserProvider without casting.
type EthereumProvider = {
  request: (args: {
    method: string;
    params?: Array<unknown> | Record<string, unknown>;
  }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

// Is a wallet (MetaMask) available in this browser?
export function hasWallet(): boolean {
  return typeof window !== "undefined" && window.ethereum != null;
}

// Connect: prompts MetaMask (eth_requestAccounts) and returns the account and
// the current chain id (a bigint in ethers v6).
export async function connectWallet(): Promise<{ address: string; chainId: bigint }> {
  if (!hasWallet()) throw new Error("NO_WALLET");
  const provider = new BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner(); // triggers the connection prompt
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  return { address, chainId: network.chainId };
}

// Return the already-authorized account WITHOUT prompting (eth_accounts), or
// null if the site is not connected yet.
export async function getConnectedAccount(): Promise<string | null> {
  if (!hasWallet()) return null;
  const provider = new BrowserProvider(window.ethereum!);
  const accounts = (await provider.send("eth_accounts", [])) as string[];
  return accounts.length > 0 ? accounts[0] : null;
}

// Current chain id (bigint).
export async function getChainId(): Promise<bigint> {
  const provider = new BrowserProvider(window.ethereum!);
  const network = await provider.getNetwork();
  return network.chainId;
}

// Read the real on-chain ZYD balance for an address and format it with the
// token's 18 decimals into a human-readable string.
export async function readBalance(address: string): Promise<string> {
  const provider = new BrowserProvider(window.ethereum!);
  const contract = new Contract(CONTRACT_ADDRESS, ERC20_ABI, provider);
  const raw: bigint = await contract.balanceOf(address);
  return formatUnits(raw, TOKEN.decimals);
}

// Is the given string a valid Ethereum address? (checksum-aware via ethers.)
export function isValidAddress(address: string): boolean {
  return isAddress(address);
}

// Send ZYD with a REAL on-chain ERC-20 transfer.
//   - uses the connected signer (so MetaMask prompts the user to confirm)
//   - converts the human amount to base units with the token's 18 decimals
//   - waits for one confirmation, then returns the transaction hash
// Throws on rejection / failure so the caller can show an error.
export async function sendTokens(to: string, amount: string): Promise<string> {
  if (!hasWallet()) throw new Error("NO_WALLET");
  const provider = new BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, ERC20_ABI, signer);

  // "1.5" ZYD -> 1500000000000000000 (1.5 * 10^18). parseUnits throws on a
  // malformed amount, which the caller treats as a validation/send error.
  const parsedAmount = parseUnits(amount, TOKEN.decimals);

  const tx = await contract.transfer(to, parsedAmount); // MetaMask confirm prompt
  await tx.wait(); // wait for one confirmation on Sepolia
  return tx.hash;
}

// Submit a signed claim to the faucet to release real ZYD. The signer (the
// connected wallet) pays gas. The argument order matches the contract exactly:
// (recipient, amount, nonce, deadline, signature). amount/nonce/deadline arrive
// as strings from the backend; ethers coerces them to uint256. Returns the tx
// hash after one confirmation.
export async function claimFromFaucet(params: {
  recipient: string;
  amount: string;
  nonce: string;
  deadline: string;
  signature: string;
}): Promise<string> {
  if (!hasWallet()) throw new Error("NO_WALLET");
  const provider = new BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();
  const faucet = new Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);

  const tx = await faucet.claim(
    params.recipient,
    params.amount,
    params.nonce,
    params.deadline,
    params.signature,
  );
  await tx.wait(); // wait for one confirmation on Sepolia
  return tx.hash;
}

// Ask MetaMask to switch to Sepolia. If Sepolia is not present in the wallet
// (error 4902), add it first, which also selects it.
export async function switchToSepolia(): Promise<void> {
  if (!hasWallet()) throw new Error("NO_WALLET");
  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }], // "0xaa36a7"
    });
  } catch (err) {
    if ((err as { code?: number })?.code === 4902) {
      await window.ethereum!.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia test network",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

// True if the given chain id is Sepolia.
export function isSepolia(chainId: bigint | null): boolean {
  return chainId === SEPOLIA_CHAIN_ID;
}

// Shorten an address for display, e.g. 0x4B16…89E6.
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// ============================================================================
// Mobile / MetaMask hand-off helpers. On a phone with no injected wallet, the
// best UX is to hand off to the MetaMask app rather than say "install it".
// ============================================================================

const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

// Is this a mobile/touch device? Used to decide whether to deep-link to the
// MetaMask app when window.ethereum is absent.
export function isMobileUA(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  if (MOBILE_UA_RE.test(ua)) return true;
  // iPadOS 13+ reports a desktop UA but is a touch device — check coarse
  // pointer + touch as a fallback.
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const touch =
    "ontouchstart" in window || (window.navigator.maxTouchPoints ?? 0) > 1;
  return coarse && touch;
}

// Build a MetaMask universal link that opens this dApp inside the MetaMask
// mobile app's in-app browser (where window.ethereum IS injected). If MetaMask
// isn't installed, the link resolves to the App Store / Play Store.
// Format per MetaMask docs: https://metamask.app.link/dapp/<host><path>
export function buildMetaMaskDeepLink(): string {
  if (typeof window === "undefined") return "https://metamask.app.link/";
  const { host, pathname, search, hash } = window.location;
  const safePath = pathname === "/" ? "" : pathname; // avoid a double slash
  return `https://metamask.app.link/dapp/${host}${safePath}${search}${hash}`;
}
