import { performance } from "node:perf_hooks";
import { loadEnv } from "vite";
import { buildAstrologyContext, buildTransitDateForUser } from "../src/astrologyEngine.js";
import { createDailySoulWisdom } from "../src/backend/soulWisdomService.js";
import { getDailyWisdom } from "../src/localSoulWisdom.js";
import { firstName, isLowQualityWisdom } from "../src/soulGuruPrompt.js";
import { getSoulWisdomQualityCases } from "./soul-wisdom-quality-cases.mjs";

const includeAi = process.argv.includes("--include-ai");
const caseSet = getArgValue("--case-set") || "base";
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};
const date = getArgValue("--date") || new Date().toISOString().slice(0, 10);
const minWords = Number(getArgValue("--min-words") || 65);
const maxWords = Number(getArgValue("--max-words") || 100);
const maxSimilarity = Number(getArgValue("--max-similarity") || 0.24);
const cases = getSoulWisdomQualityCases(caseSet);
const maxSceneRepeats = Number(getArgValue("--max-scene-repeats") || defaultMaxSceneRepeats(cases.length));

const started = performance.now();
const localResults = cases.map((user) => evaluateReading({
  user,
  source: "local",
  result: {
    reading: getDailyWisdom(user, date),
    quality: { attempts: 0, repaired: false, passed: true }
  }
}));
const aiResults = includeAi ? await buildAiResults() : [];
const groups = [
  { source: "local", results: localResults },
  ...(includeAi ? [{ source: "openai", results: aiResults }] : [])
];

const failures = [];
for (const group of groups) {
  const similarity = buildSimilarity(group.results);
  const highSimilarity = similarity.filter((item) => item.score > maxSimilarity);
  if (highSimilarity.length) {
    failures.push(`${group.source}: ${highSimilarity.length} reading pair(s) exceeded max similarity ${maxSimilarity}.`);
  }

  const repeatedScenes = buildSceneRepeats(group.results).filter((item) => item.category !== "general" && item.count > maxSceneRepeats);
  const deviceOpenings = group.results.filter((item) => item.openingSceneCategory === "device");
  if (repeatedScenes.length) {
    failures.push(`${group.source}: repeated opening scene category ${repeatedScenes.map((item) => `${item.category}=${item.count}`).join(", ")}.`);
  }
  if (deviceOpenings.length > 1) {
    failures.push(`${group.source}: device/message imagery opened ${deviceOpenings.length} readings.`);
  }

  for (const item of group.results) {
    failures.push(...item.failures.map((failure) => `${group.source} / ${item.name}: ${failure}`));
  }

  printGroup(group, similarity);
}

const elapsedMs = Math.round(performance.now() - started);
console.log(`Soul Guru quality check completed in ${elapsedMs}ms.`);

if (failures.length) {
  console.error("\nQuality failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Soul Guru quality check: pass");

async function buildAiResults() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for --include-ai.");
  }

  const aiEnv = {
    ...env,
    SOUL_WISDOM_ALLOW_UNCACHED: "true",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    PINECONE_API_KEY: "",
    PINECONE_HOST: "",
    PINECONE_INDEX: ""
  };
  const results = [];
  for (const user of cases) {
    const result = await createDailySoulWisdom({
      user,
      date,
      today: formatDateForPrompt(date)
    }, aiEnv);
    results.push(evaluateReading({ user, source: "openai", result }));
  }
  return results;
}

function evaluateReading({ user, source, result }) {
  const wisdom = result.reading?.wisdom || result.wisdom || "";
  const context = buildAstrologyContext(user, buildTransitDateForUser(user, date));
  const expectedOpeningScene = context.openingScene || context.dailyScene || "";
  const openingSentence = firstSentence(wisdom);
  const openingSceneCategory = classifyScene(openingSentence);
  const expectedSceneCategory = classifyScene(expectedOpeningScene);
  const failures = [];
  const wordCount = words(wisdom).length;
  const nameCount = countWord(wisdom, firstName(user.name));

  if (wordCount < minWords || wordCount > maxWords) {
    failures.push(`expected ${minWords}-${maxWords} words, got ${wordCount}.`);
  }
  if (isLowQualityWisdom(wisdom)) {
    failures.push("matched low-quality/repeated phrasing rules.");
  }
  if (nameCount !== 1) {
    failures.push(`expected first name exactly once, got ${nameCount}.`);
  }
  if (mentionsAstrology(wisdom)) {
    failures.push("mentioned astrology/planet terminology in Soul Guru wisdom.");
  }
  if (!result.reading?.innerWeather || !result.reading?.todayMove || !result.reading?.release) {
    failures.push("missing one or more cue fields.");
  }
  if (!openingUsesSeed(openingSentence, expectedOpeningScene)) {
    failures.push(`opening did not use seeded scene "${expectedOpeningScene}".`);
  }
  if (openingSceneCategory === "device" && expectedSceneCategory !== "device") {
    failures.push("opened with phone/message/screen imagery even though the seeded scene was not device-based.");
  }

  return {
    source,
    name: user.name,
    wordCount,
    lowQuality: isLowQualityWisdom(wisdom),
    quality: result.quality || null,
    openingSceneCategory,
    expectedOpeningScene,
    opening: words(wisdom).slice(0, 9).join(" "),
    wisdom,
    failures
  };
}

function printGroup(group, similarity) {
  const maxPair = similarity.reduce((best, item) => item.score > best.score ? item : best, { pair: "none", score: 0 });
  console.log(`\n${group.source.toUpperCase()} readings`);
  console.log(`Cases: ${group.results.length}; max similarity: ${maxPair.score} (${maxPair.pair})`);
  for (const item of group.results) {
    const repair = item.quality?.attempts ? ` attempts=${item.quality.attempts}` : "";
    console.log(`- ${item.name}: ${item.wordCount} words${repair}; scene=${item.openingSceneCategory}; opening="${item.opening}"`);
  }
}

function buildSceneRepeats(results) {
  const counts = new Map();
  for (const item of results) {
    counts.set(item.openingSceneCategory, (counts.get(item.openingSceneCategory) || 0) + 1);
  }
  return [...counts].map(([category, count]) => ({ category, count }));
}

function buildSimilarity(results) {
  const pairs = [];
  for (let first = 0; first < results.length; first += 1) {
    for (let second = first + 1; second < results.length; second += 1) {
      pairs.push({
        pair: `${results[first].name} / ${results[second].name}`,
        score: jaccard(results[first].wisdom, results[second].wisdom)
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

function mentionsAstrology(text) {
  return /\b(astrology|zodiac|moon sign|planet|transit|chart|horoscope|numerology|karma)\b/i.test(String(text || ""));
}

function openingUsesSeed(opening, seed) {
  const openingTokens = new Set(significantTokens(opening));
  if (significantTokens(seed).some((token) => openingTokens.has(token))) {
    return true;
  }

  const openingCategory = classifyScene(opening);
  const seedCategory = classifyScene(seed);
  return seedCategory !== "general" && openingCategory === seedCategory;
}

function classifyScene(text) {
  const normalized = String(text || "").toLowerCase();
  const categories = [
    ["device", /\b(phone|message|text|unread|inbox|notification|screen|reply)\b/],
    ["water", /\b(water|glass|drink)\b/],
    ["calendar", /\b(calendar|appointment|deadline|time)\b/],
    ["notebook", /\b(notebook|page|pen|line|written|write)\b/],
    ["kitchen", /\b(kitchen|counter|tea|cup|meal|food|breakfast|lunch)\b/],
    ["money", /\b(wallet|receipt|payment|bill|price|money)\b/],
    ["room", /\b(chair|room|desk|drawer|laundry|bed)\b/],
    ["door", /\b(shoes|door|keys|bag|charger|errand)\b/],
    ["body", /\b(mirror|shoulder|shoulders|jaw|body|breath)\b/],
    ["conversation", /\b(conversation|sentence|call|answer|agree|yes|say|reply)\b/],
    ["task", /\b(list|task|item|draft|work|promise)\b/],
    ["worry", /\b(tab|worry|thought|mind)\b/]
  ];
  return categories.find(([, pattern]) => pattern.test(normalized))?.[0] || "general";
}

function firstSentence(text) {
  const match = String(text || "").trim().match(/^(.+?[.!?])(\s|$)/);
  return match?.[1] || words(text).slice(0, 18).join(" ");
}

function countWord(text, word) {
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function cleanToken(text) {
  return String(text || "").replace(/[^a-z]/g, "");
}

function significantTokens(text) {
  const stop = new Set(["the", "and", "that", "this", "with", "your", "before", "after", "where", "keeps", "need", "needs", "beside", "because", "while"]);
  return words(text.toLowerCase())
    .map(cleanToken)
    .filter((word) => word.length >= 4 && !stop.has(word));
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

function defaultMaxSceneRepeats(caseCount) {
  return caseCount <= 5 ? 2 : Math.ceil(caseCount * 0.35);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
