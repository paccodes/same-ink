// Stand-in for the `vscode` module, which only exists inside VS Code.
// Tests set the state below to describe the editor they run against.

export enum ColorThemeKind {
  Light = 1,
  Dark = 2,
  HighContrast = 3,
  HighContrastLight = 4,
}

export interface FakeExtension {
  extensionPath: string;
  packageJSON: unknown;
}

export const extensions = { all: [] as FakeExtension[] };

export const window = { activeColorTheme: { kind: ColorThemeKind.Dark } };

export const settings = new Map<string, unknown>();

export const workspace = {
  getConfiguration: () => ({
    get: <T>(key: string): T | undefined => settings.get(key) as T | undefined,
  }),
};

export function reset(): void {
  extensions.all = [];
  window.activeColorTheme.kind = ColorThemeKind.Dark;
  settings.clear();
}
