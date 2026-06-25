import { performance } from "node:perf_hooks";
import { loadEnv } from "vite";
import { buildAstrologyContext, buildTransitDateForUser } from "../src/astrologyEngine.js";
import {
  buildFallbackAstroSolveInsight,
  getAstroSolveContractIssues
} from "../src/astroSolveGuidance.js";
import { createAstroSolve } from "../src/backend/astroSolveService.js";

const includeAi = process.argv.includes("--include-ai");
const showReadings = process.argv.includes("--show-readings");
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};
const date = getArgValue("--date") || new Date().toISOString().slice(0, 10);
const maxSimilarity = Number(getArgValue("--max-similarity") || 0.36);
const cases = getAstroSolveQualityCases();

const started = performance.now();
const localResults = cases.map((item, index) => {
  const context = buildAstrologyContext(item.user, buildTransitDateForUser(item.user, date));
  return evaluateAnswer({
    source: "local",
    user: item.user,
    question: item.question,
    context,
    result: {
      answer: buildFallbackAstroSolveInsight(item.question, item.user, context, index, date),
      generationSource: "local-fallback",
      quality: { attempts: 0, repaired: false, passed: true, fallbackUsed: false }
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
  if (highSimilarity.length) {
    failures.push(`${group.source}: ${highSimilarity.length} answer pair(s) exceeded max similarity ${maxSimilarity}.`);
  }

  const repeatedOpenings = buildOpeningRepeats(group.results).filter((item) => item.count > 2);
  if (repeatedOpenings.length) {
    failures.push(`${group.source}: repeated root opening ${repeatedOpenings.map((item) => `${item.opening}=${item.count}`).join(", ")}.`);
  }

  for (const item of group.results) {
    failures.push(...item.failures.map((failure) => `${group.source} / ${item.name}: ${failure}`));
  }

  printGroup(group, similarity);
}

const elapsedMs = Math.round(performance.now() - started);
console.log(`Astro Solves quality check completed in ${elapsedMs}ms.`);

if (failures.length) {
  console.error("\nQuality failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Astro Solves quality check: pass");

async function buildAiResults() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for --include-ai.");
  }

  const aiEnv = {
    ...env,
    ASTRO_SOLVES_ALLOW_LOCAL_QUOTA: "true",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    PINECONE_API_KEY: "",
    PINECONE_HOST: "",
    PINECONE_INDEX: ""
  };
  const results = [];
  for (let index = 0; index < cases.length; index += 1) {
    const item = cases[index];
    const context = buildAstrologyContext(item.user, buildTransitDateForUser(item.user, date));
    const result = await createAstroSolve({
      user: item.user,
      question: item.question,
      date,
      today: formatDateForPrompt(date),
      priorCount: 0
    }, aiEnv, {
      supabase: null,
      upsertGuidanceMemory: async () => ({ configured: false, upserted: false })
    });
    results.push(evaluateAnswer({
      source: "openai",
      user: item.user,
      question: item.question,
      context,
      result
    }));
  }
  return results;
}

function evaluateAnswer({ source, user, question, context, result }) {
  const answer = result.answer || result;
  const failures = getAstroSolveContractIssues(answer, { user, question, context });
  const counts = {
    root: words(answer.root).length,
    astrology: words(answer.astrology).length,
    solution: words(answer.solution).length
  };

  if (source === "openai") {
    if (result.generationSource !== "openai") {
      failures.push(`expected live OpenAI generation, got ${result.generationSource || "unknown"}.`);
    }
    if (result.quality?.fallbackUsed) {
      failures.push("backend fell back after live OpenAI quality failure.");
    }
    if (result.quality && result.quality.passed === false) {
      failures.push("backend quality flag was false.");
    }
  }

  return {
    source,
    name: user.name,
    question,
    answer,
    answerText: [answer.root, answer.astrology, answer.solution].filter(Boolean).join(" "),
    rootOpening: openingBucket(answer.root),
    generationSource: result.generationSource || source,
    quality: result.quality || null,
    counts,
    failures
  };
}

function printGroup(group, similarity) {
  const maxPair = similarity.reduce((best, item) => item.score > best.score ? item : best, { pair: "none", score: 0 });
  console.log(`\n${group.source.toUpperCase()} Astro Solves answers`);
  console.log(`Cases: ${group.results.length}; max similarity: ${maxPair.score} (${maxPair.pair})`);
  for (const item of group.results) {
    const repair = item.quality?.attempts ? ` attempts=${item.quality.attempts}` : "";
    console.log(`- ${item.name}: root=${item.counts.root}, astrology=${item.counts.astrology}, solution=${item.counts.solution}${repair}; source=${item.generationSource}; opening=${item.rootOpening}`);
    if (showReadings) {
      console.log(`  Question: ${item.question}`);
      console.log(`  Root: ${item.answer.root}`);
      console.log(`  Astrology: ${item.answer.astrology}`);
      console.log(`  Solution: ${item.answer.solution}`);
    }
  }
}

function buildSimilarity(results) {
  const pairs = [];
  for (let first = 0; first < results.length; first += 1) {
    for (let second = first + 1; second < results.length; second += 1) {
      pairs.push({
        pair: `${results[first].name} / ${results[second].name}`,
        score: jaccard(results[first].answerText, results[second].answerText)
      });
    }
  }
  return pairs;
}

function buildOpeningRepeats(results) {
  const counts = new Map();
  for (const item of results) {
    counts.set(item.rootOpening, (counts.get(item.rootOpening) || 0) + 1);
  }
  return [...counts].map(([opening, count]) => ({ opening, count }));
}

function openingBucket(text) {
  const normalized = String(text || "").toLowerCase().trim();
  if (normalized.startsWith("the root is not")) return "root-not";
  if (normalized.startsWith("under this problem")) return "under-problem";
  if (normalized.startsWith("the root pattern")) return "root-pattern";
  if (/^[a-z]+ pain|^[a-z]+ pressure|^[a-z]+ confusion/.test(normalized)) return "category";
  return words(normalized).slice(0, 3).join("-");
}

function jaccard(first, second) {
  const stop = new Set(["the", "and", "a", "to", "of", "in", "is", "it", "for", "with", "that", "this", "your", "you", "one", "can", "not", "than", "or", "as", "from", "into", "problem"]);
  const firstSet = new Set(words(first.toLowerCase()).map(cleanToken).filter((word) => word && !stop.has(word)));
  const secondSet = new Set(words(second.toLowerCase()).map(cleanToken).filter((word) => word && !stop.has(word)));
  const intersection = [...firstSet].filter((word) => secondSet.has(word)).length;
  const union = new Set([...firstSet, ...secondSet]).size || 1;
  return Math.round((intersection / union) * 100) / 100;
}

function getAstroSolveQualityCases() {
  return [
    {
      user: {
        id: "astro-quality-relationship",
        name: "Anaya Mehta",
        phone: "+919800000011",
        email: "anaya@soulguru.local",
        birthDate: "1997-04-18",
        birthTime: "06:40",
        birthPlace: "Mumbai"
      },
      question: "My partner says they love me but goes silent after arguments. Should I stay patient or step back?"
    },
    {
      user: {
        id: "astro-quality-career",
        name: "Kabir Sen",
        phone: "+919800000012",
        email: "kabir@soulguru.local",
        birthDate: "1992-11-03",
        birthTime: "21:05",
        birthPlace: "Kolkata"
      },
      question: "I keep delaying my portfolio and feel invisible at work even when I do the hard parts."
    },
    {
      user: {
        id: "astro-quality-family-money",
        name: "Ira Nair",
        phone: "+919800000013",
        email: "ira@soulguru.local",
        birthDate: "1989-08-29",
        birthTime: "13:25",
        birthPlace: "Kochi"
      },
      question: "I support my parents financially, but I feel resentful and scared about money every month."
    },
    {
      user: {
        id: "astro-quality-study-health",
        name: "Dev Arora",
        phone: "+919800000014",
        email: "dev@soulguru.local",
        birthDate: "2001-01-09",
        birthTime: "04:55",
        birthPlace: "Chandigarh"
      },
      question: "My sleep is broken and I wake up anxious before important exams."
    },
    {
      user: {
        id: "astro-quality-decision",
        name: "Meera Joshi",
        phone: "+919800000015",
        email: "meera@soulguru.local",
        birthDate: "1994-06-22",
        birthTime: "17:35",
        birthPlace: "Pune"
      },
      question: "A friend wants to become my business partner, but I keep sensing the deal is unfair."
    }
  ];
}

function formatDateForPrompt(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function cleanToken(text) {
  return String(text || "").replace(/[^a-z0-9-]/g, "");
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
