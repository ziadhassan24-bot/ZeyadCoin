// ============================================================================
// POST /api/claim — verify quiz answers server-side and, if all correct, sign
// an EIP-712 claim that authorizes the ZydFaucet to release 3 ZYD.
//
// Body: { sessionId: string, answers: number[3], userAddress: string }
//
// Grading happens HERE (the browser is not trusted). Only an all-correct quiz
// produces a signature. The session is consumed on the first graded request so
// the 4^3 = 64 answer combinations cannot be brute-forced against one session.
// ============================================================================

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Contract, JsonRpcProvider, getAddress, randomBytes, toBigInt, Wallet } from "ethers";
import { deleteSession, getSession } from "../sessionStore.js";
import { canSign, signClaim } from "../signer.js";
import { hasClaimed, markClaimed } from "../claimTracker.js";

export const claimRouter = Router();

// Rate limiter for /api/claim: 10 requests per 10 minutes per IP.
// Prevents brute-forcing the claim endpoint from a single IP while allowing
// honest retries if the first submission had wrong answers.
const claimLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 requests per window per IP
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many claim attempts from this IP. Please try again in 10 minutes.",
  },
});

const REWARD_AMOUNT = 3n * 10n ** 18n; // 3 ZYD in base units (18 decimals)
const DEADLINE_SECONDS = 10 * 60; // signature valid for 10 minutes
const ZYD_TOKEN_ADDRESS = "0x4B1670D26Ce613BB8516FAD8BF0D4ACD234089E6";
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

// A fresh random uint256 nonce so every claim is unique (the contract uses it
// to prevent the same signature being redeemed twice).
function randomNonce(): bigint {
  return toBigInt(randomBytes(32));
}

claimRouter.post("/claim", claimLimiter, async (req, res) => {
  const { sessionId, answers, userAddress } = req.body ?? {};

  // --- Validate the request shape (malformed input -> 400) ---
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    res.status(400).json({ success: false, message: "Missing sessionId." });
    return;
  }
  if (
    !Array.isArray(answers) ||
    answers.length !== 3 ||
    !answers.every((a) => Number.isInteger(a))
  ) {
    res
      .status(400)
      .json({ success: false, message: "answers must be an array of 3 integers." });
    return;
  }
  let user: string;
  try {
    // Validates and checksums the address; throws if it is not an address.
    user = getAddress(typeof userAddress === "string" ? userAddress : "");
  } catch {
    res.status(400).json({ success: false, message: "Invalid userAddress." });
    return;
  }

  // --- Look up the session ---
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({
      success: false,
      message: "Session not found or expired. Get a new set of questions.",
    });
    return;
  }

  // --- Check if this address has already claimed (per-address cap) ---
  // Only addresses that successfully complete the quiz and get a signature
  // count against this cap. Wrong answers do not consume it.
  if (hasClaimed(user)) {
    res.status(403).json({
      success: false,
      message: "This address has already claimed its ZYD.",
    });
    return;
  }

  // Consume the session now: one graded attempt per session (prevents
  // brute-forcing the answers against the same set of questions).
  deleteSession(sessionId);

  // --- Grade: every answer must match the stored correct index ---
  const allCorrect = session.questions.every(
    (q, i) => answers[i] === q.correctIndex,
  );
  if (!allCorrect) {
    // Return the answer key so the UI can show exactly what was right/wrong.
    // This is safe: the session was already consumed above, so these questions
    // can never be graded again — revealing the answers leaks nothing useful.
    const review = session.questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      yourIndex: answers[i],
    }));
    res.json({
      success: false,
      message:
        "Not all answers are correct. No reward — get a new set of questions and try again.",
      review,
    });
    return;
  }

  // --- All correct: build and sign the EIP-712 claim ---
  if (!canSign()) {
    res
      .status(500)
      .json({ success: false, message: "Server signer is not configured." });
    return;
  }

  const amount = REWARD_AMOUNT;
  const nonce = randomNonce();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);

  try {
    // The EIP-712 value uses "recipient" as the key (matches the contract's
    // Claim struct); `user` here is the validated/checksummed user address.
    const signature = await signClaim({ recipient: user, amount, nonce, deadline });
    
    // Mark this address as having claimed ONLY after signature is successfully
    // issued (all answers correct and signing succeeded).
    markClaimed(user);
    
    // BigInts are returned as strings (JSON has no BigInt). The frontend passes
    // these straight into the faucet's claim(...) call.
    res.json({
      success: true,
      amount: amount.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature,
      gaslessAvailable: true, // Signal that gasless transfer is available
    });
  } catch (err) {
    console.error("Failed to sign claim:", err);
    res.status(500).json({ success: false, message: "Failed to sign the claim." });
  }
});

// NEW: POST /api/claim/gasless - Send ZYD directly from backend wallet (no gas required from user)
// This endpoint allows users without Sepolia ETH to still receive their reward.
claimRouter.post("/claim/gasless", claimLimiter, async (req, res) => {
  const { userAddress } = req.body ?? {};

  // Validate address
  let user: string;
  try {
    user = getAddress(typeof userAddress === "string" ? userAddress : "");
  } catch {
    res.status(400).json({ success: false, message: "Invalid userAddress." });
    return;
  }

  // Check if address already claimed
  if (!hasClaimed(user)) {
    res.status(403).json({
      success: false,
      message: "You must complete the quiz first and get a signed claim before using gasless transfer.",
    });
    return;
  }

  // Check if backend wallet has funds
  const privateKey = process.env.SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    res.status(500).json({ success: false, message: "Gasless transfer not configured." });
    return;
  }

  try {
    // Setup provider and wallet
    const provider = new JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new Wallet(privateKey, provider);
    
    // Connect to ZYD token contract
    const token = new Contract(
      ZYD_TOKEN_ADDRESS,
      ["function transfer(address to, uint256 amount) returns (bool)"],
      wallet
    );

    // Send ZYD directly (backend pays gas)
    console.log(`Gasless transfer: sending 3 ZYD to ${user}`);
    const tx = await token.transfer(user, REWARD_AMOUNT);
    await tx.wait();

    res.json({
      success: true,
      txHash: tx.hash,
      amount: REWARD_AMOUNT.toString(),
      message: "ZYD sent directly to your wallet! No gas required.",
    });
  } catch (err) {
    console.error("Gasless transfer failed:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send ZYD. The backend may not have enough Sepolia ETH for gas, or the token balance is insufficient." 
    });
  }
});
