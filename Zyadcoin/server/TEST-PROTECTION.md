# Testing the Faucet Protection

## Prerequisites
- Server running: `npm run dev` (in the `server` folder)
- Frontend running: `npm run dev` (in the `client` folder)
- A wallet connected (e.g., MetaMask)

---

## Test 1: Per-Address Claim Cap (Same Address Twice)

**Goal:** Verify that one address can only claim once, even if it completes multiple quizzes correctly.

1. **First claim (should succeed):**
   - Open the app in your browser
   - Generate quiz questions
   - Answer all 3 questions correctly
   - Submit the claim with your wallet address
   - **Expected:** You receive a signature and can claim 3 ZYD from the faucet

2. **Second claim from same address (should be blocked):**
   - Generate a NEW set of quiz questions (new session)
   - Answer all 3 questions correctly again
   - Submit the claim with the SAME wallet address
   - **Expected:** Response with `success: false` and message:
     ```json
     {
       "success": false,
       "message": "This address has already claimed its ZYD."
     }
     ```
   - HTTP status: 403

3. **Wrong answers don't consume the cap:**
   - If you want to verify this, use a different address
   - Submit WRONG answers first
   - Then submit CORRECT answers
   - **Expected:** The first (wrong) attempt does NOT consume your one allowed claim

---

## Test 2: Rate Limiting on /api/tasks (Hammer the Task Generator)

**Goal:** Verify that one IP can't spam Groq by requesting tasks endlessly.

**Quick Test (manual):**
- Keep clicking "Get New Questions" in the UI
- After 20 requests in 10 minutes, you'll get a 429 error
- **Expected response:**
  ```json
  {
    "success": false,
    "message": "Too many task requests from this IP. Please try again in 10 minutes."
  }
  ```

**Script Test (automated):**
Create a file `test-rate-limit.js` in the server folder:

```javascript
// test-rate-limit.js — spam /api/tasks to hit the rate limit
const API_URL = "http://localhost:3001/api/tasks";

async function spamTasks() {
  for (let i = 1; i <= 25; i++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "JavaScript" }),
    });
    const data = await res.json();
    
    if (res.status === 429) {
      console.log(`❌ Request ${i}: Rate limited (429)`);
      console.log(`   Message: ${data.message}`);
    } else {
      console.log(`✅ Request ${i}: Success (${res.status})`);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

spamTasks();
```

Run it:
```bash
node test-rate-limit.js
```

**Expected:** First 20 requests succeed, requests 21-25 return 429 with the rate limit message.

---

## Test 3: Rate Limiting on /api/claim

**Goal:** Verify that one IP can't brute-force the claim endpoint.

**Quick Test:**
- You can manually submit 10 claim requests in a row (even with wrong answers)
- The 11th request should return 429
- **Expected response:**
  ```json
  {
    "success": false,
    "message": "Too many claim attempts from this IP. Please try again in 10 minutes."
  }
  ```

**Script Test:**
Similar to the tasks test above, but POST to `/api/claim` with:
```javascript
{
  sessionId: "<valid session from a /api/tasks call>",
  answers: [0, 0, 0],
  userAddress: "0xYourAddress"
}
```

---

## Resetting During Testing

**If you need to test the same address again:**
- The in-memory claim tracker resets when you restart the server
- Stop the server (Ctrl+C) and run `npm run dev` again
- The address cap is cleared

**If you hit a rate limit during testing:**
- Wait 10 minutes, OR
- Restart the server (rate limits are also in-memory), OR
- Test from a different IP (e.g., mobile hotspot, VPN)

---

## Monitoring

While testing, watch the server console. You'll see:
- Rate limit hits (express-rate-limit logs automatically)
- Claim attempts (server logs "Failed to sign claim" or returns signatures)
- Any errors

---

## Notes

- All protection is **per IP** for rate limiting and **per address** for claim cap
- The `trust proxy` setting ensures Render/Vercel/etc. see the real client IP (not the proxy's IP)
- Both rate limits and claim tracking are **in-memory** and reset on server restart
