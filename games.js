// ============================================================
//  games.js — AI Arcade client engine
//  Games: promptcraft (prompt golf) · react (ReAct agent) · signal (semantic hunt)
//  Talks to /api/chat and falls back to offline scripted mode with no key.
// ============================================================

const Arcade = (() => {
  const API = "/api/chat";
  let backendReady = null; // null=unknown, true, false

  function newSession() {
    const a = new Uint8Array(16);
    if (crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ---- DOM ----
  const modal = document.getElementById("gameModal");
  const log = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const inputEl = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  const titleEl = document.getElementById("modalTitle");
  const metaEl = document.getElementById("modalMeta");
  const restartBtn = document.getElementById("btnRestart");
  const hintBtn = document.getElementById("btnHint");

  let state = { game: null, session: null, history: [], over: false, turns: 0, target: null, best: null };

  // ---- game config ----
  const GAMES = {
    promptcraft: {
      title: "PROMPTCRAFT — Prompt Golf",
      meta: '<b>How to win:</b> You get a target line. Write a prompt that makes the AI output it <b>exactly</b>. Match it and you win — the <b>fewer characters</b> in your prompt, the better your score.',
      hint: "The AI is chatty by default, so be strict. Try: “Output exactly this and nothing else: <target>”. Then shorten it — drop words, use “Say: …”, and see how tiny a prompt still lands the exact match.",
      intro: "⛳ Welcome to the driving range. I'll give you a target — get me to say it word-for-word, as briefly as you can.",
      placeholder: "Write your prompt…",
      needsInit: true,
    },
    react: {
      title: "AGENT OPS — ReAct",
      meta: '<b>How to win:</b> there\'s no losing — give the agent a goal and watch it work. It reasons in a live Thought→Action→Observation loop, calling real tools (calc, a knowledge-base about Abhiram, string ops) until it answers.',
      hint: "Try: “What is 15% of 2400 plus 30?”, “Summarize Abhiram's AI experience”, or “Reverse the word ‘agentic’ and count the words in this sentence.” The agent chooses the tools itself.",
      intro: "⚙️ Agent Ops online. Give me a goal and watch me reason through it. I can do math, look up facts about Abhiram, and manipulate text.",
      placeholder: "Give the agent a goal…",
      needsInit: false,
    },
    signal: {
      title: "SIGNAL — Semantic Hunt",
      meta: '<b>How to win:</b> I\'m hiding one secret word. Each guess gets a <b>0–100 similarity score</b> by meaning (not spelling). Follow the heat — higher = closer — until you guess the exact word.',
      hint: "This scores by meaning, like a vector database. If “sea” scores 78, don't try “seat” (spelling) — try “wave”, “tide”, “beach” (meaning). Climb the score toward 100.",
      intro: "📡 I've locked onto a secret word. Send a guess and I'll tell you how close you are — by meaning, not letters.",
      placeholder: "Guess a word…",
      needsInit: true,
    },
  };

  // ---- backend probe ----
  async function probe() {
    try {
      const r = await fetch(API, { method: "GET" });
      const j = await r.json();
      backendReady = !!(r.ok && j.hasKey);
    } catch { backendReady = false; }
    return backendReady;
  }

  // ---- UI helpers ----
  function bubble(cls, html) {
    const d = document.createElement("div");
    d.className = "msg " + cls;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function typing() {
    const d = document.createElement("div");
    d.className = "typing";
    d.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function lock(on) {
    inputEl.disabled = on;
    sendBtn.disabled = on;
    if (!on) inputEl.focus();
  }

  function tempWord(s) {
    if (s >= 100) return "🎯 EXACT";
    if (s >= 75) return "🔥 boiling";
    if (s >= 55) return "🌡️ hot";
    if (s >= 40) return "☀️ warm";
    if (s >= 22) return "🌤️ cool";
    return "❄️ cold";
  }
  function tempColor(s) {
    if (s >= 75) return "var(--rose)";
    if (s >= 55) return "var(--amber)";
    if (s >= 40) return "#ffd23f";
    if (s >= 22) return "var(--cyan)";
    return "#5b8cff";
  }
  function renderMeter(guess, score, note) {
    const b = document.createElement("div");
    b.className = "msg msg--ai meterwrap";
    b.innerHTML =
      `<div class="meterrow"><span class="meterguess">“${esc(guess)}”</span>` +
      `<span class="meterval" style="color:${tempColor(score)}">${score}<small>/100</small> · ${tempWord(score)}</span></div>` +
      `<div class="meter"><div class="meter__fill" style="width:${score}%;background:${tempColor(score)}"></div></div>` +
      (note ? `<div class="meternote">${esc(note)}</div>` : "");
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
  }

  // ---- open / close ----
  async function open(gameKey) {
    const g = GAMES[gameKey];
    if (!g) return;
    state = { game: gameKey, session: newSession(), history: [], over: false, turns: 0, target: null, best: state.best && state.best.game === gameKey ? state.best : null };
    titleEl.textContent = g.title;
    metaEl.innerHTML = g.meta + (backendReady === false ? ' <span style="color:var(--amber)">· offline demo mode</span>' : "");
    log.innerHTML = "";
    inputEl.value = "";
    inputEl.placeholder = g.placeholder;
    lock(false);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    bubble("msg--ai", esc(g.intro));
    setTimeout(() => inputEl.focus(), 60);
    if (g.needsInit) await initRound(gameKey);
  }
  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
  function restart() { if (state.game) open(state.game); }

  // ---- per-game round setup (fetch target / hint) ----
  async function initRound(gameKey) {
    if (backendReady) {
      try {
        const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: gameKey, session: state.session, action: "new" }) });
        const j = await r.json();
        if (j.offline) { backendReady = false; }
        else if (gameKey === "promptcraft") { state.target = j.target; showTarget(); return; }
        else if (gameKey === "signal") { bubble("msg--sys", `🗂 Category: ${esc(j.hint || "unknown")} — one single word.`); return; }
      } catch { backendReady = false; }
    }
    // offline init
    if (gameKey === "promptcraft") { state.target = OFF.promptcraft.pick(); showTarget(); }
    else if (gameKey === "signal") { OFF.signal.reset(); bubble("msg--sys", `🗂 Category: ${OFF.signal.cat} — one single word.`); }
  }
  function showTarget() {
    bubble("msg--sys", `🎯 TARGET → &nbsp;<b style="color:var(--lime)">${esc(state.target)}</b><br>Make the AI output exactly that, in the fewest characters.`);
  }

  // ---- send a turn ----
  async function send(text) {
    if (state.over) return;
    text = text.trim();
    if (!text) return;
    bubble("msg--user", esc(text));
    state.history.push({ role: "user", content: text });
    state.turns++;
    lock(true);
    if (backendReady) await onlineTurn(text);
    else await offlineTurn(text);
    if (!state.over) lock(false);
  }

  // ---- ONLINE ----
  async function onlineTurn(text) {
    const t = typing();
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: state.game, session: state.session, messages: state.history.slice(0, -1), input: text }),
      });
      const j = await r.json();
      t.remove();
      if (j.offline || j.error === "NO_KEY") { backendReady = false; return offlineTurn(text); }
      if (j.error) { bubble("msg--sys", "⚠️ " + esc(j.detail || j.error)); return; }

      if (state.game === "react") return renderTrace(j.trace || []);

      if (state.game === "promptcraft") {
        bubble("msg--ai", "🤖 Output → " + esc(j.reply || "…"));
        if (j.status === "win") return winGolf(text.length);
        return bubble("msg--sys", `Not exact — match ${j.similarity ?? 0}% · your prompt was ${text.length} chars. Refine it.`);
      }

      if (state.game === "signal") {
        if (j.status === "win") { renderMeter(text, 100, "perfect meaning-match"); return winSignal(j.revealed); }
        return renderMeter(text, j.score ?? 0, j.note);
      }
    } catch (e) {
      t.remove();
      bubble("msg--sys", "⚠️ Network hiccup — switching to offline demo.");
      backendReady = false;
      return offlineTurn(text);
    }
  }

  async function renderTrace(trace) {
    for (const step of trace) {
      await sleep(360);
      if (step.type === "final") bubble("msg--ai", esc(step.text));
      else {
        const label = { thought: "🧠 Thought", action: "🔧 Action", observation: "👁 Observation" }[step.type];
        const cls = { thought: "think", action: "act", observation: "obs" }[step.type];
        bubble("msg--ai", `<span class="${cls}">${label}: ${esc(step.text)}</span>`);
      }
    }
  }

  // ---- win handlers ----
  function winGolf(len) {
    state.over = true; lock(true);
    let msg = `🏆 EXACT MATCH in a ${len}-character prompt!`;
    if (state.best == null || len < state.best) { state.best = len; msg += " ⭐ New personal best."; }
    else msg += ` (Your best: ${state.best}.)`;
    bubble("msg--win", msg + " Hit ↻ for a new target — or beat your score.");
  }
  function winSignal(word) {
    state.over = true; lock(true);
    bubble("msg--win", `🎯 LOCKED! The word was “${esc(word)}”. Found in ${state.turns} guess(es).`);
  }

  // ============================================================
  //  OFFLINE MODE — works with zero backend / zero API key
  // ============================================================
  const OFF = {
    promptcraft: {
      bank: ["Hello, World!", "The answer is 42.", "Ready. Set. Go.", "404: Not Found"],
      pick() { return this.bank[Math.floor(Math.random() * this.bank.length)]; },
      run(prompt, target) {
        const p = prompt.toLowerCase(), t = target.toLowerCase();
        // naive "model": if the prompt quotes/says the target, it echoes it
        if (p.includes(t)) return { output: target, win: true };
        if (/output|say|repeat|print|exactly/.test(p)) return { output: "Sure! " + target + " — was that what you wanted?", win: false };
        return { output: "I'm not sure what to output. Try telling me exactly what to say.", win: false };
      },
    },
    signal: {
      bank: [
        { w: "ocean", cat: "nature", hot: { sea: 82, water: 78, wave: 74, beach: 66, blue: 55, fish: 52, salt: 48, river: 44 } },
        { w: "guitar", cat: "objects", hot: { music: 74, string: 70, band: 64, rock: 58, song: 56, instrument: 72, drum: 50, play: 42 } },
        { w: "rocket", cat: "technology", hot: { space: 80, launch: 76, nasa: 68, moon: 60, fuel: 56, fast: 48, engine: 58, sky: 44 } },
      ],
      cur: null, cat: "",
      reset() { this.cur = this.bank[Math.floor(Math.random() * this.bank.length)]; this.cat = this.cur.cat; },
      score(guess) {
        if (!this.cur) this.reset();
        const g = guess.toLowerCase().trim();
        if (g === this.cur.w) return { score: 100, win: true };
        if (this.cur.hot[g] != null) return { score: this.cur.hot[g], note: "same theme — keep going" };
        // crude lexical fallback
        let shared = 0; const a = new Set(g); for (const c of this.cur.w) if (a.has(c)) shared++;
        const s = Math.min(30, Math.round((shared / this.cur.w.length) * 25));
        return { score: s, note: s > 15 ? "faint signal" : "cold — think meaning, not letters" };
      },
    },
  };

  async function offlineTurn(text) {
    const t = typing();
    await sleep(450 + Math.random() * 450);
    t.remove();

    if (state.game === "react") return renderTrace(fakeReact(text));

    if (state.game === "promptcraft") {
      if (!state.target) state.target = OFF.promptcraft.pick();
      const res = OFF.promptcraft.run(text, state.target);
      bubble("msg--ai", "🤖 Output → " + esc(res.output));
      if (res.win) return winGolf(text.length);
      return bubble("msg--sys", `Not exact yet · prompt was ${text.length} chars. (Offline demo — add a Groq key for a real LLM to golf against.)`);
    }

    if (state.game === "signal") {
      const res = OFF.signal.score(text);
      if (res.win) { renderMeter(text, 100, "exact"); return winSignal(OFF.signal.cur.w); }
      return renderMeter(text, res.score, res.note);
    }
  }

  function fakeReact(goal) {
    const g = goal.toLowerCase();
    const steps = [];
    const m = g.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      steps.push({ type: "thought", text: "This looks like arithmetic. I'll use the calc tool." });
      steps.push({ type: "action", text: `calc("${m[1]}${m[2]}${m[3]}")` });
      const val = ({ "+": (a, b) => a + b, "-": (a, b) => a - b, "*": (a, b) => a * b, "/": (a, b) => a / b })[m[2]](+m[1], +m[3]);
      steps.push({ type: "observation", text: "Result: " + val });
      steps.push({ type: "final", text: `The answer is ${val}.` });
    } else if (/abhiram|experience|skill|backend|ai|project|work/.test(g)) {
      steps.push({ type: "thought", text: "The user is asking about Abhiram. I'll query the knowledge base." });
      steps.push({ type: "action", text: 'kb("ai")' });
      steps.push({ type: "observation", text: "Abhiram builds RAG pipelines, Agentic AI workflows, OCR pipelines, and does LLM fine-tuning." });
      steps.push({ type: "final", text: "Abhiram specializes in Agentic AI and GenAI — RAG pipelines, agentic workflows, OCR, and LLM fine-tuning, on top of Go microservices. (Add a Groq key for the full live agent.)" });
    } else {
      steps.push({ type: "thought", text: "I'll reason directly about this goal." });
      steps.push({ type: "final", text: "In offline demo mode I can only handle math and Abhiram-facts. Add a free Groq API key to unlock the full tool-using agent." });
    }
    return steps;
  }

  // ---- wire up ----
  function init() {
    probe();
    document.querySelectorAll(".gcard").forEach((c) => c.addEventListener("click", () => open(c.dataset.game)));
    document.querySelectorAll("[data-close]").forEach((e) => e.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    form.addEventListener("submit", (e) => { e.preventDefault(); const v = inputEl.value; inputEl.value = ""; send(v); });
    restartBtn.addEventListener("click", restart);
    hintBtn.addEventListener("click", () => { if (state.game) bubble("msg--sys", esc(GAMES[state.game].hint)); });
  }

  return { init, probe, isReady: () => backendReady };
})();
