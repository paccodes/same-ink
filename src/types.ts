import type { ThemeRegistration } from "shiki" with {
  "resolution-mode": "import",
};

export interface ThemeContribution {
  id?: string;
  label?: string;
  path: string;
  uiTheme?: string;
}

export type ThemeFile = ThemeRegistration & { include?: string };
