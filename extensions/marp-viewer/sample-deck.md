---
marp: true
theme: default
paginate: true
---

# Canvas Extensions
## GitHub Copilot App

A shared, interactive surface for human-agent collaboration

---

## What Are Canvas Extensions?

- **Interactive side panels** in the GitHub Copilot app
- A shared surface where both **you and the agent** can work
- Bidirectional: you edit directly, the agent updates programmatically
- Persistent across turns and sessions

---

## Why Use a Canvas?

| Chat alone | Chat + Canvas |
|---|---|
| Describe what you want | See and steer the work directly |
| Read text responses | Inspect real artifacts |
| Re-prompt to correct | Edit the surface yourself |
| Stateless between turns | Continuous shared state |

---

## Example Use Cases

- 📋 **Agentic Kanban boards** — humans and agents move cards
- 🐛 **Issue triage boards** — summarize themes and pain points
- 📝 **Markdown canvases** — plan your day, launch agent sessions
- 📊 **Document canvases** — slides, spreadsheets, dashboards

---

## How to Create a Canvas

1. Open an agent session in the Copilot app
2. Type `/create-canvas` in the prompt box
3. Describe the workflow and capabilities you need
4. Choose scope:
   - **Project** → `.github/extensions/` (shared with team)
   - **User** → `~/.copilot/extensions/` (personal)

The agent builds it and opens it in the side panel ✨

---

## Extension Structure

```
.github/extensions/my-canvas/
├── package.json          # metadata & dependencies
├── extension.mjs         # canvas behavior & capabilities
└── artifacts/            # persisted state (optional)
```

Each canvas registers:
- An **open** handler (renders the UI)
- **Actions** the agent can call
- **UI controls** for direct human interaction

---

## Working in a Canvas

Once open, you can:

- ✅ Use UI controls (buttons, cards, filters)
- ✅ Ask the agent to call canvas capabilities
- ✅ Add or revise capabilities on the fly
- ✅ Edit the canvas directly — the agent picks up your changes

---

## This Deck is a Canvas!

This **Marp Viewer** is itself a canvas extension 🎉

- Renders Marp markdown → navigable slides
- Agent can open decks via `open_canvas`
- Agent can update content via `update_content` action
- You navigate with arrow keys or buttons

---

## Get Started

1. Install the [GitHub Copilot app](https://gh.io/github-copilot-app-repo)
2. Open a session and try `/create-canvas`
3. Or install existing canvas extensions from `.github/extensions/`

**Learn more:**
[docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions)
