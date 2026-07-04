import { loadEnv } from "vite";
import { createSupabaseAdmin } from "../src/backend/supabaseAdmin.js";

const args = new Set(process.argv.slice(2));
const allowMissingEnv = args.has("--allow-missing-env");
const outputJson = args.has("--json");
const includeSamples = args.has("--include-samples");
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const days = clampNumber(getArgValue("--days"), 1, 365, 30);
const limit = clampNumber(getArgValue("--limit"), 1, 1000, 250);
const fixtureJson = getArgValue("--fixture-json");
const SOUL_WISDOM_MAX_MISS_RATE = 0.02;
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

try {
  const rows = fixtureJson ? parseFixtureRows(fixtureJson) : await loadFeedbackRows();
  const report = buildFeedbackReport(rows, {
    days,
    includeSamples,
    generatedAt: new Date().toISOString(),
    limit,
    source: fixtureJson ? "fixture" : "supabase"
  });
  printReport(report);
} catch (error) {
  fail(error.message || "Unable to create Soul Guru feedback report.");
}

async function loadFeedbackRows() {
  const missingEnv = getMissingSupabaseEnv(env);
  if (missingEnv.length > 0) {
    if (allowMissingEnv) {
      printSkip(`missing ${missingEnv.join(", ")}`);
      process.exit(0);
    }
    fail(`Missing Supabase configuration: ${missingEnv.join(", ")}.`);
  }

  const supabase = createSupabaseAdmin(env);
  if (!supabase) {
    fail("Supabase admin client could not be created.");
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("soul_wisdom_feedback")
    .select("prompt_version,rating,reason,reading_date,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    fail(`Unable to read Soul Guru feedback: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

function buildFeedbackReport(rows, options) {
  const safeRows = rows.map(normalizeFeedbackRow).filter(Boolean);
  const totals = countRatings(safeRows);
  const versions = [...groupRows(safeRows, (row) => row.promptVersion).entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([promptVersion, versionRows]) => ({
      promptVersion,
      ...countRatings(versionRows)
    }));
  const missedRows = safeRows.filter((row) => row.rating === "missed");
  const reasonThemes = [...groupRows(missedRows, (row) => classifyReason(row.reason)).entries()]
    .map(([theme, themeRows]) => ({ theme, count: themeRows.length }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
  const nextFocus = buildNextFocus({ totals, reasonThemes });
  const report = {
    ok: true,
    generatedAt: options.generatedAt,
    source: options.source,
    windowDays: options.days,
    limit: options.limit,
    maxMissRate: SOUL_WISDOM_MAX_MISS_RATE,
    withinMissRateTarget: totals.total ? totals.missRate < SOUL_WISDOM_MAX_MISS_RATE : null,
    totals,
    promptVersions: versions,
    missedReasonThemes: reasonThemes,
    nextFocus
  };

  if (options.includeSamples) {
    report.sanitizedMissedSamples = missedRows
      .map((row) => sanitizeReason(row.reason))
      .filter(Boolean)
      .slice(0, 5);
  }

  return report;
}

function countRatings(rows) {
  const accurate = rows.filter((row) => row.rating === "accurate").length;
  const missed = rows.filter((row) => row.rating === "missed").length;
  const total = accurate + missed;
  return {
    total,
    accurate,
    missed,
    missRate: total ? Number((missed / total).toFixed(4)) : 0
  };
}

function normalizeFeedbackRow(row) {
  const rating = String(row?.rating || "").toLowerCase().trim();
  if (!["accurate", "missed"].includes(rating)) return null;
  return {
    promptVersion: sanitizePromptVersion(row?.prompt_version || row?.promptVersion),
    rating,
    reason: String(row?.reason || ""),
    readingDate: normalizeDate(row?.reading_date || row?.readingDate),
    createdAt: normalizeIso(row?.created_at || row?.createdAt)
  };
}

function groupRows(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row) || "unknown";
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

function classifyReason(reason) {
  const value = String(reason || "").toLowerCase();
  if (!value.trim()) return "no reason provided";
  if (/\b(generic|vague|same|repeat|repeated|template|copy|could apply|basic)\b/.test(value)) {
    return "too generic or repeated";
  }
  if (/\b(hallucinat|made up|invented|fabricated|fake|false|not true|unsupported|never happened|imagined|dreamed up)\b/.test(value)) {
    return "invented or unsupported detail";
  }
  if (/\b(wrong|inaccurate|not accurate|missed|doesn't fit|does not fit|unrelatable|not me|profile|birth)\b/.test(value)) {
    return "not personally accurate";
  }
  if (/\b(today|timing|date|tomorrow|yesterday|late|early|daily)\b/.test(value)) {
    return "daily timing mismatch";
  }
  if (/\b(practical|action|step|useful|solution|specific|what to do)\b/.test(value)) {
    return "needs clearer action";
  }
  if (/\b(tone|cold|harsh|scary|dramatic|soft|too gentle)\b/.test(value)) {
    return "tone mismatch";
  }
  return "other";
}

function buildNextFocus({ totals, reasonThemes }) {
  if (!totals.total) {
    return ["Collect at least 20 rated readings before changing the Soul Guru prompt again."];
  }

  const focus = [];
  if (totals.missRate >= SOUL_WISDOM_MAX_MISS_RATE) {
    focus.push("Review missed readings before the next prompt version; miss rate is above the 2% hallucination/miss-rate target.");
  } else {
    focus.push("Keep the current prompt stable; miss rate is below the 2% hallucination/miss-rate target.");
  }

  const topTheme = reasonThemes[0]?.theme || "";
  if (topTheme === "too generic or repeated") {
    focus.push("Tighten the prompt against reusable openings, shared sentence rhythm, and house phrases.");
  } else if (topTheme === "not personally accurate") {
    focus.push("Audit birth-place resolution, daily transit context, and the private reading fingerprint for missed cases.");
  } else if (topTheme === "invented or unsupported detail") {
    focus.push("Inspect hallucination-like misses and tighten any prompt wording that lets the model claim facts not present in the profile or daily signals.");
  } else if (topTheme === "daily timing mismatch") {
    focus.push("Check timezone, reading date, and daily cache boundaries before changing wording.");
  } else if (topTheme === "needs clearer action") {
    focus.push("Ask the model for one concrete daily action earlier in the reading, without making the tone mechanical.");
  } else if (topTheme === "tone mismatch") {
    focus.push("Tune mentor tone examples before changing chart logic.");
  }

  return focus;
}

function sanitizeReason(reason) {
  return String(reason || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[redacted-id]")
    .replace(/\b(?:sgu|swr)_[a-f0-9]{32}\b/gi, "[redacted-hash]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function sanitizePromptVersion(value) {
  const promptVersion = String(value || "unknown").trim();
  return /^soul-wisdom-v\d+$/i.test(promptVersion) ? promptVersion : "unknown";
}

function normalizeDate(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function normalizeIso(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}T/.test(date) ? date : "";
}

function parseFixtureRows(value) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error("fixture must be an array");
    }
    return parsed;
  } catch (error) {
    fail(`--fixture-json must be a JSON array: ${error.message}`);
  }
}

function getMissingSupabaseEnv(source) {
  const missing = [];
  if (!hasValue(source.SUPABASE_URL)) missing.push("SUPABASE_URL");
  if (!hasValue(source.SUPABASE_SERVICE_ROLE_KEY)) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

function hasValue(value) {
  const normalized = String(value || "").trim();
  return Boolean(normalized) && !isPlaceholderValue(normalized);
}

function isPlaceholderValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (!normalized) return true;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return true;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|fake|todo|xxx|xxxx|redacted)(?:[-_\s].*)?$/i.test(normalized)) {
    return true;
  }
  if (/^<[^>]+>$/.test(normalized)) return true;
  return false;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function printReport(report) {
  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("SoulGuru feedback report: pass");
  console.log(`Window: last ${report.windowDays} days; source=${report.source}; rows=${report.totals.total}`);
  console.log(`Miss-rate target: <${formatPercent(report.maxMissRate)} hallucination/personal-accuracy misses; status=${formatMissRateStatus(report)}`);
  console.log(`Ratings: accurate=${report.totals.accurate}; missed=${report.totals.missed}; missRate=${formatPercent(report.totals.missRate)}`);
  console.log("Prompt versions:");
  for (const version of report.promptVersions) {
    console.log(`- ${version.promptVersion}: total=${version.total}; accurate=${version.accurate}; missed=${version.missed}; missRate=${formatPercent(version.missRate)}`);
  }
  if (!report.promptVersions.length) {
    console.log("- none");
  }
  console.log("Missed reason themes:");
  for (const theme of report.missedReasonThemes) {
    console.log(`- ${theme.theme}: ${theme.count}`);
  }
  if (!report.missedReasonThemes.length) {
    console.log("- none");
  }
  if (report.sanitizedMissedSamples?.length) {
    console.log("Sanitized missed samples:");
    for (const sample of report.sanitizedMissedSamples) {
      console.log(`- ${sample}`);
    }
  }
  console.log("Next tuning focus:");
  for (const item of report.nextFocus) {
    console.log(`- ${item}`);
  }
}

function printSkip(reason) {
  if (outputJson) {
    console.log(JSON.stringify({
      ok: true,
      skipped: true,
      reason
    }, null, 2));
  } else {
    console.log(`SoulGuru feedback report: skipped (${reason}).`);
  }
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatMissRateStatus(report) {
  if (report.withinMissRateTarget === null) return "awaiting feedback";
  return report.withinMissRateTarget ? "below target" : "above target";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
