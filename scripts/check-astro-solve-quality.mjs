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
const caseSet = getArgValue("--case-set") || "base";
const cases = getAstroSolveQualityCases(caseSet);
const maxRepeatedOpenings = Number(getArgValue("--max-repeated-openings") || defaultMaxRepeatedOpenings(cases.length));

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
    failures.push(`${group.source}: ${highSimilarity.length} answer pair(s) exceeded max similarity ${maxSimilarity}: ${formatSimilarityPairs(highSimilarity)}.`);
  }

  const repeatedOpenings = buildOpeningRepeats(group.results).filter((item) => item.count > maxRepeatedOpenings);
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

function formatSimilarityPairs(items) {
  return items
    .slice()
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map((item) => `${item.pair}=${item.score}`)
    .join(", ");
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

function getAstroSolveBaseCases() {
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

function getAstroSolveExtendedCases() {
  return [
  ...getAstroSolveBaseCases(),
  {
    user: {
      id: "astro-quality-marriage-family",
      name: "Rhea Kapoor",
      phone: "+919800000016",
      email: "rhea@soulguru.local",
      birthDate: "1986-12-14",
      birthTime: "08:18",
      birthPlace: "Delhi"
    },
    question: "My in-laws keep interfering in my marriage and my husband avoids taking a clear stand."
  },
  {
    user: {
      id: "astro-quality-job-switch",
      name: "Arjun Bedi",
      phone: "+919800000017",
      email: "arjun@soulguru.local",
      birthDate: "1990-02-07",
      birthTime: "10:32",
      birthPlace: "Jaipur"
    },
    question: "I received a job offer with better salary, but my current boss is promising growth if I stay."
  },
  {
    user: {
      id: "astro-quality-debt",
      name: "Nisha Rao",
      phone: "+919800000018",
      email: "nisha@soulguru.local",
      birthDate: "1984-09-25",
      birthTime: "02:44",
      birthPlace: "Hyderabad"
    },
    question: "A loan I took for family expenses is becoming heavy and I feel ashamed asking anyone to repay me."
  },
  {
    user: {
      id: "astro-quality-panic",
      name: "Samar Khan",
      phone: "+919800000019",
      email: "samar@soulguru.local",
      birthDate: "1999-05-12",
      birthTime: "23:06",
      birthPlace: "Lucknow"
    },
    question: "I get panic before presentations and my chest feels tight even when I know the material."
  },
  {
    user: {
      id: "astro-quality-relocation",
      name: "Tara Menon",
      phone: "+919800000020",
      email: "tara@soulguru.local",
      birthDate: "1995-07-30",
      birthTime: "15:19",
      birthPlace: "Kochi"
    },
    question: "Should I move abroad for studies or stay near home where my parents need support?"
  },
  {
    user: {
      id: "astro-quality-ex",
      name: "Vivaan Shah",
      phone: "+919800000021",
      email: "vivaan@soulguru.local",
      birthDate: "1991-10-21",
      birthTime: "19:47",
      birthPlace: "Surat"
    },
    question: "My ex has started messaging again, and I cannot tell if this is closure or another emotional trap."
  },
  {
    user: {
      id: "astro-quality-client",
      name: "Leela Das",
      phone: "+919800000022",
      email: "leela@soulguru.local",
      birthDate: "1978-03-03",
      birthTime: "05:58",
      birthPlace: "Guwahati"
    },
    question: "A client keeps changing the scope and delaying payment, but I am afraid of losing the project."
  },
  {
    user: {
      id: "astro-quality-sibling",
      name: "Pranav Joshi",
      phone: "+919800000023",
      email: "pranav@soulguru.local",
      birthDate: "1982-06-16",
      birthTime: "12:40",
      birthPlace: "Varanasi"
    },
    question: "My sibling expects me to handle every family problem and then criticizes how I do it."
  },
  {
    user: {
      id: "astro-quality-burnout",
      name: "Kavya Sinha",
      phone: "+919800000024",
      email: "kavya@soulguru.local",
      birthDate: "1993-01-27",
      birthTime: "03:21",
      birthPlace: "Bhopal"
    },
    question: "I feel burned out and keep skipping meals, but I still push myself because everyone depends on me."
  },
  {
    user: {
      id: "astro-quality-startup",
      name: "Neel Reddy",
      phone: "+919800000025",
      email: "neel@soulguru.local",
      birthDate: "1988-11-19",
      birthTime: "16:11",
      birthPlace: "Nagpur"
    },
    question: "My startup cofounder wants more equity without taking more responsibility, and I am avoiding the contract talk."
  },
  {
    user: {
      id: "astro-quality-friendship",
      name: "Anika Pillai",
      phone: "+919800000026",
      email: "anika@soulguru.local",
      birthDate: "2002-04-05",
      birthTime: "09:37",
      birthPlace: "Coimbatore"
    },
    question: "My closest friend keeps cancelling plans but expects me to be available whenever they are upset."
  },
  {
    user: {
      id: "astro-quality-promotion",
      name: "Rohan Iyer",
      phone: "+919800000027",
      email: "rohan@soulguru.local",
      birthDate: "1979-08-08",
      birthTime: "22:05",
      birthPlace: "Chennai"
    },
    question: "I was passed over for promotion and now I cannot decide whether to confront my manager or leave quietly."
  },
  {
    user: {
      id: "astro-quality-parent-health",
      name: "Meenal Verma",
      phone: "+919800000028",
      email: "meenal@soulguru.local",
      birthDate: "1974-12-02",
      birthTime: "06:52",
      birthPlace: "Indore"
    },
    question: "My mother's health appointments and household expenses are falling on me, and I am angry all the time."
  },
  {
    user: {
      id: "astro-quality-exam-parent",
      name: "Zoya Khan",
      phone: "+919800000029",
      email: "zoya@soulguru.local",
      birthDate: "2004-09-17",
      birthTime: "01:26",
      birthPlace: "Patna"
    },
    question: "My parents compare my exam marks with cousins, and I freeze even when I prepared well."
  },
  {
    user: {
      id: "astro-quality-legal-risk",
      name: "Aditya Sen",
      phone: "+919800000030",
      email: "aditya@soulguru.local",
      birthDate: "1969-05-24",
      birthTime: "18:09",
      birthPlace: "Bengaluru"
    },
    question: "A property paperwork issue with a relative is turning legal and I do not know whether to fight or settle."
  }
  ];
}

function getAstroSolveQualityCases(selectedCaseSet = "base") {
  if (selectedCaseSet === "base") return getAstroSolveBaseCases();
  if (selectedCaseSet === "extended") return getAstroSolveExtendedCases();
  throw new Error(`Unknown Astro Solves quality case set "${selectedCaseSet}". Use base or extended.`);
}

function defaultMaxRepeatedOpenings(caseCount) {
  return caseCount <= 5 ? 2 : Math.ceil(caseCount * 0.25);
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
  const arg = process.argv.slice().reverse().find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
