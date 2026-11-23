import type { ThemeRegistration } from "shiki";

export interface ThemeContribution {
  id?: string;
  label?: string;
  path: string;
  uiTheme?: string;
}

export type ThemeFile = ThemeRegistration & { include?: string };
