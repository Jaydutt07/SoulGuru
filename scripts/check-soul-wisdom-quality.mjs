import { performance } from "node:perf_hooks";
import { loadEnv } from "vite";
import { buildAstrologyContext, buildTransitDateForUser } from "../src/astrologyEngine.js";
import { createDailySoulWisdom } from "../src/backend/soulWisdomService.js";
import { getDailyWisdom } from "../src/localSoulWisdom.js";
import { buildParagraphArchitecture, firstName, isLowQualityWisdom } from "../src/soulGuruPrompt.js";
import { SOUL_WISDOM_MAX_WORDS, SOUL_WISDOM_MIN_WORDS } from "../src/soulWisdomVersion.js";
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
const minWords = Number(getArgValue("--min-words") || SOUL_WISDOM_MIN_WORDS);
const maxWords = Number(getArgValue("--max-words") || SOUL_WISDOM_MAX_WORDS);
const maxSimilarity = Number(getArgValue("--max-similarity") || 0.24);
const cases = getSoulWisdomQualityCases(caseSet);
const maxSceneRepeats = Number(getArgValue("--max-scene-repeats") || defaultMaxSceneRepeats(cases.length));
const maxStructureRepeats = Number(getArgValue("--max-structure-repeats") || defaultMaxStructureRepeats(cases.length));
const repeatedPhraseOwners = Number(getArgValue("--max-repeated-owners") || 2);
const maxShortAnchorOwners = Number(getArgValue("--max-short-anchor-owners") || 1);

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
  const repeatedStructures = buildStructureRepeats(group.results).filter((item) => item.count > maxStructureRepeats);
  const deviceOpenings = group.results.filter((item) => item.openingSceneCategory === "device");
  const repeatedDistinctivePhrases = buildRepeatedDistinctivePhrases(group.results, repeatedPhraseOwners);
  const repeatedShortAnchors = buildRepeatedShortAnchorPhrases(group.results, maxShortAnchorOwners);
  if (repeatedScenes.length) {
    failures.push(`${group.source}: repeated opening scene category ${repeatedScenes.map((item) => `${item.category}=${item.count}`).join(", ")}.`);
  }
  if (repeatedStructures.length) {
    failures.push(`${group.source}: repeated paragraph structure ${repeatedStructures.map((item) => `${item.signature}=${item.count}`).join(", ")}.`);
  }
  if (deviceOpenings.length > 1) {
    failures.push(`${group.source}: device/message imagery opened ${deviceOpenings.length} readings.`);
  }
  if (repeatedDistinctivePhrases.length) {
    failures.push(`${group.source}: repeated distinctive phrase(s): ${repeatedDistinctivePhrases.slice(0, 3).map((item) => `"${item.phrase}" in ${item.names.join(" / ")}`).join("; ")}.`);
  }
  if (repeatedShortAnchors.length) {
    failures.push(`${group.source}: repeated short anchor phrase(s): ${repeatedShortAnchors.slice(0, 3).map((item) => `"${item.phrase}" in ${item.names.join(" / ")}`).join("; ")}.`);
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
  const sentences = splitSentences(wisdom);
  const failures = [];
  const wordCount = words(wisdom).length;
  const nameCount = countWord(wisdom, firstName(user.name));
  const nameSentenceIndex = sentences.findIndex((sentence) => countWord(sentence, firstName(user.name)) > 0);

  if (wordCount < minWords || wordCount > maxWords) {
    failures.push(`expected ${minWords}-${maxWords} words, got ${wordCount}.`);
  }
  if (sentences.length < 3 || sentences.length > 6) {
    failures.push(`expected 3-6 sentences, got ${sentences.length}.`);
  }
  if (isLowQualityWisdom(wisdom)) {
    failures.push("matched low-quality/repeated phrasing rules.");
  }
  if (nameCount !== 1) {
    failures.push(`expected first name exactly once, got ${nameCount}.`);
  }
  if (hasMechanicalDirectAddressCasing(wisdom, firstName(user.name))) {
    failures.push("used mechanical capitalized direct-address phrasing.");
  }
  if (hasAwkwardTemplateJoin(wisdom)) {
    failures.push("used an awkward template join such as 'Let turn', 'Let give', or 'Let letting'.");
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
  failures.push(...getParagraphArchitectureFailures({
    sentences,
    user,
    context,
    today: source === "openai" ? formatDateForPrompt(date) : date
  }));

  return {
    source,
    name: user.name,
    wordCount,
    lowQuality: isLowQualityWisdom(wisdom),
    quality: result.quality || null,
    openingSceneCategory,
    expectedOpeningScene,
    sentenceCount: sentences.length,
    structureSignature: buildStructureSignature(sentences, nameSentenceIndex),
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
    console.log(`- ${item.name}: ${item.wordCount} words${repair}; scene=${item.openingSceneCategory}; structure=${item.structureSignature}; opening="${item.opening}"`);
    if (showReadings) {
      console.log(`  ${item.wisdom}`);
    }
  }
}

function buildSceneRepeats(results) {
  const counts = new Map();
  for (const item of results) {
    counts.set(item.openingSceneCategory, (counts.get(item.openingSceneCategory) || 0) + 1);
  }
  return [...counts].map(([category, count]) => ({ category, count }));
}

function buildStructureRepeats(results) {
  const counts = new Map();
  for (const item of results) {
    counts.set(item.structureSignature, (counts.get(item.structureSignature) || 0) + 1);
  }
  return [...counts].map(([signature, count]) => ({ signature, count }));
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

function buildRepeatedDistinctivePhrases(results, minOwners = 2) {
  const phraseOwners = new Map();
  for (const item of results) {
    const seen = new Set();
    for (const phrase of buildDistinctivePhrases(item.wisdom)) {
      seen.add(phrase);
    }
    for (const phrase of seen) {
      const names = phraseOwners.get(phrase) || [];
      names.push(item.name);
      phraseOwners.set(phrase, names);
    }
  }
  return [...phraseOwners]
    .filter(([, names]) => names.length >= minOwners)
    .map(([phrase, names]) => ({ phrase, names }))
    .sort((first, second) => second.names.length - first.names.length || second.phrase.length - first.phrase.length);
}

function buildRepeatedShortAnchorPhrases(results, maxOwners = 1) {
  const phraseOwners = new Map();
  for (const item of results) {
    const seen = new Set(buildShortAnchorPhrases(firstTwoSentences(item.wisdom)));
    for (const phrase of seen) {
      const names = phraseOwners.get(phrase) || [];
      names.push(item.name);
      phraseOwners.set(phrase, names);
    }
  }
  return [...phraseOwners]
    .filter(([, names]) => names.length > maxOwners)
    .map(([phrase, names]) => ({ phrase, names }))
    .sort((first, second) => second.names.length - first.names.length || second.phrase.length - first.phrase.length);
}

function buildShortAnchorPhrases(text) {
  const tokens = normalizedPhraseTokens(text);
  const phrases = new Set();
  for (const size of [3, 2]) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phraseTokens = tokens.slice(index, index + size);
      if (isShortAnchorPhrase(phraseTokens)) {
        phrases.add(phraseTokens.join(" "));
      }
    }
  }
  return [...phrases];
}

function isShortAnchorPhrase(tokens) {
  const stop = new Set(["a", "an", "and", "are", "around", "as", "at", "before", "by", "for", "from", "has", "have", "in", "into", "is", "it", "its", "near", "not", "of", "on", "or", "that", "the", "then", "this", "to", "when", "where", "with", "without", "you", "your"]);
  const anchors = new Set([
    "access",
    "appointment",
    "approval",
    "bedtime",
    "block",
    "body",
    "calendar",
    "container",
    "decision",
    "desk",
    "door",
    "draft",
    "evening",
    "evidence",
    "explanation",
    "finish",
    "hearing",
    "invoice",
    "line",
    "meal",
    "message",
    "payment",
    "pressure",
    "private",
    "promise",
    "proof",
    "reply",
    "room",
    "square",
    "task",
    "timing",
    "trial",
    "water",
    "warmth"
  ]);
  const meaningful = tokens.filter((token) => !stop.has(token) && !/\d/.test(token));
  if (meaningful.length < 2) return false;
  if (!tokens.some((token) => anchors.has(token))) return false;
  if (tokens.some((token) => token.length < 4 && !["due"].includes(token))) return false;
  return true;
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

function firstTwoSentences(text) {
  const sentences = splitSentences(text);
  return sentences.slice(0, 2).join(" ");
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
    ["kitchen", /\b(kitchen|counter|tea|cup|meal|food|breakfast|lunch)\b/],
    ["calendar", /\b(calendar|appointment|deadline|time|hour|slot)\b/],
    ["notebook", /\b(notebook|page|pen|line|written|write)\b/],
    ["money", /\b(wallet|receipt|payment|bill|price|money)\b/],
    ["conversation", /\b(conversation|sentence|call|answer|agree|yes|say|reply|word|words|unsent|held-back|send)\b/],
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

function buildStructureSignature(sentences, nameSentenceIndex) {
  if (!sentences.length) return "empty";
  const opening = sentenceOpeningBucket(sentences[0]);
  const last = sentenceOpeningBucket(sentences[sentences.length - 1]);
  const imperativeCount = sentences.filter((sentence) => sentenceOpeningBucket(sentence) === "imperative").length;
  const colonOpening = /^[^.!?]{0,90}:/.test(sentences[0]) ? "colon" : "woven";
  return `${sentences.length}s/name${nameSentenceIndex}/${colonOpening}/${opening}/${imperativeCount}i/${last}`;
}

function sentenceOpeningBucket(sentence) {
  const normalized = String(sentence || "").toLowerCase().trim();
  if (/^(answer|begin|check|choose|close|decline|do|drink|eat|finish|give|handle|keep|leave|let|make|name|notice|protect|put|reduce|respond|schedule|send|separate|set|shrink|stand|stop|take|treat|use|wait|walk|write)\b/.test(normalized)) {
    return "imperative";
  }
  if (/^(before|after|by evening|if|when|where|with)\b/.test(normalized)) {
    return "condition";
  }
  if (/^[a-z]+,\b/.test(normalized)) {
    return "name";
  }
  if (/^(a|an|the|one|your|that|this)\b/.test(normalized)) {
    return "scene";
  }
  return "statement";
}

function countWord(text, word) {
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function hasMechanicalDirectAddressCasing(text, name) {
  const verbs = [
    "Answer",
    "Begin",
    "Check",
    "Choose",
    "Close",
    "Decline",
    "Do",
    "Finish",
    "Give",
    "Handle",
    "Keep",
    "Let",
    "Make",
    "Name",
    "Notice",
    "Protect",
    "Reduce",
    "Respond",
    "Separate",
    "Shrink",
    "Stop",
    "Take",
    "Treat",
    "Use",
    "Wait",
    "Walk",
    "Write"
  ];
  const pattern = new RegExp(`\\b${escapeRegex(name)},\\s+(?:${verbs.join("|")})\\b`);
  return pattern.test(String(text || ""));
}

function hasAwkwardTemplateJoin(text) {
  return [
    /\bLet\s+(?:answer|choose|clean|close|complete|document|do|drink|eat|finish|give|handle|keep|lower|make|name|protect|put|reduce|repair|schedule|separate|send|simplify|sleep|step|take|turn|use|walk|write)\b/i,
    /\blet\s+let\b/i,
    /\bwhen\s+(?:protect|eat|drink|walk|leave|start|lower|step)\b/i,
    /\bwhen\s+do not\b/i,
    /\blet\s+(?:protect|eat|drink|walk|sleep|leave|start|lower|step)\b[^.!?]+\bdecide\b/i
  ].some((pattern) => pattern.test(String(text || "")));
}

function getParagraphArchitectureFailures({ sentences, user, context, today }) {
  const architecture = buildParagraphArchitecture(user, context, today);
  const sentenceCount = Number(String(architecture || "").match(/^(\d+) sentences?/)?.[1] || 0);
  const nameSentence = Number(String(architecture || "").match(/first name plus [^;]+ in sentence (\d+)/)?.[1] || 0);
  const expectedOpeningBucket = String(architecture || "").match(/Opening bucket:\s*([a-z]+)/i)?.[1]?.toLowerCase();
  const expectedFinalBucket = String(architecture || "").match(/Final bucket:\s*([a-z]+)/i)?.[1]?.toLowerCase();
  const expectedImperativeTarget = Number(String(architecture || "").match(/Imperative target:\s*(\d+)/i)?.[1] || Number.NaN);
  const failures = [];
  if (sentenceCount && sentences.length !== sentenceCount) {
    failures.push(`expected paragraph architecture sentence count ${sentenceCount}, got ${sentences.length}.`);
  }
  if (nameSentence) {
    const nameIndex = sentences.findIndex((sentence) => countWord(sentence, firstName(user.name)) > 0);
    if (nameIndex !== nameSentence - 1) {
      failures.push(`expected first name in sentence ${nameSentence}, got ${nameIndex + 1 || 0}.`);
    }
  }
  if (expectedOpeningBucket && sentences[0]) {
    const actualOpeningBucket = sentenceOpeningBucket(sentences[0]);
    if (actualOpeningBucket !== expectedOpeningBucket) {
      failures.push(`expected opening bucket ${expectedOpeningBucket}, got ${actualOpeningBucket}.`);
    }
  }
  if (expectedFinalBucket && sentences.at(-1)) {
    const actualFinalBucket = sentenceOpeningBucket(sentences.at(-1));
    if (actualFinalBucket !== expectedFinalBucket) {
      failures.push(`expected final bucket ${expectedFinalBucket}, got ${actualFinalBucket}.`);
    }
  }
  if (Number.isFinite(expectedImperativeTarget)) {
    const actualImperatives = sentences.filter((sentence) => sentenceOpeningBucket(sentence) === "imperative").length;
    if (actualImperatives !== expectedImperativeTarget) {
      failures.push(`expected imperative target ${expectedImperativeTarget}, got ${actualImperatives}.`);
    }
  }
  return failures;
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

function defaultMaxStructureRepeats(caseCount) {
  return caseCount <= 5 ? 1 : Math.ceil(caseCount * 0.25);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
