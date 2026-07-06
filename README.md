# Abhiram — Portfolio + AI Arcade

A single, hand-built portfolio site (no template) with a **live AI Arcade**: three original games backed by real LLMs through a serverless function. Frontend + backend, hosted **100% free**.

- **Frontend:** vanilla HTML/CSS/JS (no framework, no build step)
- **Backend:** one serverless function `api/chat.js` that proxies **Groq's free LLM API**
- **Hosting:** Vercel Hobby (free) — serves the static site *and* the function
- **Fallback:** every game has an offline scripted mode, so the site works even before you add a key

---

## The three games

| Game | Resume skill it demonstrates | How it works |
|---|---|---|
| **The Gatekeeper** | Prompt engineering · LLM guardrails · prompt-injection | An LLM guards a secret passphrase (chosen server-side). You try to make it leak. The server checks for a breach. |
| **Agent Ops** | Agentic AI · ReAct loops · tool use | You give a goal; the agent runs a real Thought→Action→Observation loop, calling tools (calc, a knowledge-base about you, string ops). Up to 5 steps, executed server-side. |
| **The Oracle** | Grounded reasoning · consistency (RAG-style) | The model secretly picks an entity and must stay consistent across 20 yes/no questions until you guess it. |

Secrets and system prompts live **only** on the server — they can't be read from browser devtools.

---

## Local preview (optional)

**Just the look (no games backend):** double-click `index.html`, or:
```bash
# from the portfolio/ folder
npx serve .        # then open the printed http://localhost:3000
```
Games run in **offline demo mode** here.

**Full experience with live LLMs, locally:**
```bash
npm i -g vercel
vercel dev         # first run links a project; accept defaults
```
Add your key first (see below) to a file named `.env.local`.

---

## ▶ Deploy for free — full step-by-step

You'll do this once. Total time ~15 minutes. Everything is free.

### Step 1 — Get a free Groq API key (the LLM brain)
1. Go to **https://console.groq.com** and sign up (Google login is fine).
2. Open **API Keys** → **Create API Key** → name it `portfolio` → **Copy** it.
   It looks like `gsk_...`. Save it somewhere for a moment.
   > Groq's free tier is generous and fast (Llama models). No credit card.

### Step 2 — Put the code on GitHub
1. Create a free account at **https://github.com** if you don't have one.
2. Click **New repository** → name it `portfolio` → **Public** → **Create**.
3. Upload the code. Easiest way (no git needed):
   - On the new repo page click **"uploading an existing file"**.
   - Open the `portfolio` folder on your PC, select **all files** (including the `api` and `assets` folders) and drag them in.
   - Click **Commit changes**.

   *Or* with git installed:
   ```bash
   cd portfolio
   git init
   git add .
   git commit -m "Portfolio + AI Arcade"
   git branch -M main
   git remote add origin https://github.com/<your-username>/portfolio.git
   git push -u origin main
   ```

### Step 3 — Deploy on Vercel
1. Go to **https://vercel.com** → **Sign up** → **Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find your `portfolio` repo → **Import**.
4. Leave every build setting on default (Framework Preset: **Other**). Don't change the root.
5. Expand **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `GROQ_API_KEY` | *(paste the `gsk_...` key from Step 1)* |
   | `SECRET_SEED` | *(any random text, e.g. `manoj-2026-xyz`)* |
6. Click **Deploy**. Wait ~1 minute.
7. You'll get a live URL like `https://portfolio-xxxx.vercel.app`. **Open it — you're live**, games and all.

### Step 4 — Verify the backend is live
- Scroll to the AI Arcade. The badge should read **"● Live LLM backend connected"**.
- If it says *offline demo mode*, the key wasn't picked up → go to **Vercel → your project → Settings → Environment Variables**, confirm `GROQ_API_KEY` is set for **Production**, then **Deployments → ⋯ → Redeploy**.

### Step 5 (optional) — Custom domain
- **Free subdomain:** Vercel → Settings → **Domains** → add e.g. `abhiram-portfolio.vercel.app` (rename the project for a cleaner URL).
- **Your own domain (`abhiram.dev` etc.):** buy from Namecheap/GoDaddy (~₹800/yr), then Vercel → Domains → add it and follow the DNS instructions. The HTTPS certificate is automatic and free.

---

## Updating the site later
Edit files → push to GitHub (or re-upload) → Vercel **auto-redeploys** every push. No extra steps.

## Personalize before sharing
- **LinkedIn / GitHub links:** in `index.html`, search for `linkedin.com/` and `github.com/` in the footer and set your real profile URLs.
- **Answer banks:** tweak `GATE_WORDS` / `ORACLE_ENTITIES` in `api/chat.js` to change the hidden game answers.
- **Knowledge base:** the `KB` object in `api/chat.js` is what Agent Ops knows about you — extend it freely.

## Cost summary
| Piece | Provider | Cost |
|---|---|---|
| Hosting (site + function) | Vercel Hobby | Free |
| LLM inference | Groq free tier | Free |
| Code hosting | GitHub | Free |
| HTTPS + `.vercel.app` domain | Vercel | Free |

**Total: ₹0.** (Only a custom domain costs money, and it's optional.)

---

## File map
```
portfolio/
├── index.html         # structure + content
├── styles.css         # the whole visual system
├── app.js             # boot loader, cursor, canvas, reveals, counters
├── games.js           # arcade engine + offline fallback
├── api/chat.js         # serverless LLM backend (Groq)
├── assets/Resume_Abhiram.pdf
├── vercel.json         # function config
├── package.json
├── .env.example        # copy to .env.local for local dev
└── README.md
```
