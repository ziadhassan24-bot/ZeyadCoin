# Zeyad Coin (ZYD) — Earn-by-Coding Class Demo

A one-page site for a university blockchain class. A visitor connects MetaMask,
picks a language, and gets 3 easy multiple-choice coding questions (generated live
by Groq). The **backend** grades the answers, and only an all-correct quiz produces
a signed claim that releases **3 real ZYD on-chain** from the faucet — with a
celebration. They can also read their real on-chain ZYD balance, send ZYD to another
address with a real ERC-20 transfer, and follow a link to the contract on Etherscan.

- **Token:** Zeyad Coin (ZYD), 18 decimals, ERC-20 on the **Sepolia** testnet
- **Token contract:** `0x4B1670D26Ce613BB8516FAD8BF0D4ACD234089E6`
  ([view on Sepolia Etherscan](https://sepolia.etherscan.io/token/0x4B1670D26Ce613BB8516FAD8BF0D4ACD234089E6))
- **Faucet contract:** `0x55B7B0dAA9424bfd1328135cffCa244D1bE8C748` — releases ZYD only
  for a valid signed claim from the trusted signer
  ([view on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x55B7B0dAA9424bfd1328135cffCa244D1bE8C748))

## How the reward works (important)

The 3 ZYD reward is **real and released on-chain** — not simulated. Server-side
grading is what makes that safe: the browser never receives the answer key, so it
can't grant itself tokens. When you submit, the **backend** grades the answers, and
only an all-correct quiz produces an **EIP-712 signature** from the trusted signer.
The ZydFaucet contract releases ZYD only for a valid signature, so the reward is a
genuine on-chain transfer that still can't be faked from the client.

Reading your balance is a real on-chain call too. Everything runs on the **Sepolia
testnet**, so the tokens have no monetary value — but every transfer here is a real
transaction you can verify on Etherscan.

## Project structure

```
Zyadcoin/
├── server/   Express + TypeScript. Holds the secrets and grades the quiz.
│             Endpoints: POST /api/tasks (questions) and POST /api/claim (grade + sign).
└── client/   React + Vite + TypeScript + Tailwind v4 + ethers v6. The one-page UI.
```

Two secrets live **only** in `server/.env` — the Groq API key and the trusted
signer's private key. The browser never receives either one.

## Setup

1. Install dependencies (run once from the project root):

   ```powershell
   npm run install:all
   ```

2. Add your keys. Copy the example file and fill it in:

   ```powershell
   Copy-Item server\.env.example server\.env
   # then edit server\.env:
   #   GROQ_API_KEY=...        (free at https://console.groq.com/keys)
   #   SIGNER_PRIVATE_KEY=...  (the trusted signer's key — required to award ZYD)
   ```

   **Without `GROQ_API_KEY`** the app still works — the backend returns 3 built-in
   fallback questions so the demo never breaks. **Without `SIGNER_PRIVATE_KEY`** the
   quiz and balance still work, but the reward can't be signed, so no ZYD is awarded.

## Run

**Two terminals (clear separation of frontend and backend):**

```powershell
# Terminal 1 — backend
cd server
npm run dev        # http://localhost:3001

# Terminal 2 — frontend
cd client
npm run dev        # http://localhost:5173
```

**Or one command (from the project root):**

```powershell
npm run dev        # runs both together
```

Then open **http://localhost:5173**.

## Deploy to production (Vercel + Render)

The two halves deploy separately: the **backend** (Express + secrets) to Render,
the **frontend** (React build) to Vercel. The contract is already live on Sepolia —
nothing to deploy there.

**Prerequisite:** push this whole repo (with both `client/` and `server/`) to GitHub.

There is a deliberate order because each side needs the other's URL:

### 1. Backend → Render

1. Render dashboard → **New** → **Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
3. **Environment** → add `GROQ_API_KEY` = your Groq key and `SIGNER_PRIVATE_KEY` =
   the trusted signer's private key (required to award ZYD). (Leave `FRONTEND_URL`
   for step 3. Do **not** set `PORT` — Render provides it.)
4. Deploy. You get a URL like `https://zyadcoin-backend.onrender.com`.
   - Free tier sleeps after ~15 min idle (~50s cold start on first hit). Fine for
     class; just expect the first load to be slow.
   - Confirm it's up: open `https://<your-backend>.onrender.com/api/health` →
     `{"ok":true}`.

### 2. Frontend → Vercel

1. Vercel → **Add New** → **Project** → import the same repo.
2. Settings:
   - **Root Directory:** `client` (Vercel auto-detects the Vite framework, build
     `npm run build`, output `dist`).
   - **Environment Variables:** add `VITE_API_URL` = your Render URL from step 1
     (e.g. `https://zyadcoin-backend.onrender.com`, **no trailing slash**).
     This is read at build time, so it must be set before you deploy.
3. Deploy. You get a URL like `https://zyadcoin.vercel.app`.

### 3. Wire CORS (the part that breaks first)

Back in **Render** → your service → **Environment** → set
`FRONTEND_URL` = your Vercel URL (e.g. `https://zyadcoin.vercel.app`, no trailing
slash) → save (Render redeploys). Now the backend allows requests from the deployed
site. Without this, the browser blocks every `/api/tasks` call with a CORS error.

### Verify production

Open the Vercel URL → pick a language → **Get my 3 quiz questions**. If the badge
says **Generated by Groq**, the full chain works (Vercel → Render → Groq). If the
questions fail to load, open the browser console:

- A **CORS** error → `FRONTEND_URL` on Render is missing or doesn't exactly match
  the Vercel origin (scheme + host, no trailing slash).
- A **404/Network** error → `VITE_API_URL` on Vercel is wrong; fix it and redeploy
  (Vite bakes it in at build time, so a rebuild is required).

## How it works

1. **Get questions** — the user picks a language (JavaScript, Python, Java, C++)
   and the frontend calls `POST /api/tasks` with it. The backend asks Groq
   (model `llama-3.3-70b-versatile`, JSON mode) for 3 easy multiple-choice
   questions in that language (or 3 built-in fallback questions if Groq is
   unavailable, so the demo never breaks). The **answer key is kept server-side**,
   keyed by a session id; the browser only ever receives the questions and options.
2. **Answer** — each question has 4 options. One attempt per question: the first
   click locks it and highlights your pick. There's no green/right-or-wrong hint,
   because the browser doesn't have the answer key — grading happens on the server.
3. **Claim** — once all 3 are answered, you connect MetaMask (on Sepolia) and hit
   **Claim 3 ZYD**. The frontend calls `POST /api/claim`; the backend grades and, if
   all 3 are correct, returns a signed claim. The browser submits it to the faucet
   on-chain (you pay the gas), confetti fires, and the real balance refreshes. If any
   answer is wrong the session is spent — you see the answer key and get a new set.
4. **Connect wallet** — MetaMask via ethers v6. Reads and displays the real
   on-chain ZYD balance, and silently restores an existing session on load.
   Connecting auto-switches to Sepolia (with a manual "Switch to Sepolia"
   fallback), and a Disconnect button clears the session (and won't silently
   reconnect afterward). Handles: no MetaMask (on a phone, hands off to the
   MetaMask app), wrong network, and a rejected connection.
5. **Send ZYD** — once connected, a real ERC-20 `transfer` on Sepolia, with an
   Etherscan link to the transaction and a local-only "recent transfers" feed.
6. **Contract** — shows the address with a copy button and an Etherscan link.

## Why the secrets stay on the backend

The browser is fully inspectable: anything shipped to the frontend (network tab,
JS bundle) can be read by any visitor. If the Groq key were in the frontend, anyone
could copy it and spend against your account. Keeping it in `server/.env` means the
browser only ever talks to your own `/api/tasks` endpoint, and the server attaches
the secret key when it calls Groq — the key never leaves the server.

The same applies, even more so, to `SIGNER_PRIVATE_KEY`. It's the key the faucet
trusts to authorize ZYD payouts, so it must never reach the browser: the backend
grades the quiz and signs the claim, and only the resulting signature is sent to the
client. If that key leaked, anyone could sign their own claims and drain the faucet
without answering a single question.

## Tech

- **Backend:** Express, TypeScript (run with `tsx`), `groq-sdk`, `ethers` (EIP-712
  claim signing), `cors`, `dotenv`.
- **Frontend:** React, Vite, TypeScript, TailwindCSS v4, ethers v6, `canvas-confetti`,
  `lucide-react`.
