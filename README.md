# Obsidian Scroll Editor Plugin

This plugin adds scroll commands for Obsidian editor.

The plugin adds `scroll-up` and `scroll-down` commands to the editor. Assign hotkeys to this commands to
scroll the editor view.

![Editor Scroll Commands](media/editor-scroll-commands.png "Editor Scroll Commands")

The commands itself do nothing, so use the hotkeys to scroll the editor.

The settings allow you to change the scroll offset and the interval.

![Editor Scroll Commands Settings](media/editor-scroll-commands-settings.png "Editor Scroll Commands Settings")

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

