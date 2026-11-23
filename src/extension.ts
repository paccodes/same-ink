import type MarkdownIt from "markdown-it" with { "resolution-mode": "import" };
import { ExtensionContext, extensions, window, workspace } from "vscode";

import {
  createHighlighter,
  getHighlightedCodeBlock,
  loadTheme,
} from "./highlighter";
import { refreshPreview } from "./preview";
import { affectsActiveColorTheme, getActiveColorTheme } from "./theme";

export async function activate(context: ExtensionContext) {
  let theme: string | undefined;
  let lastColorTheme: string | undefined;

  await createHighlighter();

  const reload = async () => {
    const activeColorTheme = getActiveColorTheme();

    if (activeColorTheme === lastColorTheme) {
      return;
    }

    lastColorTheme = activeColorTheme;

    const loadedTheme = await loadTheme(activeColorTheme).catch(
      () => undefined,
    );

    // If the color theme changed again while this one was loading, a newer
    // reload call now owns the theme. Don't overwrite it with this stale one.
    if (activeColorTheme !== lastColorTheme) {
      return;
    }

    theme = loadedTheme;

    refreshPreview();
  };

  await reload();

  context.subscriptions.push(
    window.onDidChangeActiveColorTheme(reload),
    workspace.onDidChangeConfiguration((event) => {
      if (affectsActiveColorTheme(event)) {
        void reload();
      }
    }),
    extensions.onDidChange(() => {
      if (!theme) {
        lastColorTheme = undefined;

        void reload();
      }
    }),
  );

  return {
    extendMarkdownIt(markdown: MarkdownIt): MarkdownIt {
      return markdown.set({
        highlight: (code: string, language: string) =>
          getHighlightedCodeBlock(code, language, theme),
      });
    },
  };
}
