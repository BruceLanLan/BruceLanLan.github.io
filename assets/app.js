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
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => readColors());

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

  let pillar = "all";

  function render() {
    const t = T();
    root.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = lang === "zh" ? "BruceBlue 🌊 公开研究" : "BruceBlue 🌊 Research";
    document.querySelectorAll("[data-i]").forEach((el) => { el.textContent = t[el.dataset.i] ?? ""; });
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === lang));
    const h = document.querySelector(".h1a"), key = lang === "zh" ? "门电路" : "Logic gates";
    h.innerHTML = esc(t.h1a).replace(key, `<span class="hl">${key}</span>`);

    $("roles").innerHTML = S.roles[lang].map((r) => `<li>${esc(r)}</li>`).join("");

    const demos = S.projects.filter((p) => p.links.some((l) => l.demo)).length + S.lab.filter((l) => l.demo).length;
    const vals = [R.length, R.reduce((a, r) => a + r.stars, 0), L.tapPRs.length, merged, demos];
    $("stats").innerHTML = t.stats.map((l, i) => `<div><dt>${esc(l)}</dt><dd>${fmt(vals[i])}</dd></div>`).join("");

    // about
    $("about-body").innerHTML = S.about[lang].map((p) => `<p>${esc(p)}</p>`).join("");
    $("quotes").innerHTML = S.quotes.map((x) => {
      const showOrig = (lang === "en" && !x.origEn) || (lang === "zh" && x.origEn);
      return `<a class="quote reveal" href="${esc(x.url)}" target="_blank" rel="noopener"><q>${esc(x[lang])}</q>${showOrig ? `<span class="orig">${esc(lang === "en" ? x.zh : x.en)}</span>` : ""}<time>@BruceBlue · ${x.date}</time></a>`;
    }).join("");
    $("reads").innerHTML = S.reads.map((r) =>
      `<a class="read reveal" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="k">${r.kind}</span><span><b>${esc(r[lang])}</b><small>${r.date} · ${esc(t.readOnX)}</small></span></a>`).join("");

    // projects
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
      return `<a class="reveal" href="${esc(l.demo || r.url || S.github + "/" + l.repo)}" target="_blank" rel="noopener"><span class="ic">${esc(l.icon)}</span><span><b>${esc(l.repo)}</b><p>${esc(l[lang])}</p><span class="meta">★ ${r.stars ?? 0}${r.lang ? " · " + esc(r.lang) : ""}${l.demo ? " · demo ↗" : ""}</span></span></a>`;
    }).join("");

    $("timeline").innerHTML = R.slice(0, 8).map((r) =>
      `<li><time>${r.pushed}</time><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a><span>${esc(r.description || "—")}</span></li>`).join("");

    $("posts").innerHTML = S.posts.map((p) =>
      `<a class="post" href="${esc(p.url)}" target="_blank" rel="noopener"><div class="post-meta"><em>${esc(p.tag)}</em><span>${p.date}</span></div><q>${esc(p[lang])}</q>${lang === "en" ? `<span class="orig">${esc(p.zh)}</span>` : ""}</a>`).join("");

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
      <div class="card-top"><span class="ref">No. ${String(i + 1).padStart(2, "0")} · ${esc(S.pillars[p.pillar][lang])}</span><span class="status ${p.status === "draft" ? "draft" : ""}">${esc(st)}</span></div>
      <h3>${esc(c.t)}</h3><p>${esc(c.d)}</p>
      ${metrics ? `<div class="metrics">${metrics}</div>` : `<div style="margin-top:auto"></div>`}
      <div class="links">${links}${repo ? `<a class="src" href="${esc(repo.url)}#readme" target="_blank" rel="noopener">${esc(t.source)} · ${repo.pushed}</a>` : ""}</div></article>`;
  }

  /* ---------- NAND toy ---------- */
  const GATES = {
    NAND: { n: 1, f: (a, b) => !(a && b) }, NOT: { n: 1, f: (a) => !a, one: true },
    AND: { n: 2, f: (a, b) => a && b }, OR: { n: 3, f: (a, b) => a || b },
    NOR: { n: 4, f: (a, b) => !(a || b) }, XOR: { n: 4, f: (a, b) => a !== b },
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
    if (sw && !sw.disabled) { if (sw.dataset.in === "a") A = !A; else B = !B; stir(1.6); }
    if (gb) gate = gb.dataset.g;
    if (sw || gb) renderToy();
  });

  /* ---------- events ---------- */
  document.querySelector(".lang").onclick = (e) => { const l = e.target.dataset.lang; if (l && l !== lang) { lang = l; store.set("lang", l); render(); } };
  $("filters").onclick = (e) => { const k = e.target.dataset?.k; if (k) { pillar = k; render(); } };
  let buf = "";
  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input,textarea")) return;
    buf = (buf + (e.key || "")).slice(-4).toLowerCase();
    if (buf === "nand") { const el = $("toast"); el.textContent = T().konami; el.classList.add("show"); stir(3); setTimeout(() => el.classList.remove("show"), 2600); }
  });

  let io;
  function observeReveal() {
    if (reduced || !("IntersectionObserver" in window)) { document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")); return; }
    io = io || new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  /* ---------- 浪花：沿浪尖撒泡沫 ---------- */
  (function foam() {
    const path = document.querySelector(".w-mid"), g = $("foam");
    if (!path || !path.getTotalLength) return;
    const len = path.getTotalLength(), out = [];
    let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let s = 0; s < len; s += 6) {
      const p = path.getPointAtLength(s);
      if (p.y > 300 || p.x < 8 || p.x > 1432) continue;
      const crest = p.x > 600 && p.x < 1016 && p.y < 205;
      if (crest || (p.y < 280 && rnd() < 0.06)) {
        const r = crest ? 2 + rnd() * (p.y < 130 ? 7.5 : 4.5) : 1.4 + rnd() * 2;
        const cx = (p.x + (rnd() - 0.5) * 6).toFixed(1), cy = (p.y - r * 0.6).toFixed(1);
        // 泡沫里混进“过孔”：空心圆环
        out.push(crest && rnd() < 0.18 ? `<circle class="via-foam" cx="${cx}" cy="${cy}" r="${(r + 1.5).toFixed(1)}"/>` : `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}"/>`);
        if (crest && rnd() < 0.55) out.push(`<circle cx="${(p.x + (rnd() - 0.5) * 16).toFixed(1)}" cy="${(p.y - 7 - rnd() * 13).toFixed(1)}" r="${(1 + rnd() * 2.2).toFixed(1)}"/>`);
      }
    }
    g.innerHTML = out.join("");
  })();

  /* ---------- 星夜：漩涡粒子 + 星辰 + 粒子浪 ---------- */
  const cv = $("sky"), ctx = cv.getContext("2d"), hero = document.querySelector(".hero");
  let W = 0, H = 0, P = [], stars = [], vort = [], col = {}, light = false, t0 = 0, boost = 1;
  const mouse = { x: -9999, y: -9999, on: false };

  function readColors() {
    const cs = getComputedStyle(root), v = (n) => cs.getPropertyValue(n).trim();
    light = root.dataset.theme === "light" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: light)").matches);
    col = { bg: v("--bg"), bg2: v("--bg2"), blue: v("--blue"), deep: v("--blue-deep"), gold: v("--gold"), foam: v("--foam"), ink: v("--ink") };
    col.strokes = light ? ["#1f4fa3", "#3d6bc0", "#13306e", "#6a8cc9", "#a87a12"] : ["#2f5fbf", "#4c8dff", "#7fb0ff", "#a9c8ff", "#1f4fa3", "#f4c95d"];
    if (reduced) frame(0);
  }

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    vort = [
      { x: 0.66, y: 0.24, r: 0.2, s: 1 }, { x: 0.36, y: 0.14, r: 0.13, s: -1 },
      { x: 0.9, y: 0.48, r: 0.12, s: 1 }, { x: 0.12, y: 0.42, r: 0.11, s: -1 },
    ];
    const n = Math.round(Math.min(760, (W * H) / 1700));
    P = Array.from({ length: n }, () => spawn(rnd, true));
    stars = Array.from({ length: Math.max(6, Math.round(W / 140)) }, () => ({ x: rnd() * W, y: rnd() * H * 0.55, r: 1.2 + rnd() * 2.4, ph: rnd() * 6.28 }));
    stars.push({ x: W * 0.66, y: H * 0.24, r: 3.6, ph: 0, big: true });
  }
  function spawn(rnd = Math.random, init) {
    return { x: rnd() * W, y: rnd() * H * 0.72, tail: [], life: 80 + rnd() * 160, age: init ? rnd() * 200 : 0, c: Math.floor(rnd() * 6), w: 0.9 + rnd() * 2.6 };
  }
  function field(x, y, t) {
    let vx = 0.55, vy = 0.18 * Math.sin(y * 0.012 + t * 0.4) + 0.12 * Math.cos(x * 0.008 - t * 0.3);
    for (const v of vort) {
      const cx = v.x * W, cy = v.y * H, R = v.r * W, dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy, k = Math.exp(-d2 / (R * R)) * 2.4 * v.s;
      vx += -dy / (Math.sqrt(d2) + 1) * k; vy += dx / (Math.sqrt(d2) + 1) * k;
    }
    if (mouse.on) {
      const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy, k = Math.exp(-d2 / 9000) * 4;
      vx += -dy / (Math.sqrt(d2) + 1) * k; vy += dx / (Math.sqrt(d2) + 1) * k;
    }
    return [vx, vy];
  }
  function step(t) {
    for (let i = 0; i < P.length; i++) {
      const p = P[i], [vx, vy] = field(p.x, p.y, t);
      p.tail.push(p.x, p.y); if (p.tail.length > 16) p.tail.splice(0, 2);
      p.x += vx * 1.25 * boost; p.y += vy * 1.25 * boost; p.age++;
      if (p.age > p.life || p.x > W + 20 || p.x < -20 || p.y < -20 || p.y > H * 0.78) P[i] = spawn();
    }
  }
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    // 漩涡的晕光
    for (const v of vort) {
      const g = ctx.createRadialGradient(v.x * W, v.y * H, 0, v.x * W, v.y * H, v.r * W * 1.2);
      g.addColorStop(0, light ? "rgba(31,79,163,.08)" : "rgba(76,141,255,.10)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // 笔触粒子（梵高式短笔触）
    ctx.lineCap = "round";
    for (const p of P) {
      const a = Math.min(1, p.age / 20) * Math.min(1, (p.life - p.age) / 30);
      if (a <= 0 || p.tail.length < 4) continue;
      // 厚涂：一笔底色 + 一笔偏移的高光，像油画颜料的棱
      ctx.globalAlpha = a * (light ? 0.6 : 0.75);
      ctx.strokeStyle = col.strokes[p.c % col.strokes.length]; ctx.lineWidth = p.w;
      ctx.beginPath(); ctx.moveTo(p.tail[0], p.tail[1]);
      for (let k = 2; k < p.tail.length; k += 2) ctx.lineTo(p.tail[k], p.tail[k + 1]);
      ctx.lineTo(p.x, p.y); ctx.stroke();
      if (p.w > 1.6) {
        ctx.globalAlpha = a * (light ? 0.35 : 0.3);
        ctx.strokeStyle = light ? "#fbf8f1" : "#dce8ff"; ctx.lineWidth = p.w * 0.35;
        ctx.beginPath(); ctx.moveTo(p.tail[0] - 0.7, p.tail[1] - 0.7);
        for (let k = 2; k < p.tail.length; k += 2) ctx.lineTo(p.tail[k] - 0.7, p.tail[k + 1] - 0.7);
        ctx.stroke();
      }
    }
    // 神经网络星座：相近的星连线，信号沿线流动
    ctx.globalAlpha = 1; ctx.lineWidth = 0.8;
    for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) {
      const s1 = stars[i], s2 = stars[j], d = Math.hypot(s1.x - s2.x, s1.y - s2.y);
      if (d > 300) continue;
      ctx.strokeStyle = col.gold; ctx.globalAlpha = (1 - d / 300) * (light ? 0.35 : 0.28);
      ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
      const f = ((t * 0.25 + (i * 7 + j * 3) * 0.13) % 1);
      ctx.globalAlpha = (1 - d / 300) * 0.9; ctx.fillStyle = col.gold;
      ctx.beginPath(); ctx.arc(s1.x + (s2.x - s1.x) * f, s1.y + (s2.y - s1.y) * f, 1.4, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 星辰与光环
    for (const s of stars) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 1.4 + s.ph);
      const R = s.big ? 46 : s.r * 7;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
      g.addColorStop(0, light ? "rgba(168,122,18,.35)" : "rgba(255,226,140,.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 6.29); ctx.fill();
      ctx.strokeStyle = col.gold; ctx.globalAlpha = 0.25 * pulse; ctx.lineWidth = 1;
      for (let k = 1; k <= (s.big ? 3 : 1); k++) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3 + k * (s.big ? 9 : 5) + pulse * 2, 0, 6.29); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = col.gold; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.85 + 0.15 * pulse), 0, 6.29); ctx.fill();
    }
    // 月牙
    const mx = W * 0.9, my = Math.min(90, H * 0.12), mr = Math.max(16, Math.min(26, W * 0.018));
    const mg = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 4);
    mg.addColorStop(0, light ? "rgba(168,122,18,.25)" : "rgba(255,226,140,.35)"); mg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, 6.29); ctx.fill();
    ctx.fillStyle = col.gold; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.29); ctx.fill();
    ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(mx - mr * 0.45, my - mr * 0.25, mr * 0.88, 0, 6.29); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // 粒子浪
    const top = H * 0.5, cols = Math.round(W / 12), rows = 10;
    for (let r = 0; r < rows; r++) {
      const depth = r / (rows - 1), baseY = top + depth * (H * 0.3);
      for (let c = 0; c <= cols; c++) {
        const x = (c / cols) * W;
        let y = baseY + Math.sin(x * 0.006 + t * 0.9 + r * 0.55) * (16 + depth * 10) + Math.sin(x * 0.017 - t * 1.3 + r) * 6;
        const dx = x - mouse.x, dy = baseY - mouse.y, md = Math.exp(-(dx * dx + dy * dy) / 14000);
        y -= md * 26 * Math.sin(t * 6 - Math.sqrt(dx * dx + dy * dy) * 0.05);
        const crest = Math.max(0, Math.sin(x * 0.006 + t * 0.9 + r * 0.55));
        ctx.globalAlpha = (0.25 + depth * 0.55) * (light ? 0.8 : 1);
        ctx.fillStyle = crest > 0.85 && r < 6 ? col.foam : depth > 0.5 ? col.deep : col.blue;
        ctx.beginPath(); ctx.arc(x, y, 0.8 + depth * 1.6 + crest * 0.8 + md * 1.5, 0, 6.29); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  let running = false, visible = true, last = 0;
  function loop(ts) {
    const t = ts / 1000;
    if (!t0) t0 = t;
    step(t - t0); frame(t - t0);
    boost += (1 - boost) * 0.03;
    if (running) requestAnimationFrame(loop);
  }
  function start() { if (!running && !reduced && visible && !document.hidden) { running = true; requestAnimationFrame(loop); } }
  function stop() { running = false; }
  function stir(k) { boost = k; }
  hero.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true; }, { passive: true });
  hero.addEventListener("pointerleave", () => { mouse.on = false; mouse.x = mouse.y = -9999; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduced) { for (let i = 0; i < 80; i++) step(i / 30); frame(2); } }, 150); });

  render(); readColors(); build();
  if (reduced) { for (let i = 0; i < 80; i++) step(i / 30); frame(2); } else start();
})();
