// PreToolUse guard: blocks actions that break the Tazko workflow rules (exit 2 = block).
// Fails open on bad input so it never wedges a session.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, relative, resolve, sep } from "node:path";

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const block = (msg) => {
  process.stderr.write(`guard: ${msg}\n`);
  process.exit(2);
};

const root = resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
const tool = input.tool_name;
const ti = input.tool_input || {};

const isEnvFile = (p) => {
  const n = basename(p);
  return /^\.env(\..+)?$/.test(n) && n !== ".env.example";
};

if (tool === "Read" || tool === "Edit" || tool === "Write" || tool === "MultiEdit") {
  const file = ti.file_path;
  if (!file) process.exit(0);
  if (isEnvFile(file)) block("secrets files (.env*) are off limits; use .env.example only (rule 8).");
  if (tool !== "Read") {
    const rel = relative(root, resolve(file));
    if (!rel.startsWith("..") && rel.split(sep)[0] === "design") {
      block("design/ is the visual reference and is read-only.");
    }
  }
  process.exit(0);
}

if (tool === "Bash") {
  const cmd = String(ti.command || "");
  if (/\bgit\b[^\n;&|]*\s--no-verify\b/.test(cmd)) block("--no-verify is not allowed; fix the hook failure.");
  if (/\bgit\s+push\b[^\n;&|]*(\s-f\b|--force)/.test(cmd)) block("force push is not allowed.");
  if (/\bgit\s+add\b[^\n;&|]*\.env(?!\.example)\b/.test(cmd)) block("never stage .env files (rule 8).");
  if (/\bgit\s+(commit|merge|rebase|reset)\b/.test(cmd) || /\bgit\s+push\b/.test(cmd)) {
    const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, encoding: "utf8", shell: false });
    const branch = (r.stdout || "").trim();
    if ((branch === "main" || branch === "dev") && /\bgit\s+(commit|rebase|reset)\b/.test(cmd)) {
      block(`work goes on a milestone branch (mN-slug from dev), not ${branch} (rule 2).`);
    }
    // Release step (merge dev into main, tag) is human-approved: ask instead of block.
    if (/\bgit\s+push\b[^\n;&|]*\b(main|dev)\b/.test(cmd)) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: "Push to main/dev: allow only for an approved merge or release (rules 2, 5, 9).",
          },
        }),
      );
      process.exit(0);
    }
  }
}
process.exit(0);
