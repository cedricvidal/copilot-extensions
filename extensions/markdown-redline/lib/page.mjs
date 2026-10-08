import { esc } from "./redline.mjs";

const DARK = `color-scheme:dark;--ins-bg:rgba(46,160,67,.38);--del-bg:rgba(248,81,73,.36);--add-blk:rgba(46,160,67,.13);--rm-blk:rgba(248,81,73,.12);
 --add-bar:#3fb950;--rm-bar:#f85149;--chg-bar:#d29922;--fg:#e6edf3;--muted:#8d96a0;--bg:#0d1117;--border:#30363d;--code-bg:rgba(110,118,129,.2);
 --link:#4493f8;--hit-bg:#bb8009;--hit-fg:#fff;--hit-cur:#f0883e`;

const CSS = `
:root{color-scheme:light;--ins-bg:rgba(46,160,67,.28);--del-bg:rgba(248,81,73,.26);--add-blk:rgba(46,160,67,.08);--rm-blk:rgba(248,81,73,.08);
 --add-bar:#1a7f37;--rm-bar:#cf222e;--chg-bar:#bf8700;--fg:#1f2328;--muted:#59636e;--bg:#fff;--border:#d0d7de;--code-bg:rgba(127,127,127,.12);
 --link:#0969da;--hit-bg:#fff3a3;--hit-fg:#1f2328;--hit-cur:#ff9632}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){${DARK}}}
:root[data-theme=dark]{${DARK}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);font-size:15px;line-height:1.6}
main{max-width:1000px;margin:0 auto;padding:0 1.2em 40vh}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--border);padding:.45em 1em;font-size:13px;display:flex;flex-wrap:wrap;gap:.4em 1em;align-items:center}
header .title{font-weight:600}
header code{font-size:12px}
.sw{display:inline-block;width:.8em;height:.8em;vertical-align:-1px;margin-right:.25em;border-left:3px solid}
.grow{flex:1}
header input[type=search]{width:190px;padding:2px 6px;background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:4px}
header button{background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:4px;padding:1px 7px;cursor:pointer}
#qcount,#ccount{color:var(--muted);font-size:12px;min-width:4em;display:inline-block}
.files{font-size:13px;padding:.4em 1em;border-bottom:1px solid var(--border)}
.files a{margin-right:1em;color:inherit}
.file-h{margin:2em 0 .6em;padding:.3em .6em;background:var(--code-bg);border-radius:6px;font:600 13px var(--font-mono,ui-monospace,Menlo,monospace);display:flex;gap:1em}
.file-h .st{font-weight:400;color:var(--muted)}
.blk{padding:.05em .9em;border-left:4px solid transparent}
.add{background:var(--add-blk);border-color:var(--add-bar)}
.rm{background:var(--rm-blk);border-color:var(--rm-bar)}
.rm>:not(.mermaid){text-decoration:line-through;text-decoration-color:rgba(207,34,46,.55);opacity:.8}
.chg{border-color:var(--chg-bar)}
.blk.cur{outline:2px solid var(--chg-bar);outline-offset:2px}
ins{background:var(--ins-bg);text-decoration:none;border-radius:2px}
del{background:var(--del-bg);text-decoration:line-through;border-radius:2px;opacity:.85}
pre{background:var(--code-bg);padding:.8em;overflow:auto;font-size:13px;border-radius:6px}
code{background:var(--code-bg);font-family:var(--font-mono,ui-monospace,Menlo,monospace);font-size:88%;padding:.1em .3em;border-radius:4px}
pre code{background:none;padding:0}
table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid var(--border);padding:4px 8px}
h1,h2{border-bottom:1px solid var(--border);padding-bottom:.3em}
a{color:var(--link)}
pre.mermaid{background:transparent;text-align:center}
.rm pre.mermaid{opacity:.55}
.mside{display:grid;grid-template-columns:1fr 1fr;gap:1em}.mside>div{overflow:auto;border:1px solid var(--border);border-radius:6px;padding:.4em}
.cap{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.img-ref{color:var(--muted);font-style:italic}
mark.hit{background:var(--hit-bg);color:var(--hit-fg)}mark.hit.cur{background:var(--hit-cur);color:#1f2328;outline:2px solid var(--hit-cur)}
body.only .v-diff .blk:not([data-chg]){display:none}
.err{color:var(--rm-bar);padding:1em}
.empty{color:var(--muted);padding:1em}
.seg{display:inline-flex;border:1px solid var(--border);border-radius:5px;overflow:hidden}
.seg button{border:0;border-radius:0;padding:1px 9px}
.seg button+button{border-left:1px solid var(--border)}
.seg button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
body:not([data-view=diff]) .diffonly{display:none}
body[data-view=diff] .v:not(.v-diff),body[data-view=base] .v:not(.v-base),body[data-view=head] .v:not(.v-head){display:none}
`;

const VIEWS = ["diff", "base", "head"];

export function page({ title, baseLabel, headLabel, files, error, theme, view }) {
    const th = theme === "light" || theme === "dark" ? ` data-theme="${theme}"` : "";
    const v0 = VIEWS.includes(view) ? view : "diff";
    const tot = files.reduce((t, f) => ({ added: t.added + f.stats.added, removed: t.removed + f.stats.removed, changed: t.changed + f.stats.changed }), { added: 0, removed: 0, changed: 0 });
    const multi = files.length > 1;
    const side = (html, missing, label) =>
        missing ? `<div class="empty">This file doesn't exist in <code>${esc(label)}</code>.</div>` : html || `<div class="empty">No content.</div>`;
    const body = error
        ? `<div class="err">${esc(error)}</div>`
        : files.map((f, i) => `
<section id="f${i}">
${multi ? `<div class="file-h">${esc(f.path)}<span class="st">+${f.stats.added} −${f.stats.removed} ~${f.stats.changed}${f.note ? ` · ${esc(f.note)}` : ""}</span></div>` : ""}
<div class="v v-diff">${f.html || `<div class="empty">No content.</div>`}</div>
<div class="v v-base">${side(f.baseHtml, f.baseMissing, baseLabel)}</div>
<div class="v v-head">${side(f.headHtml, f.headMissing, headLabel)}</div>
</section>`).join("\n");
    return `<!doctype html><html${th}><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head>
<body data-view="${v0}" data-default-view="${v0}">
<header>
  <span class="title">${esc(title)}</span>
  <span class="seg" role="group" aria-label="View">
    <button data-view="diff" title="Redline diff (d)">Diff</button><button data-view="base" title="Original: ${esc(baseLabel)} (o)">Original</button><button data-view="head" title="Latest: ${esc(headLabel)} (l)">Latest</button>
  </span>
  <span><code>${esc(baseLabel)}</code> → <code>${esc(headLabel)}</code></span>
  <span class="diffonly"><span class="sw" style="background:var(--add-blk);border-color:var(--add-bar)"></span>added ${tot.added}</span>
  <span class="diffonly"><span class="sw" style="background:var(--rm-blk);border-color:var(--rm-bar)"></span>removed ${tot.removed}</span>
  <span class="diffonly"><span class="sw" style="border-color:var(--chg-bar)"></span>edited ${tot.changed}: <ins>new</ins> <del>old</del></span>
  <label class="diffonly"><input id="only" type="checkbox"> changes only</label>
  <span>changes <button id="cp" title="Previous change (p)">↑</button><button id="cn" title="Next change (n)">↓</button> <span id="ccount"></span></span>
  <span class="grow"></span>
  <span><input id="q" type="search" placeholder="Search (⌘F)"> <button id="qp" title="Previous (⇧Enter)">↑</button><button id="qn" title="Next (Enter)">↓</button> <span id="qcount"></span></span>
  <button id="theme" title="Theme: auto / light / dark"></button>
</header>
${multi ? `<nav class="files">${files.map((f, i) => `<a href="#f${i}">${esc(f.path)}</a>`).join("")}</nav>` : ""}
<main>${body}</main>
<script src="/assets/client.js"></script>
<script src="/vendor/mermaid.min.js" onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'"></script>
</body></html>`;
}
