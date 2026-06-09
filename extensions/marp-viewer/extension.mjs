// Extension: marp-viewer
// Marp deck visualizer - renders Marp markdown presentations as slide decks
// Uses @marp-team/marp-core for proper Marp rendering

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve as resolvePath, dirname, extname, join } from "node:path";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const { Marp } = await import("@marp-team/marp-core");

const servers = new Map();

const MIME_TYPES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
    ".ico": "image/x-icon", ".css": "text/css", ".js": "text/javascript",
    ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm",
};

function renderMarpToHtml(markdown) {
    const marp = new Marp({ html: true });
    const { html, css } = marp.render(markdown);
    return { html, css };
}

function buildPage(markdown, title) {
    const { html, css } = renderMarpToHtml(markdown);
    const slideCount = (html.match(/data-marpit-svg/g) || []).length;

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title || "Marp Viewer"}</title>
<style>
${css}

:root { --bg: #1e1e1e; --controls-bg: #2d2d2d; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; font-family: system-ui, sans-serif; background: var(--bg); }

#controls {
    position: fixed; bottom: 0; left: 0; right: 0; height: 48px;
    background: var(--controls-bg); border-top: 1px solid #444;
    display: flex; align-items: center; justify-content: center; gap: 16px;
    z-index: 100; padding: 0 16px;
}
#controls button {
    background: #0078d4; color: white; border: none; border-radius: 4px;
    padding: 6px 16px; cursor: pointer; font-size: 14px;
}
#controls button:hover { background: #106ebe; }
#controls button:disabled { background: #555; cursor: not-allowed; }
#slide-info { color: #ccc; font-size: 14px; min-width: 80px; text-align: center; }

#slide-container {
    position: absolute; top: 0; left: 0; right: 0; bottom: 48px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; padding: 20px;
}

#marp-slides svg[data-marpit-svg] {
    display: none;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    border-radius: 4px;
    max-width: 100%;
    max-height: 100%;
}
#marp-slides svg[data-marpit-svg].active {
    display: block;
}
</style>
</head>
<body>
<div id="slide-container">
    <div id="marp-slides">${html}</div>
</div>
<div id="controls">
    <button id="prev" onclick="navigate(-1)">&#9664; Prev</button>
    <span id="slide-info">1 / ${slideCount}</span>
    <button id="next" onclick="navigate(1)">Next &#9654;</button>
</div>
<script>
let currentSlide = 0;
const svgs = document.querySelectorAll('#marp-slides svg[data-marpit-svg]');
const totalSlides = svgs.length;

function showSlide(index) {
    currentSlide = Math.max(0, Math.min(index, totalSlides - 1));
    svgs.forEach((svg, i) => svg.classList.toggle('active', i === currentSlide));
    document.getElementById('slide-info').textContent = (currentSlide + 1) + ' / ' + totalSlides;
    document.getElementById('prev').disabled = currentSlide === 0;
    document.getElementById('next').disabled = currentSlide === totalSlides - 1;
    fitSlide();
}

function fitSlide() {
    const container = document.getElementById('slide-container');
    const svg = document.querySelector('#marp-slides svg[data-marpit-svg].active');
    if (!svg || !container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / 1280, ch / 720);
    svg.style.width = Math.floor(1280 * scale) + 'px';
    svg.style.height = Math.floor(720 * scale) + 'px';
}

function navigate(dir) { showSlide(currentSlide + dir); }

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); navigate(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
    if (e.key === 'Home') { e.preventDefault(); showSlide(0); }
    if (e.key === 'End') { e.preventDefault(); showSlide(totalSlides - 1); }
});

window.addEventListener('resize', fitSlide);
showSlide(0);
</script>
</body>
</html>`;
}

async function startServer(instanceId, markdown, title, baseDir) {
    const renderedHtml = buildPage(markdown, title);
    const state = { markdown, title, renderedHtml, baseDir };
    const server = createServer(async (req, res) => {
        const entry = servers.get(instanceId);
        const url = new URL(req.url, "http://localhost");
        const pathname = decodeURIComponent(url.pathname);

        // Serve the main HTML page at root
        if (pathname === "/" || pathname === "") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(entry?.state?.renderedHtml || "<html><body>No content</body></html>");
            return;
        }

        // Serve static assets relative to the markdown file's directory
        if (entry?.state?.baseDir) {
            const filePath = join(entry.state.baseDir, pathname);
            // Security: ensure the resolved path is still under baseDir
            const resolved = resolvePath(filePath);
            if (!resolved.startsWith(resolvePath(entry.state.baseDir))) {
                res.writeHead(403);
                res.end("Forbidden");
                return;
            }
            try {
                const fileStat = await stat(resolved);
                if (fileStat.isFile()) {
                    const ext = extname(resolved).toLowerCase();
                    const mime = MIME_TYPES[ext] || "application/octet-stream";
                    const content = await readFile(resolved);
                    res.setHeader("Content-Type", mime);
                    res.end(content);
                    return;
                }
            } catch (e) {
                // File not found, fall through to 404
            }
        }

        res.writeHead(404);
        res.end("Not found");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/`, state };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "marp-viewer",
            displayName: "Marp Viewer",
            description: "Renders a Marp markdown document as a navigable slide deck. Pass the file path or raw markdown content as input.",
            inputSchema: {
                type: "object",
                properties: {
                    filePath: {
                        type: "string",
                        description: "Absolute path to a Marp markdown file to render",
                    },
                    markdown: {
                        type: "string",
                        description: "Raw Marp markdown content to render (alternative to filePath)",
                    },
                    title: {
                        type: "string",
                        description: "Optional title for the slide deck",
                    },
                },
            },
            actions: [
                {
                    name: "navigate_slide",
                    description: "Navigate to a specific slide by index (0-based)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            slide: { type: "number", description: "0-based slide index" },
                        },
                        required: ["slide"],
                    },
                    handler: async (ctx) => {
                        return { navigated: true, slide: ctx.input?.slide ?? 0 };
                    },
                },
                {
                    name: "update_content",
                    description: "Update the deck with new markdown content or reload from file",
                    inputSchema: {
                        type: "object",
                        properties: {
                            filePath: { type: "string", description: "Path to reload from" },
                            markdown: { type: "string", description: "New raw markdown content" },
                        },
                    },
                    handler: async (ctx) => {
                        const entry = servers.get(ctx.instanceId);
                        if (!entry) return { error: "No active instance" };
                        let md = ctx.input?.markdown;
                        let baseDir = entry.state.baseDir;
                        if (!md && ctx.input?.filePath) {
                            const fp = resolvePath(ctx.input.filePath);
                            md = await readFile(fp, "utf-8");
                            baseDir = dirname(fp);
                        }
                        if (md) {
                            entry.state.markdown = md;
                            entry.state.baseDir = baseDir;
                            entry.state.renderedHtml = buildPage(md, entry.state.title);
                        }
                        return { updated: true };
                    },
                },
            ],
            open: async (ctx) => {
                let markdown = ctx.input?.markdown || "";
                const title = ctx.input?.title || "Marp Viewer";
                let baseDir = null;

                if (!markdown && ctx.input?.filePath) {
                    const filePath = resolvePath(ctx.input.filePath);
                    markdown = await readFile(filePath, "utf-8");
                    baseDir = dirname(filePath);
                }

                let entry = servers.get(ctx.instanceId);
                if (entry) {
                    entry.state.markdown = markdown;
                    entry.state.title = title;
                    entry.state.baseDir = baseDir || entry.state.baseDir;
                    entry.state.renderedHtml = buildPage(markdown, title);
                } else {
                    entry = await startServer(ctx.instanceId, markdown, title, baseDir);
                    servers.set(ctx.instanceId, entry);
                }
                return { title, url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
