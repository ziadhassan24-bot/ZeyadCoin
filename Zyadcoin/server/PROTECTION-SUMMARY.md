# Faucet Protection Summary

## What Was Added

### 1. **Per-Address Claim Cap**
- **File:** `src/claimTracker.ts` (new)
- **How it works:** Tracks wallet addresses that have successfully claimed in an in-memory Map (normalized to lowercase)
- **When it blocks:** After an address receives ONE successful signature, any future claim attempts from that address return HTTP 403 with: `"This address has already claimed its ZYD."`
- **Important:** Only SUCCESSFUL claims (correct answers + signature issued) count against the cap. Wrong answers do not consume it.

### 2. **Rate Limiting (per IP)**
- **Package:** `express-rate-limit` (installed)
- **Trust Proxy:** Added `app.set("trust proxy", 1)` in `src/index.ts` so rate limiters see real client IPs behind Render/Vercel proxies

#### /api/tasks Rate Limiter
- **Limit:** 20 requests per 10 minutes per IP
- **Purpose:** Stops bots from hammering Groq and burning through the free API quota
- **Response when limited:** HTTP 429 with JSON message

#### /api/claim Rate Limiter  
- **Limit:** 10 requests per 10 minutes per IP
- **Purpose:** Prevents brute-forcing the claim endpoint from a single IP
- **Response when limited:** HTTP 429 with JSON message

### 3. **Trust Proxy Configuration**
- **File:** `src/index.ts`
- **What it does:** Ensures rate limiters read the real client IP from the `X-Forwarded-For` header instead of seeing the proxy's IP (critical for deployed environments like Render)

---

## What This PROTECTS Against

✅ **One address claiming multiple times** (per-address cap)  
✅ **A single IP hammering /api/tasks** (20 req/10min limit)  
✅ **A single IP brute-forcing /api/claim** (10 req/10min limit)  
✅ **Accidental loops or buggy scripts** from honest users

---

## What This Does NOT Protect Against

❌ **Server restarts:** Both the claim tracker and rate limits are **in-memory** and reset when the server restarts (or when Render spins down your free-tier instance due to inactivity). A production system would persist claims in a database.

❌ **Many wallets + many IPs:** A determined attacker with access to multiple wallet addresses AND multiple IP addresses (VPN, botnets, cloud instances) can still claim multiple times by rotating both. Each new (wallet, IP) pair gets a fresh claim.

❌ **Sophisticated attacks:** No CAPTCHA, no proof-of-work, no blockchain-based Sybil resistance. This is demo-level protection suitable for a class project, not a high-value faucet.

❌ **Proxy/VPN abuse:** If a user switches IPs (VPN, mobile hotspot, etc.), the rate limits reset for that new IP.

---

## For Your Class Explanation

**In one sentence:**  
"This in-memory rate limiting and per-address cap stops simple bots and accidental loops, but won't stop a determined attacker with multiple wallets and IPs—and it resets on server restart."

**Key teaching points:**
1. Defense in depth: Even simple protections are better than none
2. In-memory vs persistent state: Trade-offs for a class demo
3. IP-based rate limiting has limits (VPNs, NAT, mobile networks)
4. Production faucets need databases, CAPTCHAs, proof-of-work, or on-chain verification

---

## Files Modified/Created

### Modified:
- `server/src/index.ts` — Added `app.set("trust proxy", 1)`
- `server/src/routes/claim.ts` — Added rate limiter, per-address cap check, and `markClaimed()` call
- `server/src/routes/tasks.ts` — Added rate limiter
- `server/package.json` — Added `express-rate-limit` dependency

### Created:
- `server/src/claimTracker.ts` — In-memory address tracker
- `server/TEST-PROTECTION.md` — Testing instructions
- `server/test-rate-limit.js` — Automated rate limit test script
- `server/PROTECTION-SUMMARY.md` — This file

---

## No Breaking Changes

✅ Groq generation still works (fallback included)  
✅ Server-side grading unchanged  
✅ EIP-712 signing unchanged  
✅ Existing error responses preserved  
✅ All secrets stay in `server/.env`  
✅ Frontend requires no changes
