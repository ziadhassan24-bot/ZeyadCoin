# CodeCoin Faucet Protection — Complete Changes

## Summary
Added two layers of protection to prevent bots from draining the ZYD faucet:
1. **Per-address claim cap** — one address can only claim once
2. **IP-based rate limiting** — limits requests per IP on both /api/tasks and /api/claim

---

## File Changes

### ✅ New Files Created

#### `server/src/claimTracker.ts`
In-memory Map that tracks which addresses have successfully claimed.
- `markClaimed(address)` — Records a successful claim (called ONLY when signature is issued)
- `hasClaimed(address)` — Checks if address already claimed
- `getClaimCount()` — Returns total claims (for debugging)
- Normalizes addresses to lowercase so case variations don't bypass the cap

#### `server/TEST-PROTECTION.md`
Detailed testing instructions for:
- Per-address claim cap (same address tries to claim twice)
- Rate limiting on /api/tasks (hammer task generation)
- Rate limiting on /api/claim (hammer claim endpoint)

#### `server/test-rate-limit.js`
Automated test script that sends 25 requests to /api/tasks to trigger the rate limiter.

#### `server/PROTECTION-SUMMARY.md`
High-level overview of what was added, what it protects against, and what it does NOT protect against (for class explanation).

#### `server/QUICK-TEST.md`
Quick reference for testing all protection features.

---

### 📝 Modified Files

#### `server/package.json`
**Added dependency:**
```json
"express-rate-limit": "^8.5.2"
```

#### `server/src/index.ts`
**Added trust proxy setting:**
```typescript
app.set("trust proxy", 1);
```
This ensures rate limiters see the real client IP from X-Forwarded-For headers (critical when deployed behind Render/Vercel proxies).

#### `server/src/routes/claim.ts`
**Changes:**
1. Imported `rateLimit` from `express-rate-limit`
2. Imported `hasClaimed` and `markClaimed` from `../claimTracker.js`
3. Created `claimLimiter` rate limiter (10 requests per 10 minutes per IP)
4. Applied `claimLimiter` middleware to the POST /claim route
5. Added per-address cap check BEFORE grading (returns 403 if address already claimed)
6. Called `markClaimed(user)` AFTER successful signature (all answers correct + signing succeeded)

**Flow now:**
```
POST /claim
  ↓
[Rate limiter: max 10 req/10min per IP]
  ↓
Validate request shape (sessionId, answers, userAddress)
  ↓
Look up session
  ↓
❗ CHECK: Has this address already claimed? → 403 if yes
  ↓
Consume session (prevents brute-force on one session)
  ↓
Grade answers
  ↓
If wrong → return review (does NOT mark as claimed)
  ↓
If all correct → sign claim
  ↓
❗ MARK address as claimed (only on successful signature)
  ↓
Return signature
```

#### `server/src/routes/tasks.ts`
**Changes:**
1. Imported `rateLimit` from `express-rate-limit`
2. Created `tasksLimiter` rate limiter (20 requests per 10 minutes per IP)
3. Applied `tasksLimiter` middleware to the POST /tasks route

**Why 20 requests?** Enough for honest users to retry if Groq is slow, but stops a script from hammering Groq and burning through the free API quota.

---

## Behavior Changes

### Before Protection:
- ❌ One address could claim unlimited times (loop quiz → claim)
- ❌ One IP could spam /api/tasks endlessly (burn Groq quota)
- ❌ One IP could brute-force /api/claim endlessly

### After Protection:
- ✅ One address can claim exactly once (even if it completes multiple quizzes correctly)
- ✅ One IP limited to 20 /api/tasks requests per 10 minutes
- ✅ One IP limited to 10 /api/claim requests per 10 minutes
- ✅ Wrong answers do NOT consume the per-address claim cap
- ✅ Rate limiters return HTTP 429 with clear JSON messages when exceeded

---

## What Still Works

✅ Groq question generation (with fallback if Groq fails)  
✅ Server-side grading (browser never sees correct answers)  
✅ EIP-712 signature generation  
✅ Session management (one graded attempt per session)  
✅ All existing error responses  
✅ Frontend unchanged (no client-side changes needed)  
✅ All secrets stay in server/.env

---

## Limitations (For Class Discussion)

### In-Memory State
- Both rate limits and claim tracker are in-memory
- **Resets on server restart** (Render free tier sleeps after inactivity)
- Production would use Redis (rate limits) + database (claims)

### Attack Vectors Still Open
- **Multiple wallets + multiple IPs:** Attacker with many addresses and IPs can still claim multiple times
- **No CAPTCHA:** Bots can still interact with the endpoints (but rate-limited)
- **No proof-of-work:** No computational cost to deter abuse
- **VPN/Proxy rotation:** IP-based rate limiting can be bypassed by changing IPs

### Why These Limits Are Okay for a Class Demo
- Demonstrates defense-in-depth thinking
- Shows real-world tradeoffs (in-memory vs persistent state)
- Stops accidental loops and simple bots
- Good enough for a class project with limited funds in the faucet
- Production faucets need more (see below)

---

## Production Hardening (Future)

If this were a real faucet with significant funds:
1. **Persistent storage:** Redis for rate limits, PostgreSQL for claims
2. **CAPTCHA:** Add reCAPTCHA or hCaptcha to both endpoints
3. **Proof-of-work:** Require client to solve a puzzle before claiming
4. **On-chain verification:** Check if address has a minimum balance or NFT
5. **Manual approval queue:** Large claims reviewed by humans
6. **Wallet history:** Check if address has suspicious on-chain activity
7. **Monitoring:** Alert on unusual patterns (many claims from one IP range, etc.)

---

## Testing Commands

### Start server:
```bash
cd server
npm run dev
```

### Run automated rate limit test:
```bash
cd server
node test-rate-limit.js
```

### Manual claim test (same address twice):
1. Use the UI to claim once (record your address)
2. Get new questions, claim again with same address
3. Should get: "This address has already claimed its ZYD."

### See full testing guide:
- `server/TEST-PROTECTION.md` (detailed)
- `server/QUICK-TEST.md` (quick reference)

---

## TypeScript Compliance

✅ All new code is TypeScript  
✅ No `any` types  
✅ Proper imports with `.js` extensions (ES modules)  
✅ Compiles without errors: `npx tsc --noEmit`

---

## Questions for Class

1. Why is in-memory state okay for a demo but not production?
2. How would you bypass this protection if you were determined?
3. What's the tradeoff between usability and security when setting rate limits?
4. Why check the claim cap BEFORE consuming the session?
5. Why mark an address as claimed AFTER signing (not before)?
