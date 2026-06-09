---
marp: true
theme: uncover
paginate: true
style: |
  :root {
    --color-background: #0d1117;
    --color-foreground: #e6edf3;
    --color-highlight: #7c3aed;
    --color-dimmed: #8b949e;
  }
  section {
    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
    color: #e6edf3;
  }
  section.lead {
    background: linear-gradient(135deg, #0d1117 0%, #1a0533 50%, #0d1117 100%);
  }
  section.lead h1 {
    color: #fff;
    text-shadow: 0 0 40px rgba(124, 58, 237, 0.5);
  }
  h1, h2 {
    color: #c9b1ff;
  }
  strong {
    color: #a78bfa;
  }
  code {
    background: #21262d !important;
    color: #79c0ff !important;
    border-radius: 4px;
    padding: 2px 6px;
  }
  pre code {
    background: #161b22 !important;
    color: #e6edf3 !important;
    padding: 16px !important;
    display: block;
  }
  pre {
    background: #161b22 !important;
    border: 1px solid #30363d !important;
    border-radius: 8px;
  }
  a {
    color: #58a6ff;
  }
  table {
    font-size: 0.85em;
  }
  th {
    background: #7c3aed;
    color: white;
  }
  td {
    background: #161b22;
    border-color: #30363d;
  }
---

<!-- _class: lead -->

# ✨ Canvas Extensions

## GitHub Copilot App

![bg right:35% opacity:0.3](https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png)

A shared, interactive surface for **human-agent collaboration**

---

## What Are Canvas Extensions?

![bg right:30% vertical opacity:0.15](https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png)

- 🖥️ **Interactive side panels** in the GitHub Copilot app
- 🤝 A shared surface where both **you and the agent** work
- 🔄 **Bidirectional** — you edit directly, the agent updates programmatically
- 💾 **Persistent** across turns and sessions

---

## Why Use a Canvas?

| | 💬 Chat alone | 🖥️ Chat + Canvas |
|---|---|---|
| **See** | Read text responses | Inspect real artifacts |
| **Steer** | Re-prompt to correct | Edit the surface yourself |
| **State** | Stateless between turns | Continuous shared state |
| **Intent** | Describe what you want | See and steer directly |

---

<!-- _class: lead -->

# 🎯 Use Cases

---

## Example Use Cases

- 📋 **Agentic Kanban boards** — humans and agents move cards & kick off tasks
- 🐛 **Issue triage boards** — summarize themes and pain points
- 📝 **Markdown canvases** — plan your day, launch agent sessions
- 📊 **Dashboards** — slides, spreadsheets, real-time data
- 🌐 **Browser canvases** — preview live web pages in the side panel

---

## How to Create a Canvas

1. Open an agent session in the Copilot app
2. Type `/create-canvas` in the prompt box
3. Describe the workflow and capabilities you need
4. Choose scope:
   - 👥 **Project** — shared with team
   - 👤 **User** — personal to your machine

The agent builds it and opens it in the side panel ✨

---

## Extension Structure

```text
.github/extensions/my-canvas/
├── package.json          # metadata & dependencies
├── extension.mjs         # canvas behavior & capabilities
└── artifacts/            # persisted state (optional)
```

Each canvas registers:
- 🚀 An **open** handler (renders the UI)
- ⚡ **Actions** the agent can call
- 🎛️ **UI controls** for direct human interaction

---

## Working in a Canvas

Once open, the collaboration is **bidirectional**:

| You (Human) | Agent |
|---|---|
| Click buttons, move cards | Call canvas actions |
| Edit content directly | Update state programmatically |
| Add capabilities on the fly | React to your changes |

---

<!-- _class: lead -->

# 🎉 This Deck is a Canvas!

The **Marp Viewer** is itself a canvas extension

---

## Marp Viewer Canvas

This presentation is rendered by the **Marp Viewer** canvas extension:

- 📄 Renders Marp markdown → navigable slides
- 🤖 Agent opens decks via `open_canvas`
- 🔄 Agent updates content via `update_content` action
- ⌨️ Navigate with arrow keys or buttons
- 🎨 Full Marp theming support

---

## Get Started

1. 📥 Install the [GitHub Copilot app](https://gh.io/github-copilot-app-repo)
2. 💬 Open a session and try `/create-canvas`
3. 📦 Or install existing canvas extensions

**Learn more →**
[Working with canvas extensions](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions)

![bg right:25% opacity:0.15](https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png)
