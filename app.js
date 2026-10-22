// ============================================================
//  app.js: site chrome. Mobile menu, active nav, arcade start,
//  backend status badge, footer year.
// ============================================================

/* ---------- Arcade + backend badge ---------- */
(function start() {
  Arcade.init();
  const badge = document.getElementById("backendState");
  if (!badge) return;
  Arcade.probe().then((ready) => {
    if (ready) { badge.textContent = "Live LLM backend connected"; badge.classList.add("ok"); }
    else { badge.textContent = "Offline demo mode (no LLM key configured)"; badge.classList.add("off"); }
  });
})();

/* ---------- Mobile menu ---------- */
(function mobileMenu() {
  const t = document.getElementById("navToggle");
  const l = document.getElementById("navLinks");
  if (!t || !l) return;
  const set = (open) => {
    l.classList.toggle("open", open);
    t.setAttribute("aria-expanded", String(open));
    t.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  t.addEventListener("click", () => set(!l.classList.contains("open")));
  l.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
})();

/* ---------- Active section in nav ---------- */
(function activeNav() {
  const links = [...document.querySelectorAll(".nav__links a")];
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove("active"));
      map.get(e.target.id)?.classList.add("active");
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
})();

/* ---------- Year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
