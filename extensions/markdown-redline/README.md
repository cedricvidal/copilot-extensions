# markdown-redline

A canvas that shows a **rendered** markdown diff (a "redline"), not a raw text diff:

- Natural markdown rendering. Added blocks are green, removed blocks are red and struck through, and edited blocks are marked in amber with word-level `<ins>`/`<del>` changes.
- Mermaid diagrams render. Changed diagrams are shown before/after side by side, with the source diff underneath.
- In-page search (⌘F, Enter / ⇧Enter, Esc) and change navigation (`n`/`p` or `j`/`k`), plus a "changes only" filter.
- Light and dark themes. Auto follows the OS/app appearance, and the header button cycles auto → light → dark.
- Compares several files in one canvas. Each side can come from a git ref, a file, or raw text.

## Usage

Ask Copilot, for example:

> Open a markdown redline of `docs/architecture/auth-rbac.md` between `main` and my branch.

Or have the agent call `open_canvas` with `canvasId: "markdown-redline"`:

```json
{
  "repo": "/path/to/repo",
  "title": "PR #1429 docs",
  "baseRef": "origin/main",
  "headRef": "pr-1429",
  "files": [
    { "path": "docs/architecture/auth-rbac.md" },
    { "path": "docs/architecture/data-organization-projects.md" }
  ]
}
```

| Field | Description |
| --- | --- |
| `repo` | Git working directory. Defaults to the session working directory. |
| `path` / `files[].path` | Markdown file, repo-relative or absolute. |
| `baseRef` / `headRef` | Git revisions. The base defaults to `HEAD`; the head defaults to the working-tree file. |
| `baseFile` / `headFile` | Use a file on disk for that side. |
| `baseText` / `headText` | Use raw markdown for that side. |
| `title`, `baseLabel`, `headLabel` | Header labels. |
| `theme` | `auto` (default), `light` or `dark`. |

Per-file fields override the top-level ones. A file that's missing on one side is shown as a new file or a deleted file.

### Actions

| Action | Description |
| --- | --- |
| `refresh` | Re-read the sources and reload. |
| `set_diff` | Replace the comparison. Takes the same shape as the open input. |
| `get_summary` | Returns added/removed/edited block counts per file. |
| `search` | `{ "query": "…" }`: highlight matches and jump to the first one. |
| `goto_change` | `{ "change": 3 }`: scroll to the Nth change. |

## How it works

Each canvas instance runs a small HTTP server bound to `127.0.0.1` on a random port. The page is rebuilt on every load, and a server-sent events channel carries `refresh`/`search`/`goto_change` actions.

The diff is block-level: an LCS over blank-line-separated blocks, where a fenced code block counts as one block. Similar replaced blocks are paired and diffed word by word. Inserted words are wrapped in private-use-character markers, and deleted words are replaced by placeholders *before* the markdown is rendered. The markers are then swapped for `<ins>`/`<del>` in the rendered HTML, so the tags always stay balanced.

Raw HTML in the markdown is escaped. Links open in a new window, `javascript:` and `data:` URLs are blocked, and images are shown as text references. Mermaid runs with `securityLevel: "strict"`.

## Install

```bash
cd extensions/markdown-redline && npm install
```

Then copy or symlink the folder into `~/.copilot/extensions/` and reload extensions. If `node_modules/mermaid` is missing, the page loads Mermaid from the jsDelivr CDN.
