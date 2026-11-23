import { join } from "path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getActiveColorTheme,
  getThemeContributionAndExtensionPath,
  getThemeFile,
} from "../src/theme";
import type { ThemeContribution } from "../src/types";

import {
  ColorThemeKind,
  extensions,
  reset,
  settings,
  window,
} from "./vscode";

const fixture = (name: string) => join(__dirname, "fixtures", name);

function installExtension(
  extensionPath: string,
  themes: ThemeContribution[],
): void {
  extensions.all.push({
    extensionPath,
    packageJSON: { contributes: { themes } },
  });
}

beforeEach(reset);

describe("getThemeFile", () => {
  it("reads a theme file with comments", () => {
    const theme = getThemeFile(fixture("base.json"));

    expect(theme.colors).toEqual({
      "editor.background": "#000000",
      "editor.foreground": "#ffffff",
    });
    expect(theme.tokenColors).toEqual([
      { scope: "comment", settings: { foreground: "#333333" } },
    ]);
  });

  it("merges an included base theme, letting the including theme win", () => {
    const theme = getThemeFile(fixture("child.json"));

    expect(theme.colors).toEqual({
      "editor.background": "#101010",
      "editor.foreground": "#ffffff",
    });
    expect(theme.semanticTokenColors).toEqual({
      variable: "#111111",
      function: "#999999",
    });
    expect(theme.tokenColors).toEqual([
      { scope: "comment", settings: { foreground: "#333333" } },
      { scope: "string", settings: { foreground: "#444444" } },
    ]);
  });

  it("follows includes transitively", () => {
    const theme = getThemeFile(fixture("grandchild.json"));

    expect(theme.tokenColors?.map(({ scope }) => scope)).toEqual([
      "comment",
      "string",
      "keyword",
    ]);
  });

  it("drops tokenColors given as a file path", () => {
    expect(getThemeFile(fixture("token-colors-path.json")).tokenColors).toEqual(
      [],
    );
  });

  it("defaults tokenColors to an empty list", () => {
    expect(getThemeFile(fixture("empty.json")).tokenColors).toEqual([]);
  });

  it("throws a clear error on an include cycle", () => {
    expect(() => getThemeFile(fixture("cycle-a.json"))).toThrow(
      /Theme include cycle: .*cycle-a\.json -> .*cycle-b\.json -> .*cycle-a\.json/,
    );
  });
});

describe("getThemeContributionAndExtensionPath", () => {
  it("finds a theme by id or by label", () => {
    installExtension("/ext/a", [
      { id: "theme-a", label: "Theme A", path: "a.json" },
    ]);

    expect(getThemeContributionAndExtensionPath("theme-a")?.extensionPath).toBe(
      "/ext/a",
    );
    expect(getThemeContributionAndExtensionPath("Theme A")?.extensionPath).toBe(
      "/ext/a",
    );
  });

  it("prefers an id match over an earlier extension's label match", () => {
    installExtension("/ext/a", [{ label: "Monokai", path: "a.json" }]);
    installExtension("/ext/b", [
      { id: "Monokai", label: "Monokai Pro", path: "b.json" },
    ]);

    expect(getThemeContributionAndExtensionPath("Monokai")).toEqual({
      extensionPath: "/ext/b",
      themeContribution: { id: "Monokai", label: "Monokai Pro", path: "b.json" },
    });
  });

  it("returns undefined for an unknown theme", () => {
    installExtension("/ext/a", [{ id: "theme-a", path: "a.json" }]);

    expect(getThemeContributionAndExtensionPath("theme-b")).toBeUndefined();
  });

  it("ignores extensions without theme contributions", () => {
    extensions.all.push({ extensionPath: "/ext/none", packageJSON: {} });
    installExtension("/ext/a", [{ id: "theme-a", path: "a.json" }]);

    expect(getThemeContributionAndExtensionPath("theme-a")?.extensionPath).toBe(
      "/ext/a",
    );
  });
});

describe("getActiveColorTheme", () => {
  beforeEach(() => {
    installExtension("/ext/themes", [
      { id: "Light", path: "light.json", uiTheme: "vs" },
      { id: "Dark", path: "dark.json", uiTheme: "vs-dark" },
      { id: "HC Light", path: "hc-light.json", uiTheme: "hc-light" },
      { id: "HC Dark", path: "hc-dark.json", uiTheme: "hc-black" },
    ]);
    settings.set("workbench.colorTheme", "Dark");
    settings.set("workbench.preferredLightColorTheme", "Light");
    settings.set("workbench.preferredDarkColorTheme", "Dark");
    settings.set("workbench.preferredHighContrastLightColorTheme", "HC Light");
    settings.set("workbench.preferredHighContrastColorTheme", "HC Dark");
  });

  it("uses workbench.colorTheme by default", () => {
    expect(getActiveColorTheme()).toBe("Dark");
  });

  it("uses the preferred theme for the OS color scheme when auto-detecting", () => {
    settings.set("window.autoDetectColorScheme", true);
    window.activeColorTheme.kind = ColorThemeKind.Light;

    expect(getActiveColorTheme()).toBe("Light");
  });

  it("uses the preferred high contrast theme when auto-detecting it", () => {
    settings.set("window.autoDetectHighContrast", true);
    window.activeColorTheme.kind = ColorThemeKind.HighContrastLight;

    expect(getActiveColorTheme()).toBe("HC Light");

    window.activeColorTheme.kind = ColorThemeKind.HighContrast;

    expect(getActiveColorTheme()).toBe("HC Dark");
  });

  it("skips a candidate whose kind doesn't match the active theme", () => {
    settings.set("window.autoDetectColorScheme", true);
    settings.set("workbench.colorTheme", "Dark");
    settings.set("workbench.preferredDarkColorTheme", "Light");
    window.activeColorTheme.kind = ColorThemeKind.Dark;

    expect(getActiveColorTheme()).toBe("Dark");
  });

  it("falls back to the first configured theme when none matches the kind", () => {
    settings.set("workbench.colorTheme", "Unknown Theme");

    expect(getActiveColorTheme()).toBe("Unknown Theme");
  });

  it("returns undefined when no theme is configured", () => {
    settings.clear();

    expect(getActiveColorTheme()).toBeUndefined();
  });
});
