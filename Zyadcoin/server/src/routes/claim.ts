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

  // Consume the session now: one graded attempt per session (prevents
  // brute-forcing the answers against the same set of questions).
  deleteSession(sessionId);

  // --- Grade: count how many answers are correct ---
  const correctCount = session.questions.filter(
    (q, i) => answers[i] === q.correctIndex,
  ).length;

  const allCorrect = correctCount === 3;
  
  if (correctCount === 0) {
    // No correct answers - show review but no reward
    const review = session.questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      yourIndex: answers[i],
    }));
    res.json({
      success: false,
      message: "No correct answers. Get a new set of questions and try again.",
      review,
    });
    return;
  }

  // At least 1 correct - give partial credit via gasless transfer
  if (!allCorrect) {
    const review = session.questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      yourIndex: answers[i],
    }));

    // Send partial credit via gasless transfer immediately
    const partialAmount = BigInt(correctCount) * 10n ** 18n; // 1 ZYD per correct answer
    
    const privateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      res.json({
        success: false,
        message: `You got ${correctCount}/3 correct, but gasless transfer is not configured.`,
        review,
      });
      return;
    }

    try {
      const provider = new JsonRpcProvider(SEPOLIA_RPC);
      const wallet = new Wallet(privateKey, provider);
      const token = new Contract(
        ZYD_TOKEN_ADDRESS,
        ["function transfer(address to, uint256 amount) returns (bool)"],
        wallet
      );

      console.log(`Partial credit: sending ${correctCount} ZYD to ${user}`);
      const tx = await token.transfer(user, partialAmount);
      await tx.wait();

      res.json({
        success: true,
        partialCredit: true,
        correctCount,
        amount: partialAmount.toString(),
        txHash: tx.hash,
        message: `You got ${correctCount}/3 correct. ${correctCount} ZYD sent directly to your wallet!`,
        review,
      });
    } catch (err) {
      console.error("Partial credit transfer failed:", err);
      res.json({
        success: false,
        message: `You got ${correctCount}/3 correct, but we couldn't send the ZYD. Please try again.`,
        review,
      });
    }
    return;
  }

  // --- All correct: send full reward via gasless ---
  if (!canSign()) {
    res
      .status(500)
      .json({ success: false, message: "Server signer is not configured." });
    return;
  }

  try {
    const privateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      res.status(500).json({ success: false, message: "Gasless transfer not configured." });
      return;
    }

    const provider = new JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new Wallet(privateKey, provider);
    const token = new Contract(
      ZYD_TOKEN_ADDRESS,
      ["function transfer(address to, uint256 amount) returns (bool)"],
      wallet
    );

    console.log(`Full credit: sending 3 ZYD to ${user}`);
    const tx = await token.transfer(user, REWARD_AMOUNT);
    await tx.wait();

    res.json({
      success: true,
      amount: REWARD_AMOUNT.toString(),
      txHash: tx.hash,
      message: "Perfect score! 3 ZYD sent directly to your wallet!",
    });
  } catch (err) {
    console.error("Full credit transfer failed:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send ZYD. Please try again." 
    });
  }
});
