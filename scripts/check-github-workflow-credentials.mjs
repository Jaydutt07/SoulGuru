import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const repo = getArgValue("--repo") || process.env.GITHUB_REPOSITORY || "Jaydutt07/SoulGuru";
const host = getArgValue("--host") || "github.com";
const allowMissing = args.has("--allow-missing");
const json = args.has("--json");

const checks = [];
const ghStatus = run("gh", ["auth", "status", "-h", host], { timeout: 10_000 });
const ghText = `${ghStatus.stdout}\n${ghStatus.stderr}`;
const ghScopes = parseGhScopes(ghText);
const hasWorkflowScope = ghStatus.status === 0 && ghScopes.includes("workflow");
const sshUrl = `git@${host}:${repo}.git`;
const sshStatus = run("git", ["ls-remote", sshUrl, "HEAD"], {
  timeout: 12_000,
  env: {
    ...process.env,
    GIT_SSH_COMMAND: [
      "ssh",
      "-o", "BatchMode=yes",
      "-o", "ConnectTimeout=8",
      "-o", "StrictHostKeyChecking=accept-new"
    ].join(" ")
  }
});
const hasSshRepoAccess = sshStatus.status === 0;

pushCheck(
  "GitHub CLI is authenticated",
  ghStatus.status === 0,
  ghStatus.status === 0 ? [] : ["Run `gh auth login -h github.com` or use SSH."]
);
pushCheck(
  "GitHub CLI token includes workflow scope",
  hasWorkflowScope,
  hasWorkflowScope ? [] : ["Run `gh auth refresh -h github.com -s workflow` before pushing `.github/workflows/ci.yml`."]
);
pushCheck(
  "SSH can read the SoulGuru repo",
  hasSshRepoAccess,
  hasSshRepoAccess ? [] : [`Add an SSH key with repo access, then verify \`git ls-remote ${sshUrl} HEAD\`.`]
);

const credentialReady = hasWorkflowScope || hasSshRepoAccess;
pushCheck(
  "A workflow-file push credential path is available",
  credentialReady,
  credentialReady
    ? []
    : [
      "GitHub rejects workflow-file pushes unless the credential can update workflows.",
      "Use either a `gh` token with `workflow` scope or an SSH key with write access to the repo."
    ]
);

if (json) {
  process.stdout.write(`${JSON.stringify({
    status: credentialReady ? "ready" : "needs_credentials",
    repo,
    host,
    gh: {
      authenticated: ghStatus.status === 0,
      scopes: ghScopes,
      hasWorkflowScope
    },
    ssh: {
      url: sshUrl,
      hasRepoAccess: hasSshRepoAccess
    },
    checks
  }, null, 2)}\n`);
} else {
  printReport();
}

if (!credentialReady && !allowMissing) {
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  try {
    return spawnSync(command, commandArgs, {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: options.timeout || 10_000,
      env: options.env || process.env
    });
  } catch (error) {
    return {
      status: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseGhScopes(text) {
  const scopesLine = String(text || "")
    .split(/\r?\n/)
    .find((line) => /Token scopes:/i.test(line));
  if (!scopesLine) return [];
  return scopesLine
    .slice(scopesLine.indexOf(":") + 1)
    .split(",")
    .map((scope) => scope.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean)
    .sort();
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`GitHub workflow credential check: ${credentialReady ? "pass" : "needs_credentials"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details || []) {
      console.log(`  - ${detail}`);
    }
  }
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
