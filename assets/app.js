(() => {
  const S = window.SITE, L = window.LIVE || { repos: [], tapPRs: [], tapIssues: [] };
  const R = L.repos;
  const byName = Object.fromEntries(R.map((r) => [r.name, r]));
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- language ---------- */
  const q = new URLSearchParams(location.search).get("lang");
  let lang = q === "en" || q === "zh" ? q : store.get("lang") || ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
  const T = () => S.ui[lang];
  const pick = (o) => (o && (o[lang] ?? o.zh)) || "";

  /* ---------- theme ---------- */
  const savedTheme = store.get("theme");
  if (savedTheme) root.dataset.theme = savedTheme;
  $("theme").onclick = () => {
    const isLight = root.dataset.theme ? root.dataset.theme === "light" : matchMedia("(prefers-color-scheme: light)").matches;
    root.dataset.theme = isLight ? "dark" : "light";
    store.set("theme", root.dataset.theme);
    readColors();
  };

  /* ---------- static links ---------- */
  $("x-link").href = $("x-more").href = S.x;
  $("gh-link").href = S.github;
  $("synced").textContent = L.synced || "—";

  /* ---------- TAP data ---------- */
  const drafts = L.tapPRs.filter((p) => /^TAP-draft:/i.test(p.t)).map((p) => {
    const m = p.t.match(/\(([^)]*)\)\s*$/);
    const cat = (m && (m[1].match(/Standards|Application|Information/) || [])[0]) || "Service";
    return { ...p, cat, name: p.t.replace(/^TAP-draft:\s*/i, "").replace(/\s*\([^)]*\)\s*$/, "") };
  });
  const edits = L.tapPRs.length - drafts.length;
  const merged = L.tapPRs.filter((p) => p.s === "MERGED").length;

  /* ---------- project filter ---------- */
  let pillar = "all";

  function render() {
    const t = T();
    root.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = lang === "zh" ? "BruceBlue · 公开研究" : "BruceBlue · Research";
    document.querySelectorAll("[data-i]").forEach((el) => { el.textContent = t[el.dataset.i] ?? ""; });
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === lang));
    // headline highlight
    const h = document.querySelector(".h1a");
    const key = lang === "zh" ? "门电路" : "Logic gates";
    h.innerHTML = esc(t.h1a).replace(key, `<span class="hl">${key}</span>`);

    $("roles").innerHTML = S.roles[lang].map((r) => `<li>${esc(r)}</li>`).join("");

    // stats
    const demos = S.projects.filter((p) => p.links.some((l) => l.demo)).length + S.lab.filter((l) => l.demo).length;
    const vals = [R.length, R.reduce((a, r) => a + r.stars, 0), L.tapPRs.length, merged, demos];
    $("stats").innerHTML = t.stats.map((l, i) => `<div><dt>${esc(l)}</dt><dd data-n="${vals[i]}">${fmt(vals[i])}</dd></div>`).join("");

    // filters + projects
    const tabs = [["all", t.all], ...Object.entries(S.pillars).map(([k, v]) => [k, v[lang]])];
    $("filters").innerHTML = tabs.map(([k, n]) => `<button role="tab" data-k="${k}" aria-selected="${k === pillar}">${esc(n)}</button>`).join("");
    $("projects").innerHTML = S.projects.filter((p) => pillar === "all" || p.pillar === pillar).map((p, i) => card(p, i)).join("");

    // TAP map
    const order = ["Service", "Standards", "Application", "Information"];
    $("taps-summary").innerHTML =
      `<span><b>${drafts.length}</b>${esc(t.tapsDrafts)}</span><span><b>${edits}</b>${esc(t.tapsEdits)}</span><span><b>${L.tapIssues.length}</b>${esc(t.tapsIdeas)}</span>` +
      `<span class="legend">${["MERGED", "OPEN", "CLOSED"].map((s) => `<span><i class="dot ${s}"></i>${esc(t.tapsLegend[s])}</span>`).join("")}</span>`;
    $("taps-map").innerHTML = `<div class="die">` + order.filter((g) => drafts.some((d) => d.cat === g)).map((g) =>
      `<div class="die-group"><h4>${esc(t.tapsGroups[g])} · ${drafts.filter((d) => d.cat === g).length}</h4><div class="cells">` +
      drafts.filter((d) => d.cat === g).map((d) =>
        `<a class="cell ${d.s}" href="${esc(d.u)}" target="_blank" rel="noopener" title="${esc(t.tapsLegend[d.s])}"><i class="dot ${d.s}"></i><span>${esc(d.name)}<small>#${d.n} · ${d.d}</small></span></a>`
      ).join("") + `</div></div>`).join("") + (t.tapsNote ? `<p class="silk" style="margin:14px 0 0">${esc(t.tapsNote)}</p>` : "") + `</div>`;

    // lab
    $("lab-grid").innerHTML = S.lab.map((l) => {
      const r = byName[l.repo] || {};
      return `<a href="${esc(l.demo || r.url || S.github + "/" + l.repo)}" target="_blank" rel="noopener"><span class="ic">${esc(l.icon)}</span><span><b>${esc(l.repo)}</b><p>${esc(l[lang])}</p><span class="meta">★ ${r.stars ?? 0}${r.lang ? " · " + esc(r.lang) : ""}${l.demo ? " · demo ↗" : ""}</span></span></a>`;
    }).join("");

    // timeline
    $("timeline").innerHTML = R.slice(0, 8).map((r) =>
      `<li><time>${r.pushed}</time><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a><span>${esc(r.description || "—")}</span></li>`).join("");

    // posts
    $("posts").innerHTML = S.posts.map((p) =>
      `<a class="post" href="${esc(p.url)}" target="_blank" rel="noopener"><div class="post-meta"><em>${esc(p.tag)}</em><span>${p.date}</span></div><q>${esc(p[lang])}</q>${lang === "en" ? `<span class="orig">${esc(p.zh)}</span>` : ""}</a>`).join("");

    // all repos
    $("repo-count").textContent = R.length;
    $("repos").innerHTML = [...R].sort((a, b) => b.stars - a.stars).map((r) =>
      `<a class="repo" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="rn">${esc(r.name)}</span><span class="rs">★ ${r.stars}${r.lang ? " · " + esc(r.lang) : ""}</span><span class="rd">${esc(r.description || "—")}</span></a>`).join("");

    renderToy();
    observeReveal();
  }

  function card(p, i) {
    const t = T(), c = p[lang], repo = byName[p.repo];
    const metrics = p.metrics.map((m) => `<div><b>${esc(m.live === "stars" && repo ? fmt(repo.stars) : m.v)}</b><span>${esc(m[lang])}</span></div>`).join("");
    const st = S.statusText[p.status] ? pick(S.statusText[p.status]) : p.status;
    const links = p.links.map((l) => `<a class="${l.demo ? "demo" : ""}" href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.demo ? t.openDemo + " ↗" : pick(l))}</a>`).join("")
      + (repo ? `<a href="${esc(repo.url)}" target="_blank" rel="noopener">${esc(t.repo)}</a>` : "");
    return `<article class="card reveal" style="--pc:var(--c-${p.pillar})">
      <div class="card-top"><span class="ref">U1.${String(i + 1).padStart(2, "0")} · ${esc(S.pillars[p.pillar][lang])}</span><span class="status ${p.status === "draft" ? "draft" : ""}">${esc(st)}</span></div>
      <h3>${esc(c.t)}</h3><p>${esc(c.d)}</p>
      ${metrics ? `<div class="metrics">${metrics}</div>` : `<div style="margin-top:auto"></div>`}
      <div class="links">${links}${repo ? `<span class="src">${esc(t.source)} · ${repo.pushed}</span>` : ""}</div></article>`;
  }

  /* ---------- NAND toy ---------- */
  const GATES = {
    NAND: { n: 1, f: (a, b) => !(a && b) },
    NOT: { n: 1, f: (a) => !a, one: true },
    AND: { n: 2, f: (a, b) => a && b },
    OR: { n: 3, f: (a, b) => a || b },
    NOR: { n: 4, f: (a, b) => !(a || b) },
    XOR: { n: 4, f: (a, b) => a !== b },
  };
  let gate = "NAND", A = false, B = false;
  function renderToy() {
    const g = GATES[gate], out = !!g.f(A, B);
    $("gates").innerHTML = Object.keys(GATES).map((k) => `<button role="tab" data-g="${k}" aria-selected="${k === gate}">${k}</button>`).join("");
    $("gate-name").textContent = gate;
    $("gate-count").textContent = `= ${g.n} ${T().toyNands}`;
    document.querySelector('[data-in="a"]').setAttribute("aria-pressed", A);
    const bBtn = document.querySelector('[data-in="b"]');
    bBtn.setAttribute("aria-pressed", B && !g.one); bBtn.style.opacity = g.one ? 0.3 : 1; bBtn.disabled = !!g.one;
    $("wire-a").classList.toggle("on", A);
    $("wire-b").classList.toggle("on", B && !g.one);
    $("wire-o").classList.toggle("on", out);
    $("lamp").classList.toggle("on", out);
    const rows = g.one ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
    $("truth").innerHTML = `<tr><th>A</th>${g.one ? "" : "<th>B</th>"}<th>${esc(T().toyOut)}</th></tr>` + rows.map((r) => {
      const cur = r[0] === +A && (g.one || r[1] === +B);
      return `<tr class="${cur ? "cur" : ""}">${r.map((v) => `<td>${v}</td>`).join("")}<td>${+!!g.f(!!r[0], !!r[1])}</td></tr>`;
    }).join("");
  }
  document.querySelector(".toy").addEventListener("click", (e) => {
    const sw = e.target.closest("[data-in]"), gb = e.target.closest("[data-g]");
    if (sw && !sw.disabled) { if (sw.dataset.in === "a") A = !A; else B = !B; pulse(); }
    if (gb) gate = gb.dataset.g;
    if (sw || gb) renderToy();
  });

  /* ---------- events ---------- */
  document.querySelector(".lang").onclick = (e) => { const l = e.target.dataset.lang; if (l && l !== lang) { lang = l; store.set("lang", l); render(); } };
  $("filters").onclick = (e) => { const k = e.target.dataset?.k; if (k) { pillar = k; render(); } };

  // 彩蛋：键入 nand
  let buf = "";
  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input,textarea")) return;
    buf = (buf + (e.key || "")).slice(-4).toLowerCase();
    if (buf === "nand") { const el = $("toast"); el.textContent = T().konami; el.classList.add("show"); burst(); setTimeout(() => el.classList.remove("show"), 2600); }
  });

  /* ---------- reveal on scroll ---------- */
  let io;
  function observeReveal() {
    if (reduced || !("IntersectionObserver" in window)) { document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")); return; }
    io = io || new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  /* ---------- circuit traces background ---------- */
  const cv = $("traces"), ctx = cv.getContext("2d");
  let W = 0, H = 0, traces = [], pulses = [], col = {};
  function readColors() {
    const cs = getComputedStyle(root);
    col = { line: cs.getPropertyValue("--line").trim(), signal: cs.getPropertyValue("--signal").trim(), copper: cs.getPropertyValue("--copper").trim() };
    if (reduced) draw();
  }
  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const G = 24, n = Math.round(W / 70);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    traces = [];
    for (let i = 0; i < n; i++) {
      let x = Math.round((rnd() * W) / G) * G, y = Math.round((rnd() * H * 0.9) / G) * G;
      const pts = [[x, y]];
      let dir = rnd() < 0.5 ? 0 : 1;
      for (let s = 0; s < 4; s++) {
        const len = (2 + Math.floor(rnd() * 7)) * G;
        if (dir === 0) x += rnd() < 0.5 ? len : -len; else y += len;
        pts.push([x, y]); dir = 1 - dir;
      }
      let total = 0; const seg = [];
      for (let k = 1; k < pts.length; k++) { const d = Math.abs(pts[k][0] - pts[k - 1][0]) + Math.abs(pts[k][1] - pts[k - 1][1]); seg.push(d); total += d; }
      traces.push({ pts, seg, total });
    }
    pulses = traces.map((t, i) => ({ t: i, p: rnd() * t.total, v: 40 + rnd() * 60 }));
  }
  function at(tr, d) {
    for (let k = 0; k < tr.seg.length; k++) {
      if (d <= tr.seg[k]) { const [x0, y0] = tr.pts[k], [x1, y1] = tr.pts[k + 1], f = d / tr.seg[k]; return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]; }
      d -= tr.seg[k];
    }
    return tr.pts[tr.pts.length - 1];
  }
  let mx = -999, my = -999;
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY + scrollY; }, { passive: true });
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1.5; ctx.strokeStyle = col.line; ctx.fillStyle = col.line;
    for (const tr of traces) {
      ctx.beginPath(); tr.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      for (const [x, y] of [tr.pts[0], tr.pts[tr.pts.length - 1]]) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.stroke(); }
    }
    for (const pu of pulses) {
      const tr = traces[pu.t], [x, y] = at(tr, pu.p);
      const near = Math.hypot(x - mx, y - my) < 140;
      ctx.shadowBlur = near ? 18 : 10; ctx.shadowColor = near ? col.copper : col.signal; ctx.fillStyle = near ? col.copper : col.signal;
      ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x, y, near ? 3.2 : 2.2, 0, 7); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  let last = 0, running = true;
  function loop(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
    for (const pu of pulses) { const near = traces[pu.t] && Math.hypot(...at(traces[pu.t], pu.p).map((v, i) => v - (i ? my : mx))) < 140; pu.p = (pu.p + pu.v * dt * (near ? 3 : 1)) % traces[pu.t].total; }
    draw();
    if (running) requestAnimationFrame(loop);
  }
  function pulse() { for (const pu of pulses) pu.v *= 2.2; setTimeout(() => pulses.forEach((pu) => (pu.v /= 2.2)), 500); }
  function burst() { pulse(); }
  document.addEventListener("visibilitychange", () => { const vis = !document.hidden; if (vis && !running && !reduced) { running = true; requestAnimationFrame((t) => { last = t; loop(t); }); } else running = vis; });
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduced) draw(); }, 150); });

  readColors(); build(); render();
  if (reduced) draw(); else requestAnimationFrame((t) => { last = t; loop(t); });
})();
