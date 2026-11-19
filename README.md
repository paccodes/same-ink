<p align="center"><img src="icons/icon.png" width="256" alt="Same Ink icon"></p>

# Same Ink

VS Code's built-in Markdown preview colors code blocks with its own fixed light and dark palettes, ignoring your editor theme, so snippets in the preview never quite match the code you're writing.

Same Ink highlights code blocks in VS Code's Markdown preview with **your current editor color theme**, so snippets in the preview look the same as in the editor.

## Features

- Uses the exact token colors of the active theme, built-in or installed from an extension.
- Follows theme switches, including automatic light/dark switching (`window.autoDetectColorScheme`).
- Loads language grammars on demand: a block in a new language appears plain for a moment, then the preview refreshes with highlighting.
- Leaves the code block background and border to the preview, so blocks use the theme's `textCodeBlock.background` and stay distinct from the page.

Highlighting is done by [Shiki](https://shiki.style), which supports [200+ languages](https://shiki.style/languages).

## Usage

Install the extension and open any Markdown preview (`Ctrl+Shift+V`).

## Limitations

- Themes that use the legacy `.tmTheme` format only contribute their base colors, not token colors.
- The preview follows the theme you select, not the themes you hover over in the theme picker.
- Semantic highlighting from language servers isn't available in the preview, so colors match the editor's TextMate highlighting.

## Development

```sh
npm install
npm run compile   # or: npm run watch
```

Press `F5` in VS Code to launch an Extension Development Host with the extension loaded.

To build and install a `.vsix`:

```sh
npm run package
code --install-extension same-ink.vsix
```

Bump `version` in `package.json` before reinstalling, so VS Code picks up the new build.

## Publishing

`npm run publish` compiles, packages `same-ink.vsix`, and publishes that same file to both registries:

| Script | Registry | Token |
|---|---|---|
| `npm run publish:vsce` | [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) | `VSCE_PAT` |
| `npm run publish:ovsx` | [Open VSX](https://open-vsx.org) (VSCodium, Code - OSS, Cursor…) | `OVSX_PAT` |

Before the first publish, set `publisher` in `package.json` to your publisher ID on both registries, and bump `version` for every release (`npm version patch`).

## License

[MIT](LICENSE)
