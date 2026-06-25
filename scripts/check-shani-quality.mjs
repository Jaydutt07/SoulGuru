import { performance } from "node:perf_hooks";
import { loadEnv } from "vite";
import {
  buildFallbackPanditAnswer,
  getPanditAnswerIssues
} from "../src/shaniGuidance.js";
import { createPanditGuidance } from "../src/backend/shaniService.js";

const includeAi = process.argv.includes("--include-ai");
const showReadings = process.argv.includes("--show-readings");
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};
const maxSimilarity = Number(getArgValue("--max-similarity") || 0.38);
const cases = getShaniQualityCases();

const started = performance.now();
const localResults = cases.map((item) => evaluateAnswer({
  source: "local",
  item,
  result: {
    answer: buildFallbackPanditAnswer(item),
    source: "local-fallback",
    quality: { attempts: 0, repaired: false, passed: true, fallbackUsed: true }
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
    failures.push(`${group.source}: ${highSimilarity.length} Pandit answer pair(s) exceeded max similarity ${maxSimilarity}.`);
  }

  const repeatedOpenings = buildOpeningRepeats(group.results).filter((item) => item.count > 2);
  if (repeatedOpenings.length) {
    failures.push(`${group.source}: repeated Pandit opening ${repeatedOpenings.map((item) => `${item.opening}=${item.count}`).join(", ")}.`);
  }

  for (const item of group.results) {
    failures.push(...item.failures.map((failure) => `${group.source} / ${item.name}: ${failure}`));
  }

  printGroup(group, similarity);
}

const elapsedMs = Math.round(performance.now() - started);
console.log(`Shani Pandit quality check completed in ${elapsedMs}ms.`);

if (failures.length) {
  console.error("\nQuality failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Shani Pandit quality check: pass");

async function buildAiResults() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for --include-ai.");
  }

  const aiEnv = {
    ...env,
    SHANI_ALLOW_LOCAL_ACCESS: "true",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: ""
  };
  const results = [];
  for (const item of cases) {
    const result = await createPanditGuidance({
      user: item.user,
      question: item.question,
      report: item.report,
      membership: item.membership
    }, aiEnv, {
      supabase: null
    });
    results.push(evaluateAnswer({ source: "openai", item, result }));
  }
  return results;
}

function evaluateAnswer({ source, item, result }) {
  const answer = result.answer || result;
  const failures = getPanditAnswerIssues(answer, item);
  const counts = {
    text: words(answer.text).length,
    practice: words(answer.practice).length,
    caution: words(answer.caution).length
  };

  if (source === "openai") {
    if (result.source !== "openai") {
      failures.push(`expected live OpenAI generation, got ${result.source || "unknown"}.`);
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
    name: item.user.name,
    question: item.question,
    answer,
    answerText: [answer.text, answer.practice, answer.caution].filter(Boolean).join(" "),
    opening: openingBucket(answer.text),
    providerSource: result.source || source,
    quality: result.quality || null,
    counts,
    failures
  };
}

function printGroup(group, similarity) {
  const maxPair = similarity.reduce((best, item) => item.score > best.score ? item : best, { pair: "none", score: 0 });
  console.log(`\n${group.source.toUpperCase()} Shani Pandit answers`);
  console.log(`Cases: ${group.results.length}; max similarity: ${maxPair.score} (${maxPair.pair})`);
  for (const item of group.results) {
    const repair = item.quality?.attempts ? ` attempts=${item.quality.attempts}` : "";
    console.log(`- ${item.name}: text=${item.counts.text}, practice=${item.counts.practice}, caution=${item.counts.caution}${repair}; source=${item.providerSource}; opening=${item.opening}`);
    if (showReadings) {
      console.log(`  Question: ${item.question}`);
      console.log(`  Text: ${item.answer.text}`);
      console.log(`  Practice: ${item.answer.practice}`);
      console.log(`  Caution: ${item.answer.caution}`);
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
    counts.set(item.opening, (counts.get(item.opening) || 0) + 1);
  }
  return [...counts].map(([opening, count]) => ({ opening, count }));
}

function openingBucket(text) {
  return words(String(text || "").toLowerCase()).slice(0, 3).join("-");
}

function jaccard(first, second) {
  const stop = new Set(["the", "and", "a", "to", "of", "in", "is", "it", "for", "with", "that", "this", "your", "you", "one", "can", "not", "than", "or", "as", "from", "into", "shani", "saade", "sati", "saturn"]);
  const firstSet = new Set(words(first.toLowerCase()).map(cleanToken).filter((word) => word && !stop.has(word)));
  const secondSet = new Set(words(second.toLowerCase()).map(cleanToken).filter((word) => word && !stop.has(word)));
  const intersection = [...firstSet].filter((word) => secondSet.has(word)).length;
  const union = new Set([...firstSet, ...secondSet]).size || 1;
  return Math.round((intersection / union) * 100) / 100;
}

function getShaniQualityCases() {
  return [
    {
      user: shaniUser("Aarav Menon", "1991-10-17", "07:20", "Bengaluru"),
      question: "My career is stuck and money feels tight. What Shani remedy should I follow this week?",
      report: shaniReport({ phaseIndex: 1, phaseTitle: "Rising phase", moonSign: "Aries", saturnSign: "Pisces", active: true }),
      membership: membership("3m", "3 months")
    },
    {
      user: shaniUser("Rhea Kapoor", "1988-02-04", "18:45", "Delhi"),
      question: "During this peak phase my marriage arguments become harsh. How should I control my speech?",
      report: shaniReport({ phaseIndex: 2, phaseTitle: "Peak phase", moonSign: "Pisces", saturnSign: "Pisces", active: true }),
      membership: membership("6m", "6 months")
    },
    {
      user: shaniUser("Neel Shah", "1996-07-26", "11:10", "Ahmedabad"),
      question: "Family duties and debt are making me resentful. What should I repay first?",
      report: shaniReport({ phaseIndex: 3, phaseTitle: "Setting phase", moonSign: "Aquarius", saturnSign: "Pisces", active: true }),
      membership: membership("1y", "1 year")
    },
    {
      user: shaniUser("Tara Bose", "1999-12-11", "05:35", "Kolkata"),
      question: "Saade Sati is not active, but anxiety and sleep are weak. How do I prepare?",
      report: shaniReport({ phaseIndex: 0, phaseTitle: "Outside Saade Sati", moonSign: "Virgo", saturnSign: "Pisces", active: false }),
      membership: membership("3m", "3 months")
    },
    {
      user: shaniUser("Vikram Rao", "1984-05-30", "22:05", "Hyderabad"),
      question: "A property court conflict is draining me. What conduct will keep Shani support clean?",
      report: shaniReport({ phaseIndex: 2, phaseTitle: "Peak phase", moonSign: "Pisces", saturnSign: "Pisces", active: true }),
      membership: membership("full", "Remaining timeline")
    }
  ];
}

function shaniUser(name, birthDate, birthTime, birthPlace) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `shani-quality-${id}`,
    name,
    phone: "+919800001111",
    email: `${id}@soulguru.local`,
    birthDate,
    birthTime,
    birthPlace
  };
}

function shaniReport({ active, phaseIndex, phaseTitle, moonSign, saturnSign }) {
  return {
    active,
    phaseIndex,
    phaseTitle,
    moonSign,
    saturnSign,
    endDate: "2031-03-17T00:00:00.000Z",
    endLabel: active ? "Estimated completion: Mar 17, 2031" : "Next watch begins around Aug 8, 2036",
    summary: active
      ? `Your calculated Moon sign is ${moonSign}, with Saturn currently in ${saturnSign}. In this ${String(phaseTitle).toLowerCase()}, patience, responsibility, and cleaner timing matter.`
      : `Your calculated Moon sign is ${moonSign}, and Saturn is currently in ${saturnSign}. Saade Sati does not appear active right now.`
  };
}

function membership(planId, planName) {
  return {
    id: `quality-${planId}`,
    active: true,
    planId,
    planName,
    status: "active",
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
    provider: "quality"
  };
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
