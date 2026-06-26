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
    table: "soul_wisdom_generation_locks",
    columns: [
      "id",
      "user_key",
      "reading_date",
      "prompt_version",
      "lock_owner",
      "expires_at",
      "created_at"
    ]
  },
  {
    table: "more_guidance_generation_locks",
    columns: [
      "id",
      "user_key",
      "reading_date",
      "prompt_version",
      "lock_owner",
      "expires_at",
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
  },
  {
    table: "shani_remedy_memberships",
    columns: [
      "id",
      "user_profile_id",
      "user_key",
      "plan_id",
      "plan_name",
      "status",
      "starts_at",
      "ends_at",
      "provider",
      "provider_payment_id",
      "provider_subscription_id",
      "metadata",
      "created_at"
    ]
  },
  {
    table: "shani_pandit_messages",
    columns: [
      "id",
      "user_profile_id",
      "membership_id",
      "user_key",
      "question",
      "answer",
      "saade_sati_report",
      "source",
      "model",
      "prompt_version",
      "created_at"
    ]
  }
];

const indexContract = [
  {
    name: "daily_soul_readings_user_date_idx",
    table: "daily_soul_readings",
    columns: ["user_key", "reading_date"]
  },
  {
    name: "soul_wisdom_generation_locks_expiry_idx",
    table: "soul_wisdom_generation_locks",
    columns: ["expires_at"]
  },
  {
    name: "more_guidance_generation_locks_expiry_idx",
    table: "more_guidance_generation_locks",
    columns: ["expires_at"]
  },
  {
    name: "subscriptions_user_status_idx",
    table: "more_guidance_subscriptions",
    columns: ["user_key", "status", "ends_at"]
  },
  {
    name: "saved_guidance_user_created_idx",
    table: "saved_guidance",
    columns: ["user_key", "created_at"]
  },
  {
    name: "astro_questions_user_created_idx",
    table: "astro_solve_questions",
    columns: ["user_key", "created_at"]
  },
  {
    name: "payment_events_provider_created_idx",
    table: "payment_events",
    columns: ["provider", "created_at"]
  },
  {
    name: "subscriptions_provider_payment_idx",
    table: "more_guidance_subscriptions",
    columns: ["provider", "provider_payment_id"]
  },
  {
    name: "astro_questions_prompt_user_idx",
    table: "astro_solve_questions",
    columns: ["user_key", "prompt_version", "created_at"]
  },
  {
    name: "saved_guidance_profile_created_idx",
    table: "saved_guidance",
    columns: ["user_profile_id", "created_at"]
  },
  {
    name: "auth_otp_phone_created_idx",
    table: "auth_otp_challenges",
    columns: ["phone", "created_at"]
  },
  {
    name: "auth_otp_expires_idx",
    table: "auth_otp_challenges",
    columns: ["expires_at"]
  },
  {
    name: "subscriptions_provider_payment_unique_idx",
    table: "more_guidance_subscriptions",
    columns: ["provider", "provider_payment_id"],
    unique: true,
    where: "provider_payment_id is not null"
  },
  {
    name: "subscriptions_provider_subscription_unique_idx",
    table: "more_guidance_subscriptions",
    columns: ["provider", "provider_subscription_id"],
    unique: true,
    where: "provider_subscription_id is not null"
  },
  {
    name: "more_guidance_readings_user_date_idx",
    table: "more_guidance_readings",
    columns: ["user_key", "reading_date"]
  },
  {
    name: "shani_memberships_user_status_idx",
    table: "shani_remedy_memberships",
    columns: ["user_key", "status", "ends_at"]
  },
  {
    name: "shani_memberships_provider_payment_idx",
    table: "shani_remedy_memberships",
    columns: ["provider", "provider_payment_id"]
  },
  {
    name: "shani_memberships_provider_payment_unique_idx",
    table: "shani_remedy_memberships",
    columns: ["provider", "provider_payment_id"],
    unique: true,
    where: "provider_payment_id is not null"
  },
  {
    name: "shani_memberships_provider_subscription_unique_idx",
    table: "shani_remedy_memberships",
    columns: ["provider", "provider_subscription_id"],
    unique: true,
    where: "provider_subscription_id is not null"
  },
  {
    name: "shani_pandit_messages_user_created_idx",
    table: "shani_pandit_messages",
    columns: ["user_key", "created_at"]
  },
  {
    name: "shani_pandit_messages_membership_created_idx",
    table: "shani_pandit_messages",
    columns: ["membership_id", "created_at"]
  }
];

const constraintContract = [
  {
    label: "Daily Soul Guru cache is unique per user/date/prompt",
    table: "daily_soul_readings",
    columns: ["user_key", "reading_date", "prompt_version"],
    type: "UNIQUE"
  },
  {
    label: "Daily Soul Guru generation lock is unique per user/date/prompt",
    table: "soul_wisdom_generation_locks",
    columns: ["user_key", "reading_date", "prompt_version"],
    type: "UNIQUE"
  },
  {
    label: "More Guidance generation lock is unique per user/date/prompt",
    table: "more_guidance_generation_locks",
    columns: ["user_key", "reading_date", "prompt_version"],
    type: "UNIQUE"
  },
  {
    label: "More Guidance cache is unique per user/date/prompt",
    table: "more_guidance_readings",
    columns: ["user_key", "reading_date", "prompt_version"],
    type: "UNIQUE"
  },
  {
    label: "Payment webhook events are idempotent by provider event id",
    table: "payment_events",
    columns: ["provider_event_id"],
    type: "PRIMARY KEY"
  },
  ...[
    "daily_soul_readings",
    "soul_wisdom_generation_locks",
    "more_guidance_generation_locks",
    "more_guidance_subscriptions",
    "saved_guidance",
    "astro_solve_questions",
    "more_guidance_readings",
    "shani_remedy_memberships",
    "shani_pandit_messages"
  ].map((table) => ({
    label: `${table} user_key is hashed`,
    table,
    columns: [],
    type: "CHECK",
    checkIncludes: "^sgu_[a-f0-9]{32}$"
  }))
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
checks.push(...await checkSchemaRpcContract());

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
      type: "table",
      table,
      label: `table ${table}`,
      status: "pass",
      columns,
      error: ""
    };
  }

  return {
    type: "table",
    table,
    label: `table ${table}`,
    status: "fail",
    columns,
    error: sanitizeSupabaseError(error)
  };
}

async function checkSchemaRpcContract() {
  const { data, error } = await supabase.rpc("soulguru_schema_contract");

  if (error) {
    return [
      {
        type: "rpc",
        name: "soulguru_schema_contract",
        label: "schema contract RPC",
        status: "fail",
        error: sanitizeSupabaseError(error)
      }
    ];
  }

  const indexes = data?.indexes || {};
  const constraints = data?.constraints || {};
  return [
    ...indexContract.map((item) => checkIndex(item, indexes[item.name])),
    ...constraintContract.map((item) => checkConstraint(item, constraints))
  ];
}

function checkIndex(item, indexDefinition) {
  const normalized = normalizeIndexDefinition(indexDefinition);
  const expectedWhere = normalizeIndexDefinition(item.where || "");
  const requirements = [
    Boolean(indexDefinition),
    normalized.includes(` on public.${item.table} `),
    item.columns.every((column) => normalized.includes(column.toLowerCase())),
    item.unique ? normalized.startsWith("create unique index") : true,
    expectedWhere ? normalized.includes(expectedWhere) : true
  ];

  return {
    type: "index",
    name: item.name,
    label: `index ${item.name}`,
    status: requirements.every(Boolean) ? "pass" : "fail",
    table: item.table,
    columns: item.columns,
    unique: Boolean(item.unique),
    where: item.where || "",
    error: requirements.every(Boolean)
      ? ""
      : `${item.name} is missing or does not match the required ${item.table} index contract.`
  };
}

function checkConstraint(item, constraints) {
  const match = Object.entries(constraints || {}).find(([, constraint]) => (
    String(constraint?.table || "") === item.table
    && String(constraint?.type || "").toUpperCase() === item.type
    && (
      item.type === "CHECK"
        ? normalizeConstraintExpression(constraint?.check || "").includes(normalizeConstraintExpression(item.checkIncludes || ""))
        : sameColumns(constraint?.columns || [], item.columns)
    )
  ));
  const passed = Boolean(match);

  return {
    type: "constraint",
    name: match?.[0] || "",
    label: item.label,
    status: passed ? "pass" : "fail",
    table: item.table,
    columns: item.columns,
    constraintType: item.type,
    checkIncludes: item.checkIncludes || "",
    error: passed
      ? ""
      : item.type === "CHECK"
        ? `${item.table} is missing required ${item.type.toLowerCase()} constraint containing ${item.checkIncludes}.`
        : `${item.table} is missing required ${item.type.toLowerCase()} constraint on (${item.columns.join(", ")}).`
  };
}

function normalizeConstraintExpression(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/::text/g, "");
}

function buildReport({ status, checks, missingEnv }) {
  const expectedChecks = schemaContract.length + indexContract.length + constraintContract.length;
  const projectHost = safeHost(env.SUPABASE_URL);
  return {
    service: "SoulGuru Supabase schema",
    status,
    generatedAt: new Date().toISOString(),
    projectHost,
    summary: {
      total: status === "skipped" ? expectedChecks : checks.length,
      passing: checks.filter((check) => check.status === "pass").length,
      failing: checks.filter((check) => check.status === "fail").length,
      skipped: status === "skipped" ? expectedChecks : 0
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
    console.log(`${marker} ${check.label || check.table || check.name}`);
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

function normalizeIndexDefinition(value) {
  return String(value || "")
    .replace(/[()"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sameColumns(actual, expected) {
  const left = Array.isArray(actual) ? actual.map(normalizeIdentifier) : [];
  const right = expected.map(normalizeIdentifier);
  return left.length === right.length && right.every((column, index) => left[index] === column);
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
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
