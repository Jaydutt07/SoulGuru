import { performance } from "node:perf_hooks";
import { loadEnv } from "vite";
import { buildAstrologyContext, buildTransitDateForUser } from "../src/astrologyEngine.js";
import { buildFallbackDeepGuidance } from "../src/deepGuidance.js";
import { createMoreGuidanceReading } from "../src/backend/guidanceService.js";
import { firstName } from "../src/soulGuruPrompt.js";
import { getSoulWisdomQualityCases } from "./soul-wisdom-quality-cases.mjs";

const includeAi = process.argv.includes("--include-ai");
const showReadings = process.argv.includes("--show-readings");
const caseSet = getArgValue("--case-set") || "base";
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};
const date = getArgValue("--date") || new Date().toISOString().slice(0, 10);
const maxSimilarity = Number(getArgValue("--max-similarity") || 0.42);
const cases = getSoulWisdomQualityCases(caseSet);

const started = performance.now();
const localResults = cases.map((user) => {
  const context = buildAstrologyContext(user, buildTransitDateForUser(user, date));
  return evaluateGuidance({
    user,
    source: "local",
    result: {
      guidance: buildFallbackDeepGuidance(user, context),
      source: "local-fallback",
      quality: { attempts: 0, repaired: false, passed: true }
    }
  });
});
const aiResults = includeAi ? await buildAiResults() : [];
const groups = [
  { source: "local", results: localResults },
  ...(includeAi ? [{ source: "openai", results: aiResults }] : [])
];

const failures = [];
for (const group of groups) {
  const similarity = buildSimilarity(group.results);
  const highSimilarity = similarity.filter((item) => item.score > maxSimilarity);
  const repeatedDistinctivePhrases = buildRepeatedDistinctivePhrases(group.results);
  if (highSimilarity.length) {
    failures.push(`${group.source}: ${highSimilarity.length} overview pair(s) exceeded max similarity ${maxSimilarity}.`);
  }
  if (repeatedDistinctivePhrases.length) {
    failures.push(`${group.source}: repeated distinctive phrase(s): ${repeatedDistinctivePhrases.slice(0, 3).map((item) => `"${item.phrase}" in ${item.names.join(" / ")}`).join("; ")}.`);
  }

  for (const item of group.results) {
    failures.push(...item.failures.map((failure) => `${group.source} / ${item.name}: ${failure}`));
  }

  printGroup(group, similarity);
}

const elapsedMs = Math.round(performance.now() - started);
console.log(`More Guidance quality check completed in ${elapsedMs}ms.`);

if (failures.length) {
  console.error("\nQuality failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("More Guidance quality check: pass");

async function buildAiResults() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for --include-ai.");
  }

  const aiEnv = {
    ...env,
    MORE_GUIDANCE_ALLOW_LOCAL_ACCESS: "true",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    PINECONE_API_KEY: "",
    PINECONE_HOST: "",
    PINECONE_INDEX: ""
  };
  const results = [];
  for (const user of cases) {
    const subscription = {
      active: true,
      name: "Soul Guru + Astro Solve",
      astroBonusQuestions: 15
    };
    const result = await createMoreGuidanceReading({
      user: {
        ...user,
        soulGuruSubscription: subscription
      },
      subscription,
      date
    }, aiEnv, {
      supabase: null,
      searchGuidanceMemory: async () => ({ configured: false, matches: [] }),
      upsertGuidanceMemory: async () => ({ configured: false, upserted: false })
    });
    results.push(evaluateGuidance({ user, source: "openai", result }));
  }
  return results;
}

function evaluateGuidance({ user, source, result }) {
  const guidance = result.guidance || {};
  const failures = [];
  const overviewWords = words(guidance.overview).length;
  const weekWords = words(guidance.thisWeek).length;
  const monthWords = words(guidance.thisMonth).length;
  const practiceWords = words(guidance.practice).length;
  const focusWords = words(guidance.focus).length;
  const watchWords = words(guidance.watch).length;
  const allText = [
    guidance.overview,
    guidance.thisWeek,
    guidance.thisMonth,
    guidance.practice,
    guidance.focus,
    guidance.watch
  ].filter(Boolean).join("\n");

  if (overviewWords < 105 || overviewWords > 160) failures.push(`overview expected 105-160 words, got ${overviewWords}.`);
  if (weekWords < 45 || weekWords > 90) failures.push(`thisWeek expected 45-90 words, got ${weekWords}.`);
  if (monthWords < 45 || monthWords > 90) failures.push(`thisMonth expected 45-90 words, got ${monthWords}.`);
  if (practiceWords < 30 || practiceWords > 75) failures.push(`practice expected 30-75 words, got ${practiceWords}.`);
  if (focusWords < 4 || focusWords > 12) failures.push(`focus expected 4-12 words, got ${focusWords}.`);
  if (watchWords < 4 || watchWords > 12) failures.push(`watch expected 4-12 words, got ${watchWords}.`);
  if (countWord(guidance.overview, firstName(user.name)) !== 1) failures.push("overview must address first name exactly once.");
  if (!hasConcretePaidCue(guidance.overview)) failures.push("overview needs an ordinary concrete cue.");
  if (mentionsAstrologyTerms(allText)) failures.push("mentioned astrology/planet terminology.");
  if (isLowQualityPaidGuidance(allText)) failures.push("matched low-quality paid guidance phrasing.");
  if (source === "openai" && result.source !== "openai") {
    failures.push(`expected live OpenAI source, got ${result.source || "unknown"}.`);
  }
  if (result.quality && result.quality.passed === false) {
    failures.push("backend quality flag was false.");
  }

  return {
    source,
    name: user.name,
    providerSource: result.source,
    quality: result.quality || null,
    counts: {
      overview: overviewWords,
      thisWeek: weekWords,
      thisMonth: monthWords,
      practice: practiceWords,
      focus: focusWords,
      watch: watchWords
    },
    overview: guidance.overview || "",
    allText,
    guidance,
    failures
  };
}

function printGroup(group, similarity) {
  const maxPair = similarity.reduce((best, item) => item.score > best.score ? item : best, { pair: "none", score: 0 });
  console.log(`\n${group.source.toUpperCase()} paid readings`);
  console.log(`Cases: ${group.results.length}; max overview similarity: ${maxPair.score} (${maxPair.pair})`);
  for (const item of group.results) {
    const repair = item.quality?.attempts ? ` attempts=${item.quality.attempts}` : "";
    console.log(`- ${item.name}: overview=${item.counts.overview}, week=${item.counts.thisWeek}, month=${item.counts.thisMonth}, practice=${item.counts.practice}${repair}; source=${item.providerSource || item.source}`);
    if (showReadings) {
      console.log(`  Overview: ${item.guidance.overview}`);
      console.log(`  Week: ${item.guidance.thisWeek}`);
      console.log(`  Month: ${item.guidance.thisMonth}`);
      console.log(`  Practice: ${item.guidance.practice}`);
      console.log(`  Focus: ${item.guidance.focus}`);
      console.log(`  Watch: ${item.guidance.watch}`);
    }
  }
}

function buildSimilarity(results) {
  const pairs = [];
  for (let first = 0; first < results.length; first += 1) {
    for (let second = first + 1; second < results.length; second += 1) {
      pairs.push({
        pair: `${results[first].name} / ${results[second].name}`,
        score: jaccard(results[first].overview, results[second].overview)
      });
    }
  }
  return pairs;
}

function buildRepeatedDistinctivePhrases(results) {
  const phraseOwners = new Map();
  for (const item of results) {
    const seen = new Set(buildDistinctivePhrases(item.allText));
    for (const phrase of seen) {
      const names = phraseOwners.get(phrase) || [];
      names.push(item.name);
      phraseOwners.set(phrase, names);
    }
  }
  return [...phraseOwners]
    .filter(([, names]) => names.length > 1)
    .map(([phrase, names]) => ({ phrase, names }))
    .sort((first, second) => second.names.length - first.names.length || second.phrase.length - first.phrase.length);
}

function buildDistinctivePhrases(text) {
  const tokens = normalizedPhraseTokens(text);
  const phrases = [];
  for (const size of [7, 6, 5]) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phraseTokens = tokens.slice(index, index + size);
      if (isDistinctivePhrase(phraseTokens)) {
        phrases.push(phraseTokens.join(" "));
      }
    }
  }
  return phrases;
}

function normalizedPhraseTokens(text) {
  return words(text.toLowerCase())
    .map((word) => word.replace(/[^a-z0-9']/g, ""))
    .filter(Boolean);
}

function isDistinctivePhrase(tokens) {
  const stop = new Set(["a", "an", "and", "are", "as", "at", "be", "been", "before", "by", "can", "do", "for", "from", "has", "have", "in", "is", "it", "its", "not", "of", "on", "or", "that", "the", "then", "this", "to", "when", "where", "with", "without", "you", "your"]);
  const distinctive = tokens.filter((token) => token.length >= 5 && !stop.has(token));
  return distinctive.length >= 3;
}

function jaccard(first, second) {
  const stop = new Set(["the", "and", "a", "to", "of", "in", "is", "it", "for", "with", "that", "this", "your", "you", "one", "can", "not", "than", "or", "as", "from", "into"]);
  const firstSet = new Set(words(first.toLowerCase()).map(cleanToken).filter((word) => word && !stop.has(word)));
  const secondSet = new Set(words(second.toLowerCase()).map(cleanToken).filter((word) => word && !stop.has(word)));
  const intersection = [...firstSet].filter((word) => secondSet.has(word)).length;
  const union = new Set([...firstSet, ...secondSet]).size || 1;
  return Math.round((intersection / union) * 100) / 100;
}

function isLowQualityPaidGuidance(text) {
  const normalized = String(text || "").toLowerCase();
  return [
    /\byou may\b/,
    /\byou might\b/,
    /\byou could\b/,
    /\bmay feel\b/,
    /\bmight feel\b/,
    /\bcould feel\b/,
    /\btoday asks\b/,
    /\bthe deeper pattern\b/,
    /\bthis phase\b/,
    /\bthe universe\b/,
    /\bdivine timing\b/,
    /\btrust the process\b/,
    /\bcalm energy\b/,
    /^this week[, ]/im,
    /^this month[, ]/im,
    /^in the coming days[, ]/im,
    /^over the next month[, ]/im,
    /\bnot asking for (another|more) analysis\b/,
    /\bquiet proof\b/,
    /\bverdict on your worth\b/,
    /\bchoose choose\b/,
    /\bchose choose\b/,
    /\bmake protect\b/,
    /\buse protecting\b/,
    /\blet let\b/,
    /\blet do not\b/,
    /\bbegin with do not\b/
  ].some((pattern) => pattern.test(normalized));
}

function mentionsAstrologyTerms(text) {
  return /\b(astrology|zodiac|moon sign|planet|transit|chart|horoscope|numerology|karma|remed(?:y|ies))\b/i.test(String(text || ""));
}

function hasConcretePaidCue(text) {
  return /\b(room|desk|table|meal|breakfast|lunch|dinner|calendar|money|wallet|bill|receipt|body|shoulder|jaw|breath|door|message|notebook|page|task|work|sleep|reply|conversation|family|water|glass|cup|kitchen)\b/i.test(String(text || ""));
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

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
