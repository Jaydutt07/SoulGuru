import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const args = new Set(process.argv.slice(2));
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};
const allowMissingEnv = args.has("--allow-missing-env");
const outputJson = args.has("--json");

const schemaContract = [
  {
    table: "user_profiles",
    columns: [
      "id",
      "auth_user_id",
      "phone",
      "email",
      "full_name",
      "birth_date",
      "birth_time",
      "birth_place",
      "birth_latitude",
      "birth_longitude",
      "birth_timezone",
      "birth_timezone_offset_minutes",
      "birth_place_resolved_label",
      "birth_place_resolution_source",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "daily_soul_readings",
    columns: [
      "id",
      "user_profile_id",
      "user_key",
      "reading_date",
      "timezone",
      "astrology_context",
      "reading",
      "model",
      "prompt_version",
      "created_at"
    ]
  },
  {
    table: "more_guidance_subscriptions",
    columns: [
      "id",
      "user_profile_id",
      "user_key",
      "plan_name",
      "status",
      "starts_at",
      "ends_at",
      "astro_bonus_questions",
      "provider",
      "provider_payment_id",
      "provider_subscription_id",
      "metadata",
      "created_at"
    ]
  },
  {
    table: "saved_guidance",
    columns: [
      "id",
      "user_key",
      "user_profile_id",
      "daily_reading_id",
      "note",
      "reading",
      "created_at"
    ]
  },
  {
    table: "astro_solve_questions",
    columns: [
      "id",
      "user_profile_id",
      "user_key",
      "question",
      "answer",
      "astrology_context",
      "source",
      "model",
      "prompt_version",
      "created_at"
    ]
  },
  {
    table: "payment_events",
    columns: [
      "provider_event_id",
      "provider",
      "event_name",
      "payload",
      "processed_at",
      "created_at"
    ]
  },
  {
    table: "auth_otp_challenges",
    columns: [
      "id",
      "phone",
      "email",
      "purpose",
      "code_hash",
      "delivery_channel",
      "attempts",
      "expires_at",
      "verified_at",
      "metadata",
      "created_at"
    ]
  },
  {
    table: "more_guidance_readings",
    columns: [
      "id",
      "user_profile_id",
      "user_key",
      "reading_date",
      "timezone",
      "astrology_context",
      "guidance",
      "model",
      "prompt_version",
      "created_at"
    ]
  }
];

const missingEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !hasEnv(env, key));
if (missingEnv.length > 0) {
  const report = buildReport({
    status: allowMissingEnv ? "skipped" : "missing_env",
    checks: [],
    missingEnv
  });
  printReport(report);
  process.exit(allowMissingEnv ? 0 : 1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const checks = [];
for (const item of schemaContract) {
  checks.push(await checkTable(item));
}

const failed = checks.filter((check) => check.status === "fail");
const report = buildReport({
  status: failed.length ? "fail" : "pass",
  checks,
  missingEnv: []
});

printReport(report);
if (failed.length > 0) {
  process.exit(1);
}

async function checkTable({ table, columns }) {
  const select = columns.join(",");
  const { error } = await supabase
    .from(table)
    .select(select, { head: true, count: "exact" });

  if (!error) {
    return {
      table,
      status: "pass",
      columns,
      error: ""
    };
  }

  return {
    table,
    status: "fail",
    columns,
    error: sanitizeSupabaseError(error)
  };
}

function buildReport({ status, checks, missingEnv }) {
  const projectHost = safeHost(env.SUPABASE_URL);
  return {
    service: "SoulGuru Supabase schema",
    status,
    generatedAt: new Date().toISOString(),
    projectHost,
    summary: {
      total: schemaContract.length,
      passing: checks.filter((check) => check.status === "pass").length,
      failing: checks.filter((check) => check.status === "fail").length,
      skipped: status === "skipped" ? schemaContract.length : 0
    },
    missingEnv,
    checks
  };
}

function printReport(report) {
  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (report.status === "skipped") {
    console.log(`SoulGuru Supabase schema check: skipped (${report.missingEnv.join(", ")} not configured).`);
    return;
  }

  if (report.status === "missing_env") {
    console.error(`SoulGuru Supabase schema check failed: missing ${report.missingEnv.join(", ")}.`);
    return;
  }

  console.log(`SoulGuru Supabase schema check: ${report.status}`);
  console.log(`Generated: ${report.generatedAt}`);
  if (report.projectHost) {
    console.log(`Project: ${report.projectHost}`);
  }
  console.log(`Checks: ${report.summary.passing}/${report.summary.total} passing`);
  console.log("");

  for (const check of report.checks) {
    const marker = check.status === "pass" ? "PASS" : "FAIL";
    console.log(`${marker} ${check.table}`);
    if (check.error) {
      console.log(`  ${check.error}`);
    }
  }
}

function sanitizeSupabaseError(error) {
  return String(error?.message || error?.details || "Unknown Supabase error")
    .replaceAll(env.SUPABASE_SERVICE_ROLE_KEY || "", "[redacted]")
    .replaceAll(env.SUPABASE_URL || "", "[supabase-url]");
}

function hasEnv(source, name) {
  return Boolean(String(source[name] || "").trim());
}

function safeHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
