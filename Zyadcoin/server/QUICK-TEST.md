# Quick Protection Test Guide

## Start the Server
```bash
cd server
npm run dev
```

---

## Test 1: Same Address Can't Claim Twice ✅

### Using the UI:
1. Open http://localhost:5173
2. Generate questions, answer correctly, submit claim
3. **Note your wallet address**
4. Get NEW questions, answer correctly again
5. Try to claim with the SAME address
6. **Expected:** `"This address has already claimed its ZYD."`

### Using curl (Windows):
```cmd
REM First claim (should work if address hasn't claimed before)
curl -X POST http://localhost:3001/api/claim ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\":\"valid-session-id\",\"answers\":[0,1,2],\"userAddress\":\"0xYourAddress\"}"

REM Second claim from same address (should fail with 403)
curl -X POST http://localhost:3001/api/claim ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\":\"another-valid-session-id\",\"answers\":[0,1,2],\"userAddress\":\"0xYourAddress\"}"
```

---

## Test 2: Rate Limit on /api/tasks 🚦

### Automated test:
```bash
node test-rate-limit.js
```
**Expected:** First 20 requests succeed, 21-25 return 429

### Manual test:
Keep clicking "Get New Questions" in the UI. After 20 clicks, you'll see an error.

---

## Test 3: Rate Limit on /api/claim 🚦

### Using curl loop (PowerShell):
```powershell
1..15 | ForEach-Object {
  curl -X POST http://localhost:3001/api/claim `
    -H "Content-Type: application/json" `
    -d "{\"sessionId\":\"x\",\"answers\":[0,0,0],\"userAddress\":\"0x123\"}"
  Start-Sleep -Milliseconds 200
}
```
**Expected:** First 10 requests processed, 11-15 return 429

---

## Reset Everything

**To clear the per-address claim cap:**
- Restart the server (Ctrl+C, then `npm run dev`)

**To clear rate limits:**
- Restart the server OR wait 10 minutes

---

## What to Watch in Console

While testing, the server console shows:
- "API listening on http://localhost:3001" — server started ✅
- Request logs from Express
- "Failed to sign claim" — when grading fails or address already claimed
- Rate limit errors (express-rate-limit automatically logs)

---

## Common Issues

**"Session not found":**
- Sessions expire quickly. Generate tasks, then immediately submit claim.

**"Invalid userAddress":**
- Use a valid Ethereum address format: `0x` + 40 hex characters

**Rate limited instantly:**
- You may have rate-limited yourself in a previous test. Wait 10 min or restart server.

**Address already claimed:**
- Working as intended! Restart the server to reset the in-memory claim tracker.
