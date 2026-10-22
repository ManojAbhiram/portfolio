// ============================================================
//  app.js — site chrome: boot loader, cursor, bg canvas,
//  scroll reveals, stat counters, nav behavior.
// ============================================================

/* ---------- Boot loader ---------- */
(function boot() {
  const el = document.getElementById("bootLog");
  const bar = document.getElementById("bootBar");
  const wrap = document.getElementById("boot");
  const lines = [
    "> init portfolio.kernel …",
    "> loading modules: backend, genai, arcade …",
    "> mounting AI arcade [ gatekeeper · agent-ops · oracle ]",
    "> establishing secure link …",
    "> ready. welcome.",
  ];
  let i = 0, pct = 0;
  function step() {
    if (i < lines.length) {
      el.textContent += lines[i] + "\n";
      i++;
      pct = Math.min(100, Math.round((i / lines.length) * 100));
      bar.style.width = pct + "%";
      setTimeout(step, 260 + Math.random() * 160);
    } else {
      bar.style.width = "100%";
      setTimeout(() => {
        wrap.classList.add("done");
        document.body.style.overflow = "";
        launch();
      }, 380);
    }
  }
  document.body.style.overflow = "hidden";
  // skip on reduced motion
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    wrap.classList.add("done");
    document.body.style.overflow = "";
    launch();
  } else {
    setTimeout(step, 300);
  }
})();

/* ---------- Everything that runs after boot ---------- */
function launch() {
  revealHero();
  Arcade.init();
}

/* ---------- Hero line reveal + backend badge ---------- */
function revealHero() {
  document.querySelectorAll(".hero__title .reveal").forEach((r, i) => {
    setTimeout(() => r.classList.add("in"), 120 + i * 130);
  });
  // backend state badge
  const badge = document.getElementById("backendState");
  if (badge) {
    Arcade.probe().then((ready) => {
      if (ready) { badge.textContent = "● Live LLM backend connected"; badge.classList.add("ok"); }
      else { badge.textContent = "● Offline demo mode (add a Groq key to go live)"; badge.classList.add("off"); }
    });
  }
}

/* ---------- Custom cursor ---------- */
(function cursor() {
  const c = document.getElementById("cursor");
  if (!c || matchMedia("(pointer: coarse)").matches) { if (c) c.style.display = "none"; return; }
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; });
  function loop() {
    cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
    c.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  }
  loop();
  const hot = "a,button,.gcard,.proj,input,[tabindex]";
  addEventListener("mouseover", (e) => { if (e.target.closest(hot)) c.classList.add("is-hot"); });
  addEventListener("mouseout", (e) => { if (e.target.closest(hot)) c.classList.remove("is-hot"); });
})();

/* ---------- Background canvas: drifting constellation ---------- */
(function bg() {
  const cvs = document.getElementById("bg");
  if (!cvs || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cvs.getContext("2d");
  let w, h, pts, raf;
  const COUNT = Math.min(70, Math.floor((innerWidth * innerHeight) / 22000));
  function resize() {
    w = cvs.width = innerWidth * devicePixelRatio;
    h = cvs.height = innerHeight * devicePixelRatio;
    cvs.style.width = innerWidth + "px";
    cvs.style.height = innerHeight + "px";
    pts = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.25 * devicePixelRatio,
    }));
  }
  let mx = -9999, my = -9999;
  addEventListener("mousemove", (e) => { mx = e.clientX * devicePixelRatio; my = e.clientY * devicePixelRatio; });
  function frame() {
    ctx.clearRect(0, 0, w, h);
    const R = 130 * devicePixelRatio;
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.3 * devicePixelRatio, 0, 7);
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fill();
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < R) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255,176,32,${0.14 * (1 - d / R)})`;
          ctx.lineWidth = devicePixelRatio * 0.6;
          ctx.stroke();
        }
      }
      // mouse links
      const dm = Math.hypot(pts[i].x - mx, pts[i].y - my);
      if (dm < R * 1.4) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(mx, my);
        ctx.strokeStyle = `rgba(74,217,255,${0.18 * (1 - dm / (R * 1.4))})`;
        ctx.lineWidth = devicePixelRatio * 0.7;
        ctx.stroke();
      }
    }
    raf = requestAnimationFrame(frame);
  }
  resize();
  addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); frame(); });
  frame();
})();

/* ---------- Scroll reveals ---------- */
(function reveals() {
  const targets = document.querySelectorAll(".section__head, .work__list li, .proj, .gcard, .stack__col, .certs, .hero__stats .stat");
  targets.forEach((t) => t.setAttribute("data-reveal", ""));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  targets.forEach((t) => io.observe(t));
})();

/* ---------- Stat counters ---------- */
(function counters() {
  const nums = document.querySelectorAll(".stat__n[data-count]");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      let cur = 0;
      const dur = 1400, t0 = performance.now();
      function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  nums.forEach((n) => io.observe(n));
})();

/* ---------- Project card spotlight ---------- */
(function spotlight() {
  document.querySelectorAll(".proj").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
})();

/* ---------- Nav show/hide + scrolled state ---------- */
(function nav() {
  const n = document.getElementById("nav");
  let last = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    n.classList.toggle("scrolled", y > 40);
    if (y > last && y > 400) n.classList.add("hide");
    else n.classList.remove("hide");
    last = y;
  }, { passive: true });
})();

/* ---------- Year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
