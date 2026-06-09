<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/copilot-banner.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/copilot-banner.svg">
  <img alt="Copilot Extensions" src=".github/copilot-banner.svg" width="100%">
</picture>

<br/>

[![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-Extensions-8534F3?style=for-the-badge&logo=githubcopilot&logoColor=white)](https://github.com/features/copilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

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