(() => {
  const $ = (id) => document.getElementById(id);

  // ---- theme (auto follows OS/app; button cycles auto → light → dark) ----
  const root = document.documentElement, mq = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : mq.matches);
  const themeBtn = $("theme");
  const showTheme = () => { themeBtn.textContent = { light: "☀︎ light", dark: "☾ dark" }[root.dataset.theme] || "◐ auto"; };

  // ---- Mermaid (loaded from /vendor, falling back to CDN) ----
  const diagrams = [...document.querySelectorAll("pre.mermaid")].map((el) => [el, el.textContent]);
  let tries = 0, rendered = false;
  const renderMermaid = () => {
    if (!diagrams.length) return;
    if (!window.mermaid) { if (tries++ < 100) setTimeout(renderMermaid, 100); return; }
    for (const [el, src] of diagrams) { el.removeAttribute("data-processed"); el.textContent = src; }
    window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: isDark() ? "dark" : "default" });
    window.mermaid.run({ nodes: diagrams.map(([el]) => el) }).catch(() => {});
    rendered = true;
  };
  renderMermaid();
  const themeChanged = () => { showTheme(); if (rendered) renderMermaid(); };
  themeBtn.onclick = () => {
    const next = { "": "light", light: "dark", dark: "" }[root.dataset.theme || ""];
    if (next) root.dataset.theme = next; else delete root.dataset.theme;
    themeChanged();
  };
  mq.addEventListener("change", () => { if (!root.dataset.theme) themeChanged(); });
  showTheme();

  // ---- changes-only toggle ----
  const only = $("only");
  only.addEventListener("change", () => document.body.classList.toggle("only", only.checked));

  // ---- change navigation ----
  const changes = [...document.querySelectorAll("[data-chg]")];
  let ci = -1;
  const goChange = (d) => {
    if (!changes.length) { $("ccount").textContent = "none"; return; }
    if (ci >= 0) changes[ci].classList.remove("cur");
    ci = (ci + d + changes.length) % changes.length;
    changes[ci].classList.add("cur");
    changes[ci].scrollIntoView({ block: "center" });
    $("ccount").textContent = `${ci + 1} / ${changes.length}`;
  };
  $("cp").onclick = () => goChange(-1);
  $("cn").onclick = () => goChange(1);
  $("ccount").textContent = changes.length ? `${changes.length}` : "none";

  // ---- search ----
  const q = $("q"), cnt = $("qcount");
  let hits = [], cur = -1, timer;
  const clear = () => {
    document.querySelectorAll("mark.hit").forEach((m) => { const p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); });
    hits = []; cur = -1;
  };
  const run = () => {
    timer = null;
    clear();
    const term = q.value.trim().toLowerCase();
    if (term.length < 2) { cnt.textContent = ""; return; }
    const walker = document.createTreeWalker(document.querySelector("main"), NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest("script,style,svg") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const t = n.nodeValue, lt = t.toLowerCase();
      let i = lt.indexOf(term);
      if (i < 0) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      while (i >= 0) {
        frag.append(t.slice(last, i));
        const m = document.createElement("mark");
        m.className = "hit"; m.textContent = t.slice(i, i + term.length);
        frag.append(m); hits.push(m);
        last = i + term.length; i = lt.indexOf(term, last);
      }
      frag.append(t.slice(last));
      n.parentNode.replaceChild(frag, n);
    }
    go(1);
  };
  const go = (d) => {
    if (!hits.length) { cnt.textContent = q.value.trim().length > 1 ? "no matches" : ""; return; }
    if (cur >= 0) hits[cur].classList.remove("cur");
    cur = (cur + d + hits.length) % hits.length;
    const h = hits[cur];
    h.classList.add("cur");
    for (let el = h.closest("details"); el; el = el.parentElement && el.parentElement.closest("details")) el.open = true;
    if (!h.offsetParent && only.checked) { only.checked = false; document.body.classList.remove("only"); }
    h.scrollIntoView({ block: "center" });
    cnt.textContent = `${cur + 1} / ${hits.length}`;
  };
  const setQuery = (v) => { q.value = v; run(); };
  q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 200); });
  q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (timer) { clearTimeout(timer); timer = null; run(); } else go(e.shiftKey ? -1 : 1);
    }
    if (e.key === "Escape") { q.value = ""; clear(); cnt.textContent = ""; q.blur(); }
  });
  $("qp").onclick = () => go(-1);
  $("qn").onclick = () => go(1);
  document.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (mod && k === "f") { e.preventDefault(); q.focus(); q.select(); return; }
    if (mod && k === "g") { e.preventDefault(); go(e.shiftKey ? -1 : 1); return; }
    if (mod || e.target.matches("input,textarea")) return;
    if (k === "n" || k === "j") goChange(1);
    if (k === "p" || k === "k") goChange(-1);
  });

  // ---- agent-driven commands (SSE) ----
  try {
    const es = new EventSource("/events");
    es.addEventListener("reload", () => location.reload());
    es.addEventListener("search", (e) => setQuery(JSON.parse(e.data).query || ""));
    es.addEventListener("goto", (e) => {
      const { change } = JSON.parse(e.data);
      if (typeof change === "number" && changes.length) { ci = Math.max(0, Math.min(changes.length - 1, change - 1)) - 1; goChange(1); }
    });
  } catch {}
})();
