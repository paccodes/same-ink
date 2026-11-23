import { readFile } from "fs/promises";
import { join } from "path";
import {
  createHighlighterCore,
  type HighlighterCore,
  isSpecialLang,
  type LanguageRegistration,
} from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import { refreshPreview } from "./preview";
import { getThemeContributionAndExtensionPath, getThemeFile } from "./theme";

// Written by the build next to the bundle (see rolldown.config.mts).
const grammarsPath = join(__dirname, "grammars");

const requestedLanguages = new Set<string>();
const grammarCache = new Map<string, Promise<LanguageRegistration>>();

let grammarIndex: Record<string, string[]>;
let highlighter: HighlighterCore;

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(
    await readFile(join(grammarsPath, `${name}.json`), "utf8"),
  ) as T;
}

function readGrammar(name: string): Promise<LanguageRegistration> {
  let grammar = grammarCache.get(name);

  if (!grammar) {
    grammar = readJson<LanguageRegistration>(name);
    grammarCache.set(name, grammar);
  }

  return grammar;
}

async function requestLanguage(language: string): Promise<void> {
  if (requestedLanguages.has(language)) {
    return;
  }

  requestedLanguages.add(language);

  if (!Object.hasOwn(grammarIndex, language)) {
    return;
  }

  try {
    const grammars = await Promise.all(grammarIndex[language].map(readGrammar));

    await highlighter.loadLanguage(...grammars);
  } catch {
    return;
  }

  refreshPreview();
}

export async function createHighlighter(): Promise<void> {
  [grammarIndex, highlighter] = await Promise.all([
    readJson<Record<string, string[]>>("index"),
    createHighlighterCore({
      themes: [],
      langs: [],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    }),
  ]);
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
  theme: string | undefined,
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
