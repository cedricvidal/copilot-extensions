// Block-aligned, word-level "redline" diff of two markdown documents, rendered
// as natural HTML. Word changes are injected as private-use markers *before*
// markdown rendering so inline/table/code structure is preserved; deleted text
// is swapped for placeholders so it can never break the parse or leave
// unbalanced tags.

import { Marked } from "marked";

const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const md = new Marked({ gfm: true, breaks: false });
md.use({
    renderer: {
        // Raw HTML in the documents is shown as text, never executed.
        html({ text }) {
            return esc(text);
        },
        link({ href, title, tokens }) {
            const text = this.parser.parseInline(tokens);
            const safe = /^\s*(javascript|data|vbscript):/i.test(href) ? "#" : href;
            return `<a target="_blank" rel="noopener noreferrer" href="${esc(safe)}"${title ? ` title="${esc(title)}"` : ""}>${text}</a>`;
        },
        image({ href, title, text }) {
            return `<span class="img-ref" title="${esc(title || href)}">🖼 ${esc(text || href)}</span>`;
        },
    },
});

const IO = "\ue000", IC = "\ue001", DO = "\ue002", DC = "\ue003";
const MER = /^\s*```mermaid[^\n]*\n([\s\S]*?)\n\s*```\s*$/;
const PREFIX = /^[ \t]*(?:#{1,6} |[-*+] |\d+\. |> ?|\|)/;
const PREFIX_FULL = /^[ \t]*(?:#{1,6} |[-*+] |\d+\. |> ?|\|)$/;
const MARKUP = /^[*_`~]+$/;
const SAFE = /^(\||[*_`~]+)$/;

export function splitBlocks(text) {
    const res = [];
    let cur = [], fence = null;
    for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
        const f = line.match(/^\s*(`{3,}|~{3,})/);
        if (f) {
            if (!fence) fence = f[1];
            else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
        }
        if (!fence && !line.trim()) {
            if (cur.length) { res.push(cur.join("\n")); cur = []; }
        } else cur.push(line);
    }
    if (cur.length) res.push(cur.join("\n"));
    return res;
}

function render(block) {
    const m = block.match(MER);
    if (m) return `<pre class="mermaid">${esc(m[1])}</pre>`;
    return md.parse(block);
}

function renderInline(s) {
    return s.includes("\n") ? esc(s) : md.parseInline(s);
}

// LCS-based opcodes (equal/delete/insert/replace), like difflib.get_opcodes.
export function opcodes(a, b, eq = (x, y) => x === y) {
    const n = a.length, m = b.length;
    // Trim common prefix/suffix to keep the DP table small.
    let pre = 0;
    while (pre < n && pre < m && eq(a[pre], b[pre])) pre++;
    let suf = 0;
    while (suf < n - pre && suf < m - pre && eq(a[n - 1 - suf], b[m - 1 - suf])) suf++;
    const A = a.slice(pre, n - suf), B = b.slice(pre, m - suf);
    const N = A.length, M = B.length;
    const dp = new Uint32Array((N + 1) * (M + 1));
    const W = M + 1;
    for (let i = N - 1; i >= 0; i--)
        for (let j = M - 1; j >= 0; j--)
            dp[i * W + j] = eq(A[i], B[j]) ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
    const raw = [];
    const push = (tag, i1, i2, j1, j2) => {
        const last = raw[raw.length - 1];
        if (last && last[0] === tag) { last[2] = i2; last[4] = j2; } else raw.push([tag, i1, i2, j1, j2]);
    };
    if (pre) push("equal", 0, pre, 0, pre);
    let i = 0, j = 0;
    while (i < N || j < M) {
        const I = i + pre, J = j + pre;
        if (i < N && j < M && eq(A[i], B[j])) { push("equal", I, I + 1, J, J + 1); i++; j++; }
        else if (j < M && (i >= N || dp[i * W + j + 1] >= dp[(i + 1) * W + j])) { push("insert", I, I, J, J + 1); j++; }
        else { push("delete", I, I + 1, J, J); i++; }
    }
    if (suf) push("equal", n - suf, n, m - suf, m);
    // Merge adjacent delete/insert runs into replace.
    const out = [];
    for (const op of raw) {
        const last = out[out.length - 1];
        if (last && last[0] !== "equal" && op[0] !== "equal") {
            last[0] = "replace"; last[2] = Math.max(last[2], op[2]); last[4] = Math.max(last[4], op[4]);
            last[1] = Math.min(last[1], op[1]); last[3] = Math.min(last[3], op[3]);
        } else out.push([...op]);
    }
    return out;
}

function tokens(s) {
    const t = [];
    for (let line of s.split("\n")) {
        const m = line.match(PREFIX);
        if (m) { t.push(m[0]); line = line.slice(m[0].length); }
        t.push(...(line.match(/\s+|[*_`~]+|\||[^\s|*_`~]+/g) || []));
        t.push("\n");
    }
    t.pop();
    return t;
}

// Absorb whitespace-only "equal" islands between two changes so single shared
// spaces don't shred a rewritten sentence into confetti.
function coalesce(ops, ta) {
    const out = [];
    for (const op of ops) {
        const prev = out[out.length - 1];
        if (op[0] !== "equal" && prev && prev[0] === "equal" && out.length >= 2 && out[out.length - 2][0] !== "equal") {
            const island = ta.slice(prev[1], prev[2]);
            if (island.every((t) => /^[ \t]+$/.test(t)) ) {
                out.pop();
                const before = out[out.length - 1];
                before[0] = "replace"; before[2] = op[2]; before[4] = op[4];
                continue;
            }
        }
        out.push([...op]);
    }
    return out;
}

function wrapIns(run) {
    const o = [];
    let buf = [];
    const flush = () => { if (buf.length) { o.push(IO + buf.join("") + IC); buf = []; } };
    for (const tok of run) {
        if (SAFE.test(tok) || PREFIX_FULL.test(tok) || tok === "\n") { flush(); o.push(tok); }
        else buf.push(tok);
    }
    flush();
    return o.join("");
}

function changedSource(a, b) {
    const ta = tokens(a), tb = tokens(b), dels = [], s = [];
    for (const [op, i1, i2, j1, j2] of coalesce(opcodes(ta, tb), ta)) {
        if (op === "equal") { s.push(tb.slice(j1, j2).join("")); continue; }
        if (op === "delete" || op === "replace") {
            const d = ta.slice(i1, i2).filter((t) => !PREFIX_FULL.test(t) && !MARKUP.test(t)).join("").trim();
            if (d && !/^\|?$/.test(d)) { dels.push(d); s.push(`${DO}${dels.length - 1}${DC}`); }
        }
        if (op === "insert" || op === "replace") s.push(wrapIns(tb.slice(j1, j2)));
    }
    // Markers that landed inside tag attributes (e.g. an edited link URL) are dropped.
    let h = md.parse(s.join("")).replace(/<[^>]*>/g, (tag) => tag.replace(new RegExp(`${DO}\\d+${DC}|[${IO}${IC}]`, "g"), ""));
    const inCode = /^\s*(```|~~~|    )/.test(b);
    h = h.split(IO).join("<ins>").split(IC).join("</ins>");
    h = h.replace(new RegExp(`${DO}(\\d+)${DC}`, "g"), (_, k) => `<del>${inCode ? esc(dels[+k]) : renderInline(dels[+k])}</del>`);
    return h;
}

function changedBlock(a, b) {
    if (MER.test(a) && MER.test(b))
        return `<div class="mside"><div><div class="cap">before</div>${render(a)}</div><div><div class="cap">after</div>${render(b)}</div></div>` +
            `<details><summary>diagram source diff</summary>${changedSource(a, b)}</details>`;
    return changedSource(a, b);
}

function bag(s) {
    const m = new Map();
    const t = s.replace(/\s+/g, " ");
    for (let i = 0; i < t.length - 1; i++) { const k = t.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); }
    return m;
}
function similarity(x, y) {
    const bx = bag(x), by = bag(y);
    let inter = 0, nx = 0, ny = 0;
    for (const v of bx.values()) nx += v;
    for (const v of by.values()) ny += v;
    for (const [k, v] of bx) inter += Math.min(v, by.get(k) || 0);
    return nx + ny ? (2 * inter) / (nx + ny) : 1;
}

export function redline(baseText, headText) {
    const a = splitBlocks(baseText), b = splitBlocks(headText);
    const parts = [], stats = { added: 0, removed: 0, changed: 0 };
    const add = (y) => { stats.added++; parts.push(`<div class="blk add" data-chg>${render(y)}</div>`); };
    const rm = (x) => { stats.removed++; parts.push(`<div class="blk rm" data-chg>${render(x)}</div>`); };
    for (const [op, i1, i2, j1, j2] of opcodes(a, b)) {
        if (op === "equal") { for (const x of a.slice(i1, i2)) parts.push(`<div class="blk">${render(x)}</div>`); continue; }
        let i = i1;
        for (const y of b.slice(j1, j2)) {
            let best = -1, score = 0;
            for (let k = i; k < i2; k++) { const r = similarity(a[k], y); if (r > score) { score = r; best = k; } }
            if (best >= 0 && score > 0.5) {
                for (const x of a.slice(i, best)) rm(x);
                stats.changed++;
                parts.push(`<div class="blk chg" data-chg>${changedBlock(a[best], y)}</div>`);
                i = best + 1;
            } else add(y);
        }
        for (const x of a.slice(i, i2)) rm(x);
    }
    return { html: parts.join("\n"), stats };
}

// Plain rendering of one side (no change markers), block by block so Mermaid
// fences render the same way as in the redline.
export function renderDoc(text) {
    return splitBlocks(text).map((x) => `<div class="blk">${render(x)}</div>`).join("\n");
}

export { esc };
