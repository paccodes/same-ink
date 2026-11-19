import { readFileSync } from "fs";
import { parse } from "jsonc-parser";
import { dirname, join } from "path";
import { ColorThemeKind, extensions, window, workspace } from "vscode";

import type { ThemeContribution, ThemeFile } from "./types";

const uiThemeByKind: Record<ColorThemeKind, string> = {
  [ColorThemeKind.Light]: "vs",
  [ColorThemeKind.Dark]: "vs-dark",
  [ColorThemeKind.HighContrastLight]: "hc-light",
  [ColorThemeKind.HighContrast]: "hc-black",
};

function getTokenColors(
  theme: ThemeFile,
): NonNullable<ThemeFile["tokenColors"]> {
  return Array.isArray(theme.tokenColors) ? theme.tokenColors : [];
}

export function getThemeFile(file: string): ThemeFile {
  const themeFile: ThemeFile = parse(readFileSync(file, "utf8")) ?? {};

  if (!themeFile.include) {
    return themeFile;
  }

  const baseThemeFile = getThemeFile(join(dirname(file), themeFile.include));

  return {
    ...baseThemeFile,
    ...themeFile,
    colors: { ...baseThemeFile.colors, ...themeFile.colors },
    tokenColors: [
      ...getTokenColors(baseThemeFile),
      ...getTokenColors(themeFile),
    ],
  };
}

export function getThemeContributionAndExtensionPath(
  theme: string,
): { themeContribution: ThemeContribution; extensionPath: string } | undefined {
  for (const extension of extensions.all) {
    const themeContributions: ThemeContribution[] =
      extension.packageJSON?.contributes?.themes ?? [];
    const themeContribution = themeContributions.find(
      ({ id, label }) => id === theme || label === theme,
    );

    if (themeContribution) {
      return { themeContribution, extensionPath: extension.extensionPath };
    }
  }
}

export function getActiveColorTheme(): string | undefined {
  const configuration = workspace.getConfiguration();
  const kind = window.activeColorTheme.kind;

  const isHighContrastTheme =
    kind === ColorThemeKind.HighContrast ||
    kind === ColorThemeKind.HighContrastLight;
  const isLightTheme =
    kind === ColorThemeKind.Light || kind === ColorThemeKind.HighContrastLight;

  const candidateThemes: (string | undefined)[] = [];

  if (
    isHighContrastTheme &&
    configuration.get<boolean>("window.autoDetectHighContrast")
  ) {
    candidateThemes.push(
      configuration.get<string>(
        isLightTheme
          ? "workbench.preferredHighContrastLightColorTheme"
          : "workbench.preferredHighContrastColorTheme",
      ),
    );
  }

  if (configuration.get<boolean>("window.autoDetectColorScheme")) {
    candidateThemes.push(
      configuration.get<string>(
        isLightTheme
          ? "workbench.preferredLightColorTheme"
          : "workbench.preferredDarkColorTheme",
      ),
    );
  }

  candidateThemes.push(configuration.get<string>("workbench.colorTheme"));

  return (
    candidateThemes.find(
      (candidateTheme) =>
        candidateTheme &&
        getThemeContributionAndExtensionPath(candidateTheme)?.themeContribution
          .uiTheme === uiThemeByKind[kind],
    ) ?? candidateThemes.find(Boolean)
  );
}
