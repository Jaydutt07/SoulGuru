import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const requiredMigrationFiles = [
  "001_initial_schema.sql",
  "002_payment_events.sql",
  "003_astro_solves_metadata.sql",
  "004_saved_guidance_profile.sql",
  "005_auth_otp_challenges.sql",
  "006_unique_subscription_payments.sql",
  "007_birth_place_resolution.sql",
  "008_more_guidance_readings.sql",
  "009_unique_subscription_provider_ids.sql",
  "010_schema_contract_rpc.sql",
  "011_schema_contract_constraints.sql",
  "012_shani_membership.sql"
];

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

const requiredIndexes = [
  "daily_soul_readings_user_date_idx",
  "subscriptions_user_status_idx",
  "saved_guidance_user_created_idx",
  "astro_questions_user_created_idx",
  "payment_events_provider_created_idx",
  "subscriptions_provider_payment_idx",
  "astro_questions_prompt_user_idx",
  "saved_guidance_profile_created_idx",
  "auth_otp_phone_created_idx",
  "auth_otp_expires_idx",
  "subscriptions_provider_payment_unique_idx",
  "subscriptions_provider_subscription_unique_idx",
  "more_guidance_readings_user_date_idx",
  "shani_memberships_user_status_idx",
  "shani_memberships_provider_payment_idx",
  "shani_memberships_provider_payment_unique_idx",
  "shani_memberships_provider_subscription_unique_idx",
  "shani_pandit_messages_user_created_idx",
  "shani_pandit_messages_membership_created_idx"
];

const checks = [];
const migrations = readMigrations();
const combinedSql = migrations.map((migration) => migration.sql).join("\n\n");
const normalizedSql = normalizeSql(combinedSql);

checkMigrationFiles();
checkNoDestructiveStatements();
checkSchemaContract();
checkRlsContract();
checkIndexesAndIdempotency();
checkCriticalDefaults();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function readMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({
      file,
      sql: fs.readFileSync(path.join(migrationsDir, file), "utf8")
    }));
}

function checkMigrationFiles() {
  const files = migrations.map((migration) => migration.file);
  pushCheck("Supabase migration files are present and ordered", [
    files.length === requiredMigrationFiles.length,
    requiredMigrationFiles.every((file, index) => files[index] === file)
  ].every(Boolean));
}

function checkNoDestructiveStatements() {
  pushCheck("Supabase migrations avoid destructive statements", !/\b(drop\s+table|drop\s+column|truncate\s+table|delete\s+from\s+public\.)\b/i.test(combinedSql));
}

function checkSchemaContract() {
  for (const item of schemaContract) {
    pushCheck(`Supabase table ${item.table} has required columns`, [
      hasTable(item.table),
      item.columns.every((column) => hasColumn(item.table, column))
    ].every(Boolean));
  }
}

function checkRlsContract() {
  for (const item of schemaContract) {
    pushCheck(`Supabase table ${item.table} has service-role RLS`, [
      contains(`alter table public.${item.table} enable row level security`),
      hasServiceRolePolicy(item.table)
    ].every(Boolean));
  }
}

function checkIndexesAndIdempotency() {
  pushCheck("Supabase migrations define required indexes", requiredIndexes.every((indexName) => contains(`index if not exists ${indexName}`)));
  pushCheck("Daily Soul Guru cache is unique per user/date/prompt", hasUniqueTuple("daily_soul_readings", ["user_key", "reading_date", "prompt_version"]));
  pushCheck("More Guidance cache is unique per user/date/prompt", hasUniqueTuple("more_guidance_readings", ["user_key", "reading_date", "prompt_version"]));
  pushCheck("Razorpay payment activation is idempotent", [
    contains("create unique index if not exists subscriptions_provider_payment_unique_idx"),
    contains("where provider_payment_id is not null")
  ].every(Boolean));
  pushCheck("Razorpay subscription activation is idempotent", [
    contains("create unique index if not exists subscriptions_provider_subscription_unique_idx"),
    contains("where provider_subscription_id is not null")
  ].every(Boolean));
  pushCheck("Payment webhook events are idempotent by provider event id", /\bprovider_event_id\s+text\s+primary\s+key\b/i.test(combinedSql));
  pushCheck("Shani remedy payment activation is idempotent", [
    contains("create unique index if not exists shani_memberships_provider_payment_unique_idx"),
    contains("create unique index if not exists shani_memberships_provider_subscription_unique_idx"),
    contains("where provider_payment_id is not null"),
    contains("where provider_subscription_id is not null")
  ].every(Boolean));
}

function checkCriticalDefaults() {
  pushCheck("More Guidance subscription defaults include plan and 15 Astro Solves", [
    /plan_name\s+text\s+not\s+null\s+default\s+'Soul Guru \+ Astro Solve'/i.test(combinedSql),
    /astro_bonus_questions\s+integer\s+not\s+null\s+default\s+15/i.test(combinedSql)
  ].every(Boolean));
  pushCheck("OTP challenges store hashes, attempts, expiry, and verification state", [
    hasColumn("auth_otp_challenges", "code_hash"),
    hasColumn("auth_otp_challenges", "attempts"),
    hasColumn("auth_otp_challenges", "expires_at"),
    hasColumn("auth_otp_challenges", "verified_at"),
    !/\bcode\s+text\b/i.test(tableBlock("auth_otp_challenges"))
  ].every(Boolean));
  pushCheck("Location-aware profile fields are migrated", [
    hasColumn("user_profiles", "birth_timezone"),
    hasColumn("user_profiles", "birth_timezone_offset_minutes"),
    hasColumn("user_profiles", "birth_place_resolved_label"),
    hasColumn("user_profiles", "birth_place_resolution_source")
  ].every(Boolean));
  pushCheck("Live Supabase schema contract RPC is service-role only", [
    contains("create or replace function public.soulguru_schema_contract()"),
    contains("returns jsonb"),
    contains("from pg_indexes"),
    contains("from information_schema.key_column_usage"),
    contains("'constraints'"),
    contains("grant execute on function public.soulguru_schema_contract() to service_role"),
    contains("revoke all on function public.soulguru_schema_contract() from anon"),
    contains("revoke all on function public.soulguru_schema_contract() from authenticated")
  ].every(Boolean));
}

function hasTable(table) {
  return contains(`create table if not exists public.${table}`);
}

function hasColumn(table, column) {
  const block = tableBlock(table);
  if (new RegExp(`(^|\\n)\\s*${escapeRegex(column)}\\b`, "i").test(block)) {
    return true;
  }

  const alterStatements = statementsForTable(table);
  return alterStatements.some((statement) => new RegExp(`add\\s+column\\s+if\\s+not\\s+exists\\s+${escapeRegex(column)}\\b`, "i").test(statement));
}

function tableBlock(table) {
  const match = combinedSql.match(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${escapeRegex(table)}\\s*\\(([\\s\\S]*?)\\n\\);`, "i"));
  return match?.[1] || "";
}

function statementsForTable(table) {
  return combinedSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => new RegExp(`^alter\\s+table\\s+public\\.${escapeRegex(table)}\\b`, "i").test(statement));
}

function hasServiceRolePolicy(table) {
  const policyPattern = new RegExp(
    `create\\s+policy\\s+\"[^\"]+\"\\s+on\\s+public\\.${escapeRegex(table)}\\s+for\\s+all\\s+using\\s*\\(\\s*auth\\.role\\(\\)\\s*=\\s*'service_role'\\s*\\)\\s+with\\s+check\\s*\\(\\s*auth\\.role\\(\\)\\s*=\\s*'service_role'\\s*\\)`,
    "i"
  );
  return policyPattern.test(combinedSql);
}

function hasUniqueTuple(table, columns) {
  const tuplePattern = columns.join("\\s*,\\s*");
  return new RegExp(`unique\\s*\\(\\s*${tuplePattern}\\s*\\)`, "i").test(tableBlock(table));
}

function contains(fragment) {
  return normalizedSql.includes(normalizeSql(fragment));
}

function normalizeSql(value) {
  return String(value || "")
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Supabase migration contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
