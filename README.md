<div align="center">

<img src="https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png" width="80" />

# ✨ Copilot Extensions

**A collection of canvas extensions for [GitHub Copilot](https://github.com/features/copilot)**

[![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-Extensions-8957e5?style=for-the-badge&logo=githubcopilot&logoColor=white)](https://github.com/features/copilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Extensions](https://img.shields.io/badge/Extensions-1-blue?style=for-the-badge&logo=puzzle-piece&logoColor=white)](extensions/)

---

*Enhance your Copilot experience with rich, interactive canvas extensions*

</div>

## Extensions

| Extension | Description |
| --- | --- |
| [marp-viewer](extensions/marp-viewer) | Renders [Marp](https://github.com/marp-team/marp/) markdown presentations as navigable slide decks using `@marp-team/marp-core` |

## Installation

Extensions are installed into the GitHub Copilot app from within a Copilot CLI session.

### From this repository

In a Copilot CLI session, ask:

> Install the extension from https://github.com/cedricvidal/copilot-extensions/tree/main/extensions/marp-viewer

### Manual installation

1. Clone this repository
2. Copy the desired extension folder into `~/.copilot/extensions/`
3. Inside the extension folder, install dependencies:

```bash
   npm install
```

4. Restart or reload extensions in the Copilot app

## Developing extensions

Each extension lives in its own folder under `extensions/` and must contain:

- `extension.mjs` — the entry point that registers canvases/tools with the Copilot SDK
- `package.json` — declares dependencies

## License

MIT