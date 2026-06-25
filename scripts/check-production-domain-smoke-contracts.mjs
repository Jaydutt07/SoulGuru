import path from "node:path";
import { spawn } from "node:child_process";

const checks = [];

await checkAllowsMissingEnvOnlyWhenExplicit();
await checkStrictMissingEnvFails();
await checkValidDomainContractPassesWithoutNetwork();
await checkWrongDomainFails();
await checkPlaceholderDomainFails();
await checkProtocolDomainFails();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkAllowsMissingEnvOnlyWhenExplicit() {
  const result = await runSmoke(["--allow-missing-env"], emptyDomainEnv());
  pushCheck("Production domain smoke skips missing env only when allowed", [
    result.status === 0,
    result.stdout.includes("skipped"),
    result.stdout.includes("PRODUCTION_DOMAIN"),
    result.stdout.includes("VITE_API_BASE_URL")
  ].every(Boolean));
}

async function checkStrictMissingEnvFails() {
  const result = await runSmoke([], emptyDomainEnv());
  pushCheck("Production domain smoke fails missing env in strict mode", [
    result.status !== 0,
    result.stderr.includes("Missing production domain configuration"),
    result.stderr.includes("CLOUDFLARE_DNS_READY=true")
  ].every(Boolean));
}

async function checkValidDomainContractPassesWithoutNetwork() {
  const result = await runSmoke(["--skip-dns", "--skip-backend"], validEnv());
  pushCheck("Production domain smoke accepts valid custom domain contract", [
    result.status === 0,
    result.stdout.includes("SoulGuru production domain smoke: pass"),
    result.stdout.includes("PASS Production domain format"),
    result.stdout.includes("PASS Cloudflare zone id"),
    result.stdout.includes("PASS Production API domain")
  ].every(Boolean));
}

async function checkWrongDomainFails() {
  const result = await runSmoke(["--skip-dns", "--skip-backend"], {
    ...validEnv(),
    VITE_API_BASE_URL: "https://preview.vercel.app"
  });
  pushCheck("Production domain smoke rejects API URLs outside the production domain", [
    result.status !== 0,
    result.stdout.includes("FAIL Production API domain"),
    result.stdout.includes("must use HTTPS and the production domain")
  ].every(Boolean));
}

async function checkPlaceholderDomainFails() {
  const result = await runSmoke(["--skip-dns", "--skip-backend"], {
    ...validEnv(),
    PRODUCTION_DOMAIN: "example.com",
    VITE_API_BASE_URL: "https://example.com"
  });
  pushCheck("Production domain smoke rejects placeholder production domains", [
    result.status !== 0,
    result.stdout.includes("FAIL Production domain format"),
    result.stdout.includes("without protocol, localhost, IP, or placeholder")
  ].every(Boolean));
}

async function checkProtocolDomainFails() {
  const result = await runSmoke(["--skip-dns", "--skip-backend"], {
    ...validEnv(),
    PRODUCTION_DOMAIN: "https://soulguru.app"
  });
  pushCheck("Production domain smoke rejects protocol-bearing domain values", [
    result.status !== 0,
    result.stdout.includes("FAIL Production domain format"),
    result.stdout.includes("must be a registered domain without protocol")
  ].every(Boolean));
}

function validEnv() {
  return {
    PRODUCTION_DOMAIN: "soulguru.app",
    CLOUDFLARE_ZONE_ID: "0123456789abcdef0123456789abcdef",
    CLOUDFLARE_DNS_READY: "true",
    VITE_API_BASE_URL: "https://api.soulguru.app"
  };
}

function emptyDomainEnv() {
  return {
    PRODUCTION_DOMAIN: "",
    CLOUDFLARE_ZONE_ID: "",
    CLOUDFLARE_DNS_READY: "",
    VITE_API_BASE_URL: "",
    API_BASE_URL: ""
  };
}

function runSmoke(args = [], env = {}) {
  const smokePath = path.join(process.cwd(), "scripts", "smoke-production-domain.mjs");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [smokePath, ...args], {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "production",
        ...env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Production domain smoke contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
