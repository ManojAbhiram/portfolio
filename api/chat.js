// ============================================================
//  /api/chat  — serverless brain for the AI Arcade
//  Runtime: Vercel Node.js function
//  Talks to Groq's free OpenAI-compatible API. Keeps every game
//  secret + system prompt server-side so it can't be read in devtools.
//
//  Games:
//   01 promptcraft — prompt golf (shortest prompt that hits a target)
//   02 react       — ReAct agent with real tool loop
//   03 signal      — semantic-similarity word hunt (Semantle-style)
// ============================================================

const crypto = require("crypto");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const FAST_MODEL = process.env.GROQ_FAST_MODEL || "llama-3.1-8b-instant";
const SEED = process.env.SECRET_SEED || "abhiram-arcade-fallback-seed";

// ---- hidden answer banks (server-only) ----
const TARGETS = [
  "Hello, World!",
  "The answer is 42.",
  "404: Not Found",
  "May the Force be with you.",
  "Winter is coming.",
  "I think, therefore I am.",
  "Ready. Set. Go.",
  "It works on my machine.",
];
const SIGNAL_WORDS = [
  { w: "ocean", cat: "nature" },
  { w: "guitar", cat: "objects" },
  { w: "rocket", cat: "technology" },
  { w: "coffee", cat: "food & drink" },
  { w: "tiger", cat: "animals" },
  { w: "mountain", cat: "nature" },
  { w: "robot", cat: "technology" },
  { w: "library", cat: "places" },
  { w: "volcano", cat: "nature" },
  { w: "pizza", cat: "food & drink" },
];

// deterministic pick from a session token — server can recompute, client can't guess
function pick(list, session, salt) {
  const h = crypto.createHmac("sha256", SEED).update(session + "|" + salt).digest();
  return list[h.readUInt32BE(0) % list.length];
}

function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}
// normalize a target/output for comparison (strip wrapping quotes + collapse ws)
function normOut(s) {
  return String(s || "").trim().replace(/^["'`\s]+|["'`\s]+$/g, "").replace(/\s+/g, " ").toLowerCase();
}
// Levenshtein similarity 0..1 for "how close" feedback
function similarity(a, b) {
  a = normOut(a); b = normOut(b);
  if (!a && !b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}

// ---- tools for the ReAct agent (Game 02) ----
const KB = {
  role: "Abhiram is a Software Engineer 1 at Deepta AI (Hyderabad), working on backend + Generative AI since Aug 2025.",
  languages: "Abhiram's core languages are Go, Python and SQL.",
  ai: "Abhiram builds RAG pipelines, Agentic AI workflows, OCR pipelines, and does LLM fine-tuning and prompt engineering.",
  backend: "Abhiram builds Kafka-driven event pipelines and microservices in Go, plus 15+ REST APIs on PostgreSQL with Redis-backed sessions.",
  impact: "His OCR pipelines cut manual validation ~60%, Redis sessions cut auth latency ~40%, and his pipelines serve 10K+ users.",
  projects: "Notable projects: a Pest Detection CNN app (Flask+React on AWS EC2, ~75% accuracy) and an ML/NLP Personal Finance Manager (MERN, ~85% categorization accuracy).",
  education: "Abhiram holds a B.Tech in CSE (IoT) from Shiv Nadar University Chennai, 2021-2025.",
  contact: "Reach Abhiram at manoj.abhi2889@gmail.com or +91 95816 82255.",
};
function runTool(tool, input) {
  const q = String(input || "").slice(0, 200);
  try {
    if (tool === "calc") {
      if (!/^[-+*/(). 0-9%]+$/.test(q)) return "Error: only numbers and + - * / ( ) allowed.";
      const val = Function('"use strict";return (' + q + ")")();
      return Number.isFinite(val) ? "Result: " + val : "Error: not a finite number.";
    }
    if (tool === "reverse") return "Reversed: " + q.split("").reverse().join("");
    if (tool === "wordcount") return "Word count: " + (q.trim() ? q.trim().split(/\s+/).length : 0);
    if (tool === "kb") {
      const key = norm(q);
      const hit = Object.keys(KB).find((k) => key.includes(k));
      if (hit) return KB[hit];
      const found = Object.values(KB).find((v) => norm(v).includes(key) && key.length > 3);
      return found || "No exact entry. Available topics: " + Object.keys(KB).join(", ") + ".";
    }
    return "Error: unknown tool '" + tool + "'. Valid tools: calc, kb, reverse, wordcount.";
  } catch (e) {
    return "Error running tool: " + e.message;
  }
}

// ---- Groq call ----
async function groq(messages, { model = MODEL, temperature = 0.7, max_tokens = 400, json = false } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) { const err = new Error("NO_KEY"); err.code = "NO_KEY"; throw err; }
  const body = { model, messages, temperature, max_tokens };
  if (json) body.response_format = { type: "json_object" };
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error("Groq " + r.status + ": " + t.slice(0, 300));
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ============================================================
//  Handler
// ============================================================
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ ok: true, hasKey: !!process.env.GROQ_API_KEY });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  let payload = req.body;
  if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch { payload = {}; } }
  const { game, session, input = "", action } = payload || {};
  const userText = String(input).slice(0, 1200);

  try {
    // ---------- GAME 01 — PROMPTCRAFT (prompt golf) ----------
    if (game === "promptcraft") {
      const target = pick(TARGETS, session || "x", "golf");
      if (action === "new") return res.status(200).json({ target });
      if (!process.env.GROQ_API_KEY) return res.status(200).json({ offline: true });

      // The player's text IS the prompt. Send it raw to a fresh model.
      const sys = { role: "system", content: "You are a plain assistant. Follow the user's instruction exactly and output only what they ask for." };
      const output = await groq([sys, { role: "user", content: userText }], { temperature: 0, max_tokens: 120 });
      const sim = similarity(output, target);
      const matched = normOut(output) === normOut(target);
      return res.status(200).json({
        reply: output,
        target,
        similarity: Math.round(sim * 100),
        status: matched ? "win" : "playing",
        score: matched ? userText.length : undefined,
      });
    }

    // ---------- GAME 03 — SIGNAL (semantic similarity hunt) ----------
    if (game === "signal") {
      const entry = pick(SIGNAL_WORDS, session || "x", "signal");
      if (action === "new") return res.status(200).json({ hint: entry.cat });
      if (!process.env.GROQ_API_KEY) return res.status(200).json({ offline: true });

      const guess = norm(userText).split(/\s+/)[0] || "";
      if (guess && guess === norm(entry.w)) {
        return res.status(200).json({ score: 100, status: "win", revealed: entry.w });
      }
      const sys = {
        role: "system",
        content:
          `Secret word: "${entry.w}". The user guesses a word; rate how semantically related their guess is to the secret. ` +
          `Output ONLY JSON: {"score": <int 0-100>, "note": "<max 8 words, playful, NEVER contain/rhyme/spell the secret>"}. ` +
          `100 = same meaning, 70+ = strongly related, 40-69 = same theme, 10-39 = loosely related, 0-9 = unrelated.`,
      };
      const raw = await groq([sys, { role: "user", content: "Guess: " + userText.slice(0, 60) }], { model: FAST_MODEL, temperature: 0, max_tokens: 60, json: true });
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = { score: 0, note: "hmm, unclear signal." }; }
      let score = Math.max(0, Math.min(99, parseInt(parsed.score, 10) || 0));
      return res.status(200).json({ score, note: String(parsed.note || "").slice(0, 60), status: "playing" });
    }

    // ---------- GAME 02 — AGENT OPS (real ReAct tool loop) ----------
    if (game === "react") {
      if (!process.env.GROQ_API_KEY) return res.status(200).json({ offline: true });
      const sys = {
        role: "system",
        content:
          `You are Agent Ops, an autonomous ReAct agent. Solve the user's goal by reasoning and using tools.\n` +
          `Available tools:\n` +
          `- calc(expr): evaluate arithmetic, e.g. calc("2*(14+7)")\n` +
          `- kb(topic): look up facts about the engineer Abhiram. Topics: role, languages, ai, backend, impact, projects, education, contact\n` +
          `- reverse(text): reverse a string\n` +
          `- wordcount(text): count words\n` +
          `Respond with ONE JSON object per step and NOTHING else. Two shapes:\n` +
          `{"thought":"...","tool":"calc","tool_input":"2+2"}  — to call a tool\n` +
          `{"thought":"...","final":"your answer to the user"}  — when done\n` +
          `Take the minimum steps needed. Always finish with a "final".`,
      };
      const trace = [];
      let convo = [sys, { role: "user", content: "GOAL: " + userText }];
      let final = null;
      for (let step = 0; step < 5; step++) {
        const raw = await groq(convo, { model: FAST_MODEL, temperature: 0.3, max_tokens: 300, json: true });
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = { final: raw }; }
        if (parsed.final !== undefined && parsed.final !== null && parsed.tool === undefined) {
          if (parsed.thought) trace.push({ type: "thought", text: parsed.thought });
          final = String(parsed.final);
          break;
        }
        const thought = parsed.thought || "Let me use a tool.";
        const tool = parsed.tool || "kb";
        const toolInput = parsed.tool_input ?? parsed.input ?? "";
        const obs = runTool(tool, toolInput);
        trace.push({ type: "thought", text: thought });
        trace.push({ type: "action", text: `${tool}(${JSON.stringify(String(toolInput).slice(0, 80))})` });
        trace.push({ type: "observation", text: obs });
        convo.push({ role: "assistant", content: raw });
        convo.push({ role: "user", content: "Observation: " + obs + "\nContinue. Respond with the next JSON step." });
      }
      if (final === null) final = "I hit my step limit — try narrowing the goal.";
      trace.push({ type: "final", text: final });
      return res.status(200).json({ trace, status: "done" });
    }

    return res.status(400).json({ error: "unknown game" });
  } catch (err) {
    if (err.code === "NO_KEY") return res.status(200).json({ error: "NO_KEY", offline: true });
    console.error(err);
    return res.status(500).json({ error: "server", detail: String(err.message).slice(0, 200) });
  }
};
