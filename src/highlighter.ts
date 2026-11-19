import { join } from "path";
import type { BundledLanguage, Highlighter } from "shiki" with {
  "resolution-mode": "import",
};
import { commands } from "vscode";

import { getThemeContributionAndExtensionPath, getThemeFile } from "./theme";

const requestedLanguages = new Set<string>();

let isSpecialLang: (lang: string) => boolean;
let highlighter: Highlighter;
let theme: string | undefined;

async function requestLanguage(language: string): Promise<void> {
  if (requestedLanguages.has(language)) {
    return;
  }

  requestedLanguages.add(language);

  try {
    await highlighter.loadLanguage(language as BundledLanguage);
  } catch {
    return;
  }

  refreshPreview();
}

export function refreshPreview(): void {
  commands.executeCommand("markdown.preview.refresh");
}

export async function createHighlighter(): Promise<void> {
  const shiki = await import("shiki");

  isSpecialLang = shiki.isSpecialLang;
  highlighter = await shiki.createHighlighter({ themes: [], langs: [] });
}

export function getTheme(): string | undefined {
  return theme;
}

export function setTheme(name: string | undefined): void {
  theme = name;
}

export async function loadTheme(
  name: string | undefined,
): Promise<string | undefined> {
  if (!name || highlighter.getLoadedThemes().includes(name)) {
    return name;
  }

  const themeContributionAndExtensionPath =
    getThemeContributionAndExtensionPath(name);

  if (!themeContributionAndExtensionPath) {
    return undefined;
  }

  const { extensionPath, themeContribution } =
    themeContributionAndExtensionPath;
  const themeFile = getThemeFile(join(extensionPath, themeContribution.path));
  const type =
    themeContribution.uiTheme === "vs" ||
    themeContribution.uiTheme === "hc-light"
      ? "light"
      : "dark";

  await highlighter.loadTheme({
    ...themeFile,
    name,
    type,
  });

  return name;
}

export function getHighlightedCodeBlock(
  code: string,
  language: string,
): string {
  if (!theme) {
    return "";
  }

  const lang = language.trim().toLowerCase();

  if (
    !isSpecialLang(lang) &&
    !highlighter.getLoadedLanguages().includes(lang)
  ) {
    void requestLanguage(lang);

    return "";
  }

  try {
    return highlighter.codeToHtml(code, {
      lang,
      theme,
      rootStyle: false,
    });
  } catch {
    return "";
  }
}
