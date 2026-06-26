import { performance } from "node:perf_hooks";
import { loadEnv } from "vite";
import { buildAstrologyContext, buildTransitDateForUser } from "../src/astrologyEngine.js";
import { createDailySoulWisdom } from "../src/backend/soulWisdomService.js";
import { getDailyWisdom } from "../src/localSoulWisdom.js";
import { firstName, isLowQualityWisdom } from "../src/soulGuruPrompt.js";
import { SOUL_WISDOM_MAX_WORDS, SOUL_WISDOM_MIN_WORDS } from "../src/soulWisdomVersion.js";
import { SOUL_WISDOM_BASE_CASES } from "./soul-wisdom-quality-cases.mjs";

const includeAi = process.argv.includes("--include-ai");
const showReadings = process.argv.includes("--show-readings");
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};
const defaultDates = [
  "2026-06-24",
  "2026-06-25",
  "2026-06-26",
  "2026-06-27",
  "2026-06-28",
  "2026-06-29"
];
const dates = parseDates(getArgValue("--dates")) || defaultDates;
const maxSimilarity = Number(getArgValue("--max-similarity") || 0.28);
const maxOpeningRepeats = Number(getArgValue("--max-opening-repeats") || 2);
const users = SOUL_WISDOM_BASE_CASES.slice(0, Number(getArgValue("--profiles") || 3));
const failures = [];
const started = performance.now();

await runGroup("local", buildLocalReadings);
if (includeAi) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for --include-ai.");
  }
  await runGroup("openai", buildAiReadings);
}

const elapsedMs = Math.round(performance.now() - started);

if (failures.length) {
  console.error("\nDaily variation failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Soul Guru daily variation check: pass (${elapsedMs}ms)`);

async function runGroup(source, buildReadings) {
  console.log(`\n${source.toUpperCase()} daily variation`);
  for (const user of users) {
    const readings = await buildReadings(user);
    evaluateDailyVariationGroup({ source, user, readings });
  }
}

function evaluateDailyVariationGroup({ source, user, readings }) {
  const similarity = buildSimilarity(readings);
  const maxPair = similarity.reduce((best, item) => item.score > best.score ? item : best, { pair: "none", score: 0 });
  const highSimilarity = similarity.filter((item) => item.score > maxSimilarity);
  const openingRepeats = repeatedCounts(readings.map((item) => item.openingBucket)).filter((item) => item.count > maxOpeningRepeats);
  const transitKeys = new Set(readings.map((item) => item.transitKey));
  const dailyAreas = new Set(readings.map((item) => item.dailyArea));
  const lunarMansions = new Set(readings.map((item) => item.lunarMansion));
  const lunarDays = new Set(readings.map((item) => item.lunarDay));

  if (transitKeys.size !== readings.length) {
    failures.push(`${source} / ${user.name}: expected a unique transit fingerprint for each date, got ${transitKeys.size}/${readings.length}.`);
  }
  if (dailyAreas.size < Math.max(3, Math.ceil(readings.length * 0.75))) {
    failures.push(`${source} / ${user.name}: daily areas repeated too much (${dailyAreas.size}/${readings.length}).`);
  }
  if (lunarMansions.size < readings.length - 1) {
    failures.push(`${source} / ${user.name}: lunar mansion timing repeated too much (${lunarMansions.size}/${readings.length}).`);
  }
  if (lunarDays.size < readings.length - 1) {
    failures.push(`${source} / ${user.name}: lunar day timing repeated too much (${lunarDays.size}/${readings.length}).`);
  }
  if (highSimilarity.length) {
    failures.push(`${source} / ${user.name}: ${highSimilarity.length} date pair(s) exceeded max same-user similarity ${maxSimilarity}.`);
  }
  if (openingRepeats.length) {
    failures.push(`${source} / ${user.name}: opening bucket repeated too often (${openingRepeats.map((item) => `${item.value}=${item.count}`).join(", ")}).`);
  }

  for (const reading of readings) {
    failures.push(...reading.failures.map((failure) => `${source} / ${user.name} / ${reading.date}: ${failure}`));
  }

  console.log(`${user.name}: ${readings.length} dates; max similarity ${maxPair.score} (${maxPair.pair}); areas=${dailyAreas.size}; lunar=${lunarMansions.size}; tithi=${lunarDays.size}`);
  for (const reading of readings) {
    const repair = reading.quality?.attempts ? ` attempts=${reading.quality.attempts}` : "";
    console.log(`- ${reading.date}: ${reading.wordCount} words${repair}; area="${reading.dailyArea}"; moon=${reading.moonSign}; lunar=${reading.lunarMansion}; tithi=${reading.lunarDay}; opening=${reading.openingBucket}`);
    if (showReadings) {
      console.log(`  ${reading.wisdom}`);
    }
  }
}

function buildLocalReadings(user) {
  return dates.map((date) => evaluateDailyReading({
    user,
    date,
    result: {
      reading: getDailyWisdom(user, date),
      quality: { attempts: 0, repaired: false, passed: true }
    }
  }));
}

async function buildAiReadings(user) {
  const aiEnv = {
    ...env,
    SOUL_WISDOM_ALLOW_UNCACHED: "true",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    PINECONE_API_KEY: "",
    PINECONE_HOST: "",
    PINECONE_INDEX: ""
  };
  const readings = [];
  for (const date of dates) {
    const result = await createDailySoulWisdom({
      user,
      date,
      today: formatDateForPrompt(date)
    }, aiEnv);
    readings.push(evaluateDailyReading({ user, date, result }));
  }
  return readings;
}

function evaluateDailyReading({ user, date, result }) {
  const wisdom = result.reading?.wisdom || result.wisdom || "";
  const context = buildAstrologyContext(user, buildTransitDateForUser(user, date));
  const sentences = splitSentences(wisdom);
  const wordCount = words(wisdom).length;
  const failures = [];
  const name = firstName(user.name);

  if (wordCount < SOUL_WISDOM_MIN_WORDS || wordCount > SOUL_WISDOM_MAX_WORDS) {
    failures.push(`expected ${SOUL_WISDOM_MIN_WORDS}-${SOUL_WISDOM_MAX_WORDS} words, got ${wordCount}.`);
  }
  if (sentences.length < 3 || sentences.length > 6) {
    failures.push(`expected 3-6 sentences, got ${sentences.length}.`);
  }
  if (countWord(wisdom, name) !== 1) {
    failures.push(`expected first name exactly once, got ${countWord(wisdom, name)}.`);
  }
  if (isLowQualityWisdom(wisdom)) {
    failures.push("matched low-quality/repeated phrasing rules.");
  }
  if (mentionsAstrology(wisdom)) {
    failures.push("mentioned astrology/planet terminology in Soul Guru wisdom.");
  }
  if (!result.reading?.innerWeather || !result.reading?.todayMove || !result.reading?.release) {
    failures.push("missing one or more cue fields.");
  }

  return {
    date,
    wisdom,
    wordCount,
    openingBucket: classifyScene(firstSentence(wisdom)),
    dailyArea: context.dailyArea,
    moonSign: context.transits?.moon?.sign || "unknown",
    lunarMansion: context.dailyLunarMansion?.name || context.transits?.moon?.lunarMansion?.name || "unknown",
    lunarDay: context.dailyLunarDay?.name || "unknown",
    quality: result.quality || null,
    transitKey: [
      context.dailyArea,
      context.timingTone,
      context.transits?.moon?.sign,
      context.transits?.saturn?.sign,
      context.dailyLunarMansion?.name,
      context.dailyLunarMansion?.pada,
      context.dailyLunarDay?.name,
      context.dailyLunarDay?.paksha
    ].join("|"),
    failures
  };
}

function buildSimilarity(readings) {
  const pairs = [];
  for (let first = 0; first < readings.length; first += 1) {
    for (let second = first + 1; second < readings.length; second += 1) {
      pairs.push({
        pair: `${readings[first].date} / ${readings[second].date}`,
        score: jaccard(readings[first].wisdom, readings[second].wisdom)
      });
    }
  }
  return pairs;
}

function jaccard(first, second) {
  const stop = new Set(["the", "and", "a", "to", "of", "in", "is", "it", "for", "with", "that", "this", "your", "you", "one", "can", "not", "than"]);
  const firstSet = new Set(words(first.toLowerCase()).map(cleanToken).filter((word) => word && !stop.has(word)));
  const secondSet = new Set(words(second.toLowerCase()).map(cleanToken).filter((word) => word && !stop.has(word)));
  const intersection = [...firstSet].filter((word) => secondSet.has(word)).length;
  const union = new Set([...firstSet, ...secondSet]).size || 1;
  return Math.round((intersection / union) * 100) / 100;
}

function repeatedCounts(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts].map(([value, count]) => ({ value, count }));
}

function classifyScene(text) {
  const normalized = String(text || "").toLowerCase();
  const categories = [
    ["device", /\b(phone|message|text|unread|inbox|notification|screen|reply)\b/],
    ["water", /\b(water|glass|drink|cup)\b/],
    ["calendar", /\b(calendar|appointment|deadline|time|hour|slot)\b/],
    ["notebook", /\b(notebook|page|pen|line|written|write)\b/],
    ["money", /\b(wallet|receipt|payment|bill|price|money)\b/],
    ["conversation", /\b(conversation|sentence|call|answer|agree|yes|say|reply|word|words|send)\b/],
    ["room", /\b(chair|room|desk|workspace|surface|drawer|laundry|bed|domestic)\b/],
    ["door", /\b(shoes|door|keys|bag|charger|errand)\b/],
    ["body", /\b(mirror|shoulder|shoulders|jaw|body|breath)\b/],
    ["task", /\b(list|task|item|draft|work|promise)\b/],
    ["worry", /\b(tab|worry|thought|mind)\b/]
  ];
  return categories.find(([, pattern]) => pattern.test(normalized))?.[0] || "general";
}

function firstSentence(text) {
  const match = String(text || "").trim().match(/^(.+?[.!?])(\s|$)/);
  return match?.[1] || words(text).slice(0, 18).join(" ");
}

function splitSentences(text) {
  return String(text || "")
    .trim()
    .match(/[^.!?]+[.!?]+/g)
    ?.map((sentence) => sentence.trim()) || [];
}

function countWord(text, word) {
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function mentionsAstrology(text) {
  return /\b(astrology|zodiac|moon sign|planet|transit|chart|horoscope|numerology|karma)\b/i.test(String(text || ""));
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function cleanToken(text) {
  return String(text || "").replace(/[^a-z]/g, "");
}

function parseDates(value) {
  if (!value) return null;
  const parsed = String(value).split(",").map((date) => date.trim()).filter(Boolean);
  if (!parsed.length || parsed.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new Error("--dates must be a comma-separated list of YYYY-MM-DD values.");
  }
  return parsed;
}

function formatDateForPrompt(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
