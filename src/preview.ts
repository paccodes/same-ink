import { commands } from "vscode";

export function refreshPreview(): void {
  commands.executeCommand("markdown.preview.refresh").then(
    () => {},
    () => {
      // The Markdown extension may be disabled; nothing to refresh.
    },
  );
}
