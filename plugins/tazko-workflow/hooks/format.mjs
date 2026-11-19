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
const prettierExts = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".html",
  ".md",
  ".yml",
  ".yaml",
]);

// Never use a shell: arguments stay a separate argv list, so a file name cannot become a command.
function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, stdio: "ignore", shell: false });
}

// Reject names that a Windows .cmd shim could misread as shell syntax.
if (/[&|<>^%"`$;\r\n]/.test(file)) process.exit(0);
const abs = resolve(file);

if (ext === ".py") {
  const r = run("ruff", ["format", "--", abs]);
  if (r.status !== 0) run("uvx", ["ruff", "format", "--", abs]);
} else if (prettierExts.has(ext)) {
  // Run the project's own prettier through node (no npx, no .cmd shim, no download).
  // Node refuses to spawn .cmd files without a shell, so call the JS entry point.
  const prettier = resolve(root, "node_modules", "prettier", "bin", "prettier.cjs");
  if (existsSync(prettier)) run(process.execPath, [prettier, "--write", "--", abs]);
}
process.exit(0);
