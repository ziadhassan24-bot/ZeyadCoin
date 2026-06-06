// ============================================================================
// EIP-712 claim signer.
//
// The ZydFaucet contract releases ZYD only when given a signature from its
// trusted signer over a typed-data "Claim". This module builds that signature
// on the backend using SIGNER_PRIVATE_KEY (server/.env only). The private key
// never leaves the server, and the browser only ever receives the signature.
//
// The domain and the Claim type MUST match the contract exactly, or the
// contract's recover() returns a different address and rejects the claim.
// ============================================================================

import { Wallet, verifyTypedData } from "ethers";

// --- Constants that must match the deployed ZydFaucet exactly --------------

const FAUCET_ADDRESS = "0x55B7B0dAA9424bfd1328135cffCa244D1bE8C748";

// The wallet whose signature the contract trusts. The configured
// SIGNER_PRIVATE_KEY must be the private key for THIS address.
const TRUSTED_SIGNER = "0x12d46659425ABF0554C59baad37Aa21c436493AD";

// EIP-712 domain. name "ZydFaucet", version "1", Sepolia chainId, faucet address.
export const CLAIM_DOMAIN = {
  name: "ZydFaucet",
  version: "1",
  chainId: 11155111,
  verifyingContract: FAUCET_ADDRESS,
};

// EIP-712 types. The primary type name ("Claim") and the field names/order
// (recipient, amount, nonce, deadline) match the contract's type hash exactly:
//   keccak256("Claim(address recipient,uint256 amount,uint256 nonce,uint256 deadline)")
// The first field MUST be named "recipient" (not "user") — the field name is
// part of the type hash, so the wrong name makes the contract recover the wrong
// address and reject the claim.
export const CLAIM_TYPES = {
  Claim: [
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

export interface ClaimValue {
  recipient: string;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
}

// --- Build the signer wallet from the private key --------------------------

let wallet: Wallet | null = null;

const privateKey = process.env.SIGNER_PRIVATE_KEY;
if (!privateKey) {
  console.warn(
    "SIGNER_PRIVATE_KEY is not set — /api/claim cannot sign claims until it is.",
  );
} else {
  try {
    wallet = new Wallet(privateKey);
    if (wallet.address.toLowerCase() !== TRUSTED_SIGNER.toLowerCase()) {
      // The key is valid but is NOT the trusted signer, so the contract will
      // reject every claim. Make this impossible to miss in the logs.
      console.warn(
        `WARNING: SIGNER_PRIVATE_KEY belongs to ${wallet.address}, not the ` +
          `trusted signer ${TRUSTED_SIGNER}. The faucet will reject every claim. ` +
          `Set SIGNER_PRIVATE_KEY to the trusted signer's private key.`,
      );
    } else {
      console.log(`Claim signer ready: ${wallet.address} (trusted signer).`);
    }
  } catch (err) {
    console.error("SIGNER_PRIVATE_KEY is invalid; cannot sign claims:", err);
    wallet = null;
  }
}

// Is a usable signing wallet configured?
export function canSign(): boolean {
  return wallet !== null;
}

// The configured signer's address (or null if not configured).
export function signerAddress(): string | null {
  return wallet?.address ?? null;
}

// Sign a Claim with EIP-712 typed data (ethers v6 signTypedData — NOT the v5
// _signTypedData). Returns the 65-byte signature as a 0x-prefixed hex string.
export async function signClaim(value: ClaimValue): Promise<string> {
  if (!wallet) throw new Error("SIGNER_PRIVATE_KEY not configured");
  return wallet.signTypedData(CLAIM_DOMAIN, CLAIM_TYPES, value);
}

// Recover the address that signed a Claim (used by tests/sanity checks).
export function recoverClaimSigner(value: ClaimValue, signature: string): string {
  return verifyTypedData(CLAIM_DOMAIN, CLAIM_TYPES, value, signature);
}
