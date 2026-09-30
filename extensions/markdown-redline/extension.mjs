// Extension: markdown-redline
// Rendered inline markdown diff ("redline"): natural markdown rendering with
// block-level added/removed/edited markers, word-level <ins>/<del> inside
// edited blocks, Mermaid diagrams (before/after when changed), in-page search,
// and change navigation. Sources can be git refs, files, or raw text.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { redline } from "./lib/redline.mjs";
import { page } from "./lib/page.mjs";

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATIC = {
    "/assets/client.js": ["assets/client.js", "text/javascript"],
    "/vendor/mermaid.min.js": ["node_modules/mermaid/dist/mermaid.min.js", "text/javascript"],
};

const instances = new Map(); // instanceId -> { server, url, input, cwd, clients:Set, last }

const sideProps = (side) => ({
    [`${side}Ref`]: { type: "string", description: `Git revision for the ${side} side (e.g. "HEAD", "origin/main", a SHA, "pr-123").` },
    [`${side}File`]: { type: "string", description: `Absolute or repo-relative path of a file to use as the ${side} side.` },
    [`${side}Text`]: { type: "string", description: `Raw markdown for the ${side} side.` },
});
const fileSpec = {
    type: "object",
    properties: {
        path: { type: "string", description: "Markdown file path (repo-relative or absolute). Used with baseRef/headRef; defaults: base = HEAD, head = working tree." },
        ...sideProps("base"),
        ...sideProps("head"),
    },
};
const inputSchema = {
    type: "object",
    properties: {
        repo: { type: "string", description: "Git working directory used for refs and relative paths. Defaults to the session working directory." },
        title: { type: "string" },
        baseLabel: { type: "string" },
        headLabel: { type: "string" },
        theme: { type: "string", enum: ["auto", "light", "dark"], description: "Color theme. \"auto\" (default) follows the OS/app appearance; the header toggle can override it." },
        files: { type: "array", items: fileSpec, description: "Multiple files rendered in one canvas. Each item overrides top-level baseRef/headRef." },
        ...fileSpec.properties,
    },
};

async function gitShow(cwd, ref, rel) {
    try {
        const { stdout } = await run("git", ["-C", cwd, "show", `${ref}:${rel}`], { maxBuffer: 64 * 1024 * 1024 });
        return { text: stdout };
    } catch {
        return { text: "", missing: true };
    }
}

async function repoRelative(cwd, p) {
    if (!path.isAbsolute(p)) return `./${p}`;
    try {
        const { stdout } = await run("git", ["-C", cwd, "rev-parse", "--show-toplevel"]);
        return path.relative(stdout.trim(), p);
    } catch {
        return p;
    }
}

async function loadSide(cwd, spec, side, defaults) {
    const text = spec[`${side}Text`];
    if (typeof text === "string") return { text, label: "text" };
    const file = spec[`${side}File`];
    if (file) {
        const abs = path.isAbsolute(file) ? file : path.join(cwd, file);
        try { return { text: await readFile(abs, "utf8"), label: path.basename(file) }; }
        catch { return { text: "", missing: true, label: path.basename(file) }; }
    }
    const ref = spec[`${side}Ref`] ?? defaults[`${side}Ref`] ?? (side === "base" ? "HEAD" : undefined);
    if (!spec.path) throw new CanvasError("invalid_input", `No ${side} source: provide ${side}Text, ${side}File, or path (+ ${side}Ref).`);
    if (ref) return { ...(await gitShow(cwd, ref, await repoRelative(cwd, spec.path))), label: ref };
    const abs = path.isAbsolute(spec.path) ? spec.path : path.join(cwd, spec.path);
    try { return { text: await readFile(abs, "utf8"), label: "working tree" }; }
    catch { return { text: "", missing: true, label: "working tree" }; }
}

async function build(inst) {
    const input = inst.input || {};
    const cwd = input.repo || inst.cwd || process.cwd();
    const specs = Array.isArray(input.files) && input.files.length ? input.files : [input];
    const files = [];
    let baseLabel = input.baseLabel, headLabel = input.headLabel;
    for (const spec of specs) {
        const base = await loadSide(cwd, spec, "base", input);
        const head = await loadSide(cwd, spec, "head", input);
        baseLabel ??= base.label;
        headLabel ??= head.label;
        const { html, stats } = redline(base.text, head.text);
        const note = base.missing && head.missing ? "not found on either side" : base.missing ? "new file" : head.missing ? "deleted file" : "";
        files.push({ path: spec.path || spec.headFile || spec.baseFile || "document.md", html, stats, note });
    }
    const title = input.title || (files.length === 1 ? path.basename(files[0].path) : `${files.length} markdown files`);
    inst.last = { title, baseLabel, headLabel, files: files.map(({ path: p, stats, note }) => ({ path: p, stats, note })) };
    return page({ title, baseLabel, headLabel, files, theme: input.theme });
}

function broadcast(inst, event, data = {}) {
    for (const res of inst.clients) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return inst.clients.size;
}

async function startServer(inst) {
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, "http://127.0.0.1");
        try {
            if (url.pathname === "/events") {
                res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
                res.write(": ok\n\n");
                inst.clients.add(res);
                req.on("close", () => inst.clients.delete(res));
                return;
            }
            const asset = STATIC[url.pathname];
            if (asset) {
                const body = await readFile(path.join(HERE, asset[0]));
                res.writeHead(200, { "Content-Type": asset[1], "Cache-Control": "max-age=3600" });
                return res.end(body);
            }
            if (url.pathname === "/") {
                let html;
                try { html = await build(inst); }
                catch (e) { html = page({ title: "markdown-redline", baseLabel: "?", headLabel: "?", files: [], error: e.message }); }
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
                return res.end(html);
            }
            res.writeHead(404).end();
        } catch (e) {
            res.writeHead(500, { "Content-Type": "text/plain" }).end(String(e?.message || e));
        }
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    inst.server = server;
    inst.url = `http://127.0.0.1:${server.address().port}/`;
}

const need = (ctx) => {
    const inst = instances.get(ctx.instanceId);
    if (!inst) throw new CanvasError("not_open", `No open markdown-redline instance "${ctx.instanceId}".`);
    return inst;
};

await joinSession({
    canvases: [
        createCanvas({
            id: "markdown-redline",
            displayName: "Markdown Redline",
            description:
                "Rendered inline markdown diff (redline) with word-level changes, Mermaid diagrams, search and change navigation; compare git refs, files, or text — e.g. {path, baseRef, headRef} or {files:[...]} for a PR's .md files.",
            inputSchema,
            actions: [
                {
                    name: "refresh",
                    description: "Re-read the sources (git refs/files) and reload the view.",
                    handler: async (ctx) => { const inst = need(ctx); await build(inst); broadcast(inst, "reload"); return inst.last; },
                },
                {
                    name: "set_diff",
                    description: "Replace what the canvas compares (same shape as the open input) and reload.",
                    inputSchema,
                    handler: async (ctx) => { const inst = need(ctx); inst.input = ctx.input || {}; await build(inst); broadcast(inst, "reload"); return inst.last; },
                },
                {
                    name: "get_summary",
                    description: "Return labels and per-file added/removed/edited block counts.",
                    handler: async (ctx) => { const inst = need(ctx); await build(inst); return inst.last; },
                },
                {
                    name: "search",
                    description: "Search the rendered page and highlight matches.",
                    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
                    handler: async (ctx) => ({ delivered: broadcast(need(ctx), "search", { query: ctx.input.query }) }),
                },
                {
                    name: "goto_change",
                    description: "Scroll to the Nth change (1-based).",
                    inputSchema: { type: "object", properties: { change: { type: "integer", minimum: 1 } }, required: ["change"] },
                    handler: async (ctx) => ({ delivered: broadcast(need(ctx), "goto", { change: ctx.input.change }) }),
                },
            ],
            open: async (ctx) => {
                let inst = instances.get(ctx.instanceId);
                if (!inst) {
                    inst = { clients: new Set() };
                    instances.set(ctx.instanceId, inst);
                    await startServer(inst);
                }
                inst.input = ctx.input || {};
                inst.cwd = ctx.session?.workingDirectory;
                try { await build(inst); } catch { /* surfaced in the page */ }
                broadcast(inst, "reload");
                return { title: inst.last?.title || "Markdown Redline", url: inst.url };
            },
            onClose: async (ctx) => {
                const inst = instances.get(ctx.instanceId);
                if (!inst) return;
                instances.delete(ctx.instanceId);
                for (const c of inst.clients) c.end();
                await new Promise((r) => inst.server.close(() => r()));
            },
        }),
    ],
});
