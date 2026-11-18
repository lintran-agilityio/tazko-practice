// PostToolUse hook: format the edited file. Skips design/. Never blocks (always exits 0).
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, relative, resolve, sep } from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const file = input?.tool_input?.file_path;
if (!file || !existsSync(file)) process.exit(0);

const root = resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
const rel = relative(root, resolve(file));
if (rel.startsWith("..")) process.exit(0);
if (rel.split(sep)[0] === "design") process.exit(0);

const ext = extname(file).toLowerCase();
const prettierExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".html", ".md", ".yml", ".yaml"]);

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, stdio: "ignore", shell: process.platform === "win32" });
}

if (ext === ".py") {
  const r = run("ruff", ["format", file]);
  if (r.status !== 0) run("uvx", ["ruff", "format", file]);
} else if (prettierExts.has(ext)) {
  // --no-install: use the project's prettier only, never download.
  run("npx", ["--no-install", "prettier", "--write", file]);
}
process.exit(0);
