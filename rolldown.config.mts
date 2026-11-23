import { defineConfig, type Plugin } from "rolldown";
import { bundledLanguagesInfo } from "shiki/langs";

async function getGrammarFiles(): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const index: Record<string, string[]> = {};

  const languages = await Promise.all(
    bundledLanguagesInfo.map(async (info) => ({
      info,
      grammars: (await info.import()).default,
    })),
  );

  for (const { info, grammars } of languages) {
    const names = [...new Set(grammars.map(({ name }) => name))];

    for (const grammar of grammars) {
      files.set(grammar.name, JSON.stringify(grammar));
    }

    for (const key of [info.id, ...(info.aliases ?? [])]) {
      index[key] = names;
    }
  }

  files.set("index", JSON.stringify(index));

  return files;
}

// Writes each of shiki's grammars to `grammars/<name>.json`, plus
// `grammars/index.json`, which maps every language id and alias to the
// grammars it needs, in load order. The extension reads them on demand, so
// they don't have to be parsed with the bundle at startup.
function grammarsPlugin(): Plugin {
  let grammarFiles: Promise<Map<string, string>> | undefined;

  return {
    name: "grammars",
    async generateBundle() {
      grammarFiles ??= getGrammarFiles();

      for (const [name, source] of await grammarFiles) {
        this.emitFile({
          type: "asset",
          fileName: `grammars/${name}.json`,
          source,
        });
      }
    },
  };
}

// Bundles the extension and its dependencies into a single file, so the
// package doesn't ship shiki's thousands of files from node_modules.
export default defineConfig({
  input: "src/extension.ts",
  platform: "node",
  external: ["vscode"],
  resolve: {
    // jsonc-parser's `main` is a UMD build whose internal requires can't be
    // bundled; its `module` build is plain ESM.
    mainFields: ["module", "main"],
  },
  plugins: [grammarsPlugin()],
  output: {
    dir: "out",
    format: "cjs",
    codeSplitting: false,
    minify: true,
    sourcemap: true,
  },
});
