// ============================================================================
// On-chain constants for the Zeyad Coin (ZYD) demo, all in one place so they
// are easy to find and explain.
// ============================================================================

// The deployed ERC-20 contract address on the Sepolia testnet.
export const CONTRACT_ADDRESS = "0x4B1670D26Ce613BB8516FAD8BF0D4ACD234089E6";

// Sepolia's chain id, in the two forms different tools expect:
//  - ethers returns the chain id as a bigint, so we compare against 11155111n.
//  - MetaMask's wallet_switchEthereumChain wants the hex string "0xaa36a7".
export const SEPOLIA_CHAIN_ID = 11155111n;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

// Token metadata. The contract uses 18 decimals (the ERC-20 default).
export const TOKEN = {
  name: "Zeyad Coin",
  symbol: "ZYD",
  decimals: 18,
} as const;

// The programming languages the user can pick for their 3 coding tasks. The
// backend validates against the same list and defaults to the first one.
export const LANGUAGES = ["JavaScript", "Python", "Java", "C++"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "JavaScript";

// Direct link to the token on the Sepolia block explorer.
export const ETHERSCAN_URL = `https://sepolia.etherscan.io/token/${CONTRACT_ADDRESS}`;

// Minimal ERC-20 ABI in ethers' human-readable format: the read-only functions
// used to show a balance, plus transfer() for sending tokens.
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
] as const;

// The ZydFaucet: releases real ZYD when given a valid EIP-712 signature from the
// trusted signer. The backend produces that signature after grading the quiz.
export const FAUCET_ADDRESS = "0x55B7B0dAA9424bfd1328135cffCa244D1bE8C748";

// Faucet ABI. The claim() argument order MUST match the contract exactly:
// (amount, nonce, deadline, signature).
export const FAUCET_ABI = [
  "function claim(uint256 amount, uint256 nonce, uint256 deadline, bytes signature)",
] as const;
