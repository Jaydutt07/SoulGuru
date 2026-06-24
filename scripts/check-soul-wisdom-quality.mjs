import { performance } from "node:perf_hooks";
import { createDailySoulWisdom } from "../src/backend/soulWisdomService.js";
import { getDailyWisdom } from "../src/localSoulWisdom.js";
import { firstName, isLowQualityWisdom } from "../src/soulGuruPrompt.js";

const includeAi = process.argv.includes("--include-ai");
const date = getArgValue("--date") || new Date().toISOString().slice(0, 10);
const minWords = Number(getArgValue("--min-words") || 65);
const maxWords = Number(getArgValue("--max-words") || 100);
const maxSimilarity = Number(getArgValue("--max-similarity") || 0.24);

const cases = [
  { name: "Asha Rao", birthDate: "1994-08-17", birthTime: "06:35", birthPlace: "Mumbai", phone: "+919000000001", email: "asha@example.com" },
  { name: "Kabir Mehta", birthDate: "1988-02-03", birthTime: "21:10", birthPlace: "Delhi", phone: "+919000000002", email: "kabir@example.com" },
  { name: "Naina Kapoor", birthDate: "2001-11-28", birthTime: "14:45", birthPlace: "Bengaluru", phone: "+919000000003", email: "naina@example.com" },
  { name: "Rohan Iyer", birthDate: "1979-05-09", birthTime: "04:20", birthPlace: "Chennai", phone: "+919000000004", email: "rohan@example.com" },
  { name: "Meera Shah", birthDate: "1999-12-31", birthTime: "23:58", birthPlace: "Ahmedabad", phone: "+919000000005", email: "meera@example.com" }
];

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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for --include-ai.");
  }

  const env = {
    ...process.env,
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
    }, env);
    results.push(evaluateReading({ user, source: "openai", result }));
  }
  return results;
}

function evaluateReading({ user, source, result }) {
  const wisdom = result.reading?.wisdom || result.wisdom || "";
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

  return {
    source,
    name: user.name,
    wordCount,
    lowQuality: isLowQualityWisdom(wisdom),
    quality: result.quality || null,
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
    console.log(`- ${item.name}: ${item.wordCount} words${repair}; opening="${item.opening}"`);
  }
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
