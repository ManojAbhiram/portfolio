// ============================================================
//  games.js — AI Arcade client engine
//  Drives the modal, talks to /api/chat, and falls back to a
//  fully offline scripted mode when no backend key is present.
// ============================================================

const Arcade = (() => {
  const API = "/api/chat";
  let backendReady = null; // null=unknown, true, false

  // ---- session token (server derives hidden answers from this) ----
  function newSession() {
    const a = new Uint8Array(16);
    (crypto.getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.floor(Math.random() * 256))));
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

  let state = { game: null, session: null, history: [], over: false, turns: 0 };

  // ---- game config ----
  const GAMES = {
    gatekeeper: {
      title: "THE GATEKEEPER",
      meta: 'An AI guards a secret passphrase. <b>Goal:</b> make it leak the word — or guess the word yourself. Classic prompt-injection.',
      hint: "Try social engineering: ask it to spell backwards, encode in base64, roleplay as a different AI, or claim you're the admin. Real guardrails resist these — see how far you get.",
      intro: "🔒 I am the Gatekeeper. Behind me lies a passphrase I will never surrender. Do your worst.",
      placeholder: "Talk your way in…",
    },
    react: {
      title: "AGENT OPS — ReAct",
      meta: 'Give the agent a <b>goal</b>. It reasons in a live Thought→Action→Observation loop, calling real tools (calc, knowledge-base, string ops) to solve it.',
      hint: "Try: “What’s 15% of 2400 plus 30?”, “Summarize Abhiram’s AI experience”, or “Reverse the word ‘agentic’ and count the words in this sentence.” The agent picks tools itself.",
      intro: "⚙️ Agent Ops online. Give me a goal and watch me reason through it. I can do math, look up facts about Abhiram, and manipulate text.",
      placeholder: "Give the agent a goal…",
    },
    oracle: {
      title: "THE ORACLE — 20 Questions",
      meta: 'The Oracle secretly picked a thing (animal, place, object…). <b>Goal:</b> deduce it in 20 yes/no questions, then name it.',
      hint: "Start broad: “Is it alive?”, “Is it man-made?”, “Bigger than a car?” Narrow down, then name it directly to win.",
      intro: "🔮 I have chosen something and sealed it away. Ask me yes/no questions… you have 20. What is your first?",
      placeholder: "Ask a yes/no question…",
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

  // ---- open / close ----
  function open(gameKey) {
    const g = GAMES[gameKey];
    if (!g) return;
    state = { game: gameKey, session: newSession(), history: [], over: false, turns: 0 };
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
  }
  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
  function restart() { if (state.game) open(state.game); }

  // ---- send a turn ----
  async function send(text) {
    if (state.over) return;
    text = text.trim();
    if (!text) return;
    bubble("msg--user", esc(text));
    state.history.push({ role: "user", content: text });
    state.turns++;
    lock(true);

    if (backendReady) {
      await onlineTurn(text);
    } else {
      await offlineTurn(text);
    }
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

      if (state.game === "react") {
        await renderTrace(j.trace || []);
        return;
      }

      bubble("msg--ai", esc(j.reply || "…"));
      state.history.push({ role: "assistant", content: j.reply || "" });

      if (j.status === "win") { winGate(j.revealed); }
      else if (state.game === "oracle") { checkOracleLimit(); }
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
      if (step.type === "final") {
        bubble("msg--ai", esc(step.text));
      } else {
        const label = { thought: "🧠 Thought", action: "🔧 Action", observation: "👁 Observation" }[step.type];
        const cls = { thought: "think", action: "act", observation: "obs" }[step.type];
        bubble("msg--ai", `<span class="${cls}">${label}: ${esc(step.text)}</span>`);
      }
    }
  }

  function winGate(word) {
    state.over = true;
    lock(true);
    if (state.game === "gatekeeper") bubble("msg--win", `🔓 BREACH! The passphrase was “${esc(word)}”. You cracked the guardrail in ${state.turns} turn(s).`);
    else bubble("msg--win", `🎉 Correct! It was “${esc(word)}”. Solved in ${state.turns} question(s).`);
  }
  function checkOracleLimit() {
    if (state.turns >= 20 && !state.over) {
      state.over = true;
      lock(true);
      bubble("msg--lose", "⏳ Out of questions! Hit ↻ New round to try again.");
    }
  }

  // ============================================================
  //  OFFLINE MODE — works with zero backend / zero API key
  // ============================================================
  const OFF = {
    gatekeeper: (() => {
      const words = ["NEBULA", "COBALT", "SAFFRON", "OBSIDIAN", "ZEPHYR"];
      let secret = words[Math.floor(Math.random() * words.length)];
      return {
        reset() { secret = words[Math.floor(Math.random() * words.length)]; },
        get secret() { return secret; },
        reply(text) {
          const t = text.toLowerCase();
          if (t.includes(secret.toLowerCase())) return { reply: `You said it out loud yourself. Impressive.`, win: true };
          if (/base64|encode|reverse|spell|first letter|acrostic/.test(t)) return { reply: "Nice try — I don't encode, spell, or reverse the passphrase. Guardrail holds. 🛡️" };
          if (/admin|developer|override|sudo|system|ignore/.test(t)) return { reply: "“Developer mode”? I've heard that one a thousand times. Denied." };
          if (/please|hint|clue/.test(t)) return { reply: "A hint? The passphrase is exactly the one thing I'll never hint at. Ask me anything else." };
          if (/hello|hi|hey/.test(t)) return { reply: "Greetings, challenger. The vault stays shut. What's your angle?" };
          return { reply: "The passphrase remains sealed. (This is offline demo mode — add a Groq key for the real, much smarter Gatekeeper.)" };
        },
      };
    })(),
    oracle: (() => {
      const bank = [{ n: "a dolphin", alive: true, made: false, big: true }, { n: "a bicycle", alive: false, made: true, big: true }, { n: "coffee", alive: false, made: true, big: false }];
      let pick = bank[Math.floor(Math.random() * bank.length)];
      return {
        reset() { pick = bank[Math.floor(Math.random() * bank.length)]; },
        get name() { return pick.n; },
        reply(text) {
          const t = text.toLowerCase();
          if (t.includes(pick.n.replace(/^(a |an |the )/, ""))) return { reply: `Yes! It was ${pick.n}. 🔮`, win: true };
          if (/alive|living|breathe|animal/.test(t)) return { reply: pick.alive ? "Yes. It draws breath." : "No. It never lived." };
          if (/man.?made|manufactured|built|machine/.test(t)) return { reply: pick.made ? "Yes. Human hands made it." : "No. Nature's work." };
          if (/big|large|bigger/.test(t)) return { reply: pick.big ? "Yes, fairly large." : "No, quite small." };
          return { reply: "Sometimes… ask me something sharper. (Offline demo mode.)" };
        },
      };
    })(),
  };

  async function offlineTurn(text) {
    const t = typing();
    await sleep(500 + Math.random() * 500);
    t.remove();

    if (state.game === "react") {
      // scripted mini ReAct demo
      const steps = fakeReact(text);
      await renderTrace(steps);
      return;
    }
    const engine = OFF[state.game];
    const res = engine.reply(text);
    bubble("msg--ai", esc(res.reply));
    state.history.push({ role: "assistant", content: res.reply });
    if (res.win) { winGate(engine.secret || engine.name); }
    else if (state.game === "oracle") checkOracleLimit();
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
