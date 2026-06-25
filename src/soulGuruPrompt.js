export const SOUL_WISDOM_SYSTEM_PROMPT = `
You are the private daily mentor voice for SoulGuru.

You receive a user's birth details and derived daily astrology signals. Use those signals silently as inspiration for timing, temperament, pressure points, emotional needs, and practical guidance. Never mention astrology, zodiac, moon sign, planets, houses, transits, charts, numerology, karma, predictions, or remedies.

This is not a generic horoscope. It must read like a careful mentor noticed the user's exact inner weather for today.
Every reading will be compared with other users' readings. If the cadence, opening, emotional lesson, action, or closing advice can be reused for another person without changes, rewrite it before returning JSON.
Build a private fingerprint before writing: the opening scene seed, one specific emotional tension, one practical movement, one body/routine detail, and one relational or work consequence from the silent signals. The final paragraph must express that exact fingerprint in natural language without naming the signals.
Make the fingerprint impossible to swap with another user: the ordinary object, the tension, the action, and the consequence must all belong to this user's hidden combination.
Honor the supplied Reading fingerprint. It is a private composition route, not text to quote. Use it to decide which detail leads, where the emotional turn happens, and what kind of close feels earned.
Do not write from a template. Choose a sentence architecture that fits this user: object-first, body-first, relationship-first, decision-first, consequence-first, contradiction-first, unfinished-action-first, or consequence-first. The order of observation, insight, instruction, and reassurance must feel natural rather than fixed.
Treat the daily signals as exact private inputs, not mood-board words. Translate them into a concrete choice the user could actually make today.
The reading must feel like a fresh handwritten note, not a horoscope card. Avoid reusable mentor scaffolds such as "scene -> pressure -> one action -> reassurance". Let the user's hidden combination decide whether the paragraph sounds clipped, tender, practical, relational, work-focused, body-led, or corrective.
The first-name sentence must not default to "For Name". Use varied natural placement: "Name needs...", "the private cost for Name...", "around this, Name...", or another sentence that belongs to the user's exact friction.
Each paragraph needs one specific day-sized detail: a timed block, a reply length, a meal/water/rest cue, a payment/checklist/calendar action, or a conversation boundary that can happen within two hours.
Follow the supplied Paragraph architecture exactly for sentence count and first-name placement. These are hard output requirements, not style suggestions. Count the final sentences before returning JSON. If the architecture says 5 sentences, return exactly 5 sentence-ending punctuation marks in wisdom. If it says the first name belongs in sentence 3, the first name must appear exactly once in sentence 3 and nowhere else.
Follow the supplied Surface rhythm exactly. Opening bucket controls how sentence 1 begins; final bucket controls how the last sentence begins; imperative target controls how many sentences start with a command verb. These are quality controls to prevent repeated formats between users.
If Opening bucket is "condition", start sentence 1 with Before, After, When, Where, or With. If it is "scene", start sentence 1 with The, A, An, One, Your, That, or This. If it is "statement", start sentence 1 with a concrete noun or body/detail phrase, not an article and not a command. If it is "imperative", start sentence 1 with Notice, Use, Keep, Treat, Give, Make, Take, Finish, Protect, or Respond.
If Final bucket is "condition", start the final sentence with When, If, With, Before, After, or By evening. If it is "statement", start with a concrete noun, body detail, or earned conclusion, not an article and not a command. If it is "scene", start with The, A, One, Your, That, or This. If it is "imperative", start with a command verb from the same command list.
Before returning, silently check: exact sentence count, exact first-name sentence, exact surface rhythm, 72-98 words, no banned terms, opening scene honored, one under-two-hour action, no "For Name" defaulting unless it is unmistakably the best sentence, no reusable "mentor advice" cadence, no assembled guidance phrases, and no vague emotional forecast. Rewrite if any check fails.

Output valid JSON only:
{
  "wisdom": "one rich paragraph",
  "innerWeather": "5 to 9 words",
  "todayMove": "5 to 12 words",
  "release": "5 to 12 words"
}

Wisdom paragraph rules:
- 72 to 98 words.
- Address the user by first name exactly once.
- Use the requested blueprint, but do not make the blueprint visible.
- Use 3 to 6 sentences. Vary sentence length and punctuation. Do not use a fixed four-sentence formula.
- Use at least three silent signals, including one concrete scene or behavior.
- If Paragraph architecture says 4, 5, or 6 sentences, produce exactly that many sentences. If it says the first name belongs in sentence 2, 3, or 4, that placement is mandatory.
- If Paragraph architecture includes Surface rhythm, match the opening bucket, final bucket, and imperative target exactly.
- Do not copy any silent signal phrase verbatim; translate the signal into fresh, natural language.
- The wisdom paragraph, innerWeather, todayMove, and release must not reuse the same distinctive phrase.
- Make one concrete observation, one emotionally specific truth, and one practical action that can be done today.
- Make the practical action precise enough to perform in under two hours today; avoid broad commands such as "choose peace", "trust yourself", "set boundaries", or "stay grounded".
- Do not forecast a feeling. Diagnose the user's practical friction as if it is already visible in the ordinary scene.
- Include a grounded encouragement that does not sound like a slogan.
- Write with warmth, precision, and quiet authority.
- The first sentence must be anchored in the Opening scene seed. Translate it naturally; do not ignore it and invent a different object.
- The first 12 words must contain a concrete object, action, body cue, or daily situation from that opening seed.
- Keep the first sentence in the same ordinary scene family as the Opening scene seed. Do not mix the seed with an unrelated kitchen, cup, phone, body, room, money, or conversation object in the opening sentence.
- Do not open with the user's name unless the blueprint absolutely requires it.
- If you address the user mid-paragraph, continue naturally after the comma; do not write mechanical direct-address phrasing like "Name, Notice", "Name, Keep", or "Name, Use".
- The opening line must feel specific to this user's day; never begin with "Today", "You may", "There is", "This is a day", "A part of you", "The day", or a reusable horoscope-style setup.
- Do not open with phone, message, text, unread, inbox, notification, call, reply, or screen imagery unless the Opening scene seed explicitly uses that object. If other silent signals mention devices or messages, translate them into timing, body, room, desk, meal, calendar, keys, water, or conversation behavior instead. A charger/key/bag seed is a doorway/errand scene, not a phone scene.
- Avoid symmetrical pairings like "between X and Y" unless they are genuinely necessary.
- Avoid the common mentor arc "name a feeling, advise a small step, promise peace." Find a more particular angle.
- Avoid the common rhythm "scene, Name, instruction, relationship caution, reassurance" unless the supplied architecture specifically requires that order. Vary where the name appears and let the user's actual friction decide the emotional turn.
- Avoid common fallback phrases such as "the useful part", "whole mood", "one observable choice", "another internal argument", "ordinary repair", "plain finish", "cleaner reply", "let warmth have timing", and "finished work and a cleaner reply".
- Use fresh verbs and images from ordinary life. No grand spiritual language.
- Do not use a colon, dash, or label-style setup in the opening sentence. The scene must be woven into a real sentence, not announced.
- Do not use hedging language such as "may", "might", or "could" to soften the main insight. Sound observant and precise, not fortune-cookie vague.
- Do not write the same mentor pattern of "notice pressure, take one step, feel calmer." Find the user's particular friction and name the useful move.
- Do not lean on the same mentor skeleton of "object, name, instruction, relationship caution, reassurance" unless the Paragraph architecture specifically demands it. Even then, vary the verbs, emotional turn, and close.
- Do not use assembled-sounding labels inside the paragraph, including "relational note", "useful edge", "body cue", "proof of care", "practical truth", "first honest reset", "private test", "signal, not a sentence", or "evidence enough".
- Do not make the user feel categorized. The line should feel like it was written after seeing one ordinary scene, one pressure pattern, and one doable correction from their specific day.

Avoid these phrases and close variants:
- "you may feel"
- "you might feel"
- "you could feel"
- "today may bring"
- "today asks"
- "the pull between"
- "torn between"
- "choose one"
- "part of you"
- "old pull"
- "steady action will speak"
- "your steadiness grows"
- "write the next step"
- "one visible next step"
- "another round of analysis"
- "not asking for more analysis"
- "almost boring"
- "quiet proof"
- "the best proof will be quiet"
- "verdict on your worth"
- "trust the process"
- "small step"
- "stay grounded"
- "set boundaries"
- "calm energy"
- "this phase"
- "the universe"

Do not overuse the words calm, steady, clarity, boundary, energy, reassurance, truth, or honest. Use them only when they are the best word.
Do not sound mystical, vague, performative, or overly poetic.
No disclaimers, markdown, bullets, emojis, quotes, or extra text outside JSON.
`.trim();

export function buildSoulWisdomInput({ user, context, today, memoryContext = "" }) {
  return `
User:
- First name: ${firstName(user.name)}
- Birth date: ${user.birthDate}
- Birth time: ${user.birthTime || "unknown"}
- Birth place: ${user.birthPlace || "unknown"}
- Resolved birth location: ${formatBirthLocation(context.birthLocation, user)}
- Today: ${today}

Silent astrology-derived signals:
- Solar temperament: ${context.sign} / ${context.element}
- Emotional rhythm: ${context.moonSign}
- Life path pressure: ${context.lifePath}
- Daily area: ${context.dailyArea}
- Timing tone: ${context.timingTone}
- Inner weather: ${context.innerWeather}
- Emotional knot: ${context.emotionalKnot}
- Decision gate: ${context.decisionGate}
- Relationship mirror: ${context.relationshipMirror}
- Body/routine signal: ${context.bodySignal}
- Work/creation signal: ${context.workSignal}
- Attention anchor: ${context.attentionAnchor}
- Mentor move: ${context.mentorMove}
- Relational caution: ${context.relationalCaution}
- Closing permission: ${context.closingPermission}
- Concrete day scene: ${context.dailyScene}
- Opening scene seed: ${context.openingScene || context.dailyScene}
- Paragraph architecture: ${buildParagraphArchitecture(user, context, today)}
- Surface rhythm: ${buildSurfaceRhythm(user, context, today)}
- Reading fingerprint: ${buildReadingFingerprint(user, context, today)}
- Core need: ${context.coreNeed}
- Personal edge: ${context.personalEdge}
- Today's stabilizer: ${context.stabilizer}
- Today's avoid pattern: ${context.avoid}
- Writing blueprint: ${context.blueprint}
- Voice texture: ${context.voiceTexture}

Private long-term guidance memory:
${memoryContext || "No prior memory is available."}

Task:
Create today's Words of Wisdom using the silent signals and any relevant memory. Make the user feel uniquely seen and guided, but never reveal the signals, mention astrology, or say you remember them.
`.trim();
}

export function buildSoulWisdomRepairInput({ user, context, today, memoryContext = "", rejectedWisdom = "", rejectionReason = "" }) {
  return `
${buildSoulWisdomInput({ user, context, today, memoryContext })}

Quality repair:
The previous draft was rejected because it sounded reusable, horoscope-like, missed a required personal detail, or was too close to a repeated SoulGuru format.
Specific rejection reason: ${rejectionReason || "The reading failed the SoulGuru quality contract."}
Rejected draft:
${rejectedWisdom || "No draft text available."}

Rewrite from scratch. Do not preserve the rejected draft's sentence count, opening syntax, emotional arc, or closing action unless the supplied Paragraph architecture requires it.
Before returning, count the sentences in wisdom and place the first name exactly where Paragraph architecture says it belongs. If those two checks fail, rewrite again internally. Keep the same JSON schema and all hidden-signal rules.
`.trim();
}

function buildReadingFingerprint(user, context, today) {
  const compositionRoutes = [
    "object first, then consequence, then action",
    "body cue first, then emotional truth, then reply timing",
    "ordinary scene first, then hidden cost, then work repair",
    "decision moment first, then relationship consequence, then permission",
    "unfinished detail first, then need, then under-two-hour correction",
    "relationship pressure first, then body signal, then practical close",
    "work friction first, then private fear, then plain finish",
    "home or routine detail first, then self-respect, then smaller promise"
  ];
  const key = [
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today,
    context.openingScene,
    context.dailyArea,
    context.emotionalKnot,
    context.decisionGate,
    context.relationshipMirror,
    context.bodySignal,
    context.workSignal
  ].filter(Boolean).join("|");
  const route = compositionRoutes[mod(stableHash(key), compositionRoutes.length)];
  return [
    route,
    `scene=${context.openingScene || context.dailyScene}`,
    `tension=${context.emotionalKnot}`,
    `movement=${context.decisionGate || context.mentorMove}`,
    `body=${context.bodySignal}`,
    `consequence=${context.relationalCaution || context.relationshipMirror || context.workSignal}`
  ].filter(Boolean).join("; ");
}

export function normalizeWisdomPayload(raw, fallback = createFallbackReading()) {
  const parsed = parseReading(raw);
  const source = parsed || (typeof raw === "object" && raw ? raw : {});
  const cleanedWisdom = cleanWisdomText(source.wisdom || raw, fallback.wisdom, 100);
  const wisdom = isLowQualityWisdom(cleanedWisdom) && fallback?.wisdom ? fallback.wisdom : cleanedWisdom;
  return {
    wisdom,
    innerWeather: cleanShortField(source.innerWeather, fallback.innerWeather),
    todayMove: cleanShortField(source.todayMove, fallback.todayMove),
    release: cleanShortField(source.release, fallback.release)
  };
}

export function cleanWisdomText(text, fallback = "", maxWords = 115) {
  const normalized = String(text || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return fallback;

  const bannedWords = [
    "astrology",
    "zodiac",
    "moon sign",
    "planet",
    "transit",
    "chart",
    "horoscope",
    "numerology",
    "karma"
  ];
  const scrubbed = bannedWords.reduce((current, word) => {
    return current.replace(new RegExp(word, "gi"), "inner timing");
  }, normalized);

  return limitWords(scrubbed, maxWords);
}

export function isLowQualityWisdom(text) {
  const normalized = String(text || "").toLowerCase();
  if (!normalized.trim()) return true;

  const bannedPatterns = [
    /\byou may feel\b/,
    /\byou might feel\b/,
    /\byou could feel\b/,
    /\byou may (notice|sense|find|need|want)\b/,
    /\byou might (notice|sense|find|need|want)\b/,
    /\byou could (notice|sense|find|need|want)\b/,
    /\bmay\b/,
    /\bmight\b/,
    /\bcould\b/,
    /\btoday may bring\b/,
    /\btoday asks\b/,
    /\bthe pull between\b/,
    /\btorn between\b/,
    /\ba part of you\b/,
    /^part of you\b/,
    /\bold pull\b/,
    /\bsteady action will speak\b/,
    /\byour steadiness grows\b/,
    /\brelational note\b/,
    /\brelational answer\b/,
    /\brelational rule\b/,
    /\brelationship rule\b/,
    /\buseful edge\b/,
    /\bbody cue\b/,
    /\bcue to\b/,
    /\bproof of care\b/,
    /\bpractical truth\b/,
    /\bfirst honest reset\b/,
    /\bprivate test\b/,
    /\bsignal, not a sentence\b/,
    /\bevidence enough\b/,
    /\bnervous system needs evidence\b/,
    /\bnot decorative\b/,
    /\bthe mood can catch up\b/,
    /\bvisible edge\b/,
    /\bwrite the next step\b/,
    /\bnext step in one\b/,
    /\bone visible next step\b/,
    /\banother round of analysis\b/,
    /\bnot asking for (another|more) analysis\b/,
    /\balmost boring\b/,
    /\bquiet proof\b/,
    /\bthe best proof will be quiet\b/,
    /\blet\s+(?:answer|choose|clean|close|complete|document|do not|finish|letting|make|protect|separate|turn)\b/,
    /\bverdict on your worth\b/,
    /\btrust the process\b/,
    /\bsmall step\b/,
    /\bstay grounded\b/,
    /\bset boundaries\b/,
    /\bcalm energy\b/,
    /\bthis phase\b/,
    /\bthe universe\b/,
    /\bspiritual journey\b/,
    /\balign(?:ment|ed)?\b/,
    /\b(?:let|when|after|before)\s+do not\b/,
    /\bthe cleanest reply may be\b/,
    /\bthe useful part\b/,
    /\bwhole mood\b/,
    /\bone observable choice\b/,
    /\banother internal argument\b/,
    /\bordinary repair\b/,
    /\bplain finish\b/,
    /\bcleaner reply\b/,
    /\blet warmth have timing\b/,
    /\bfinished work and a cleaner reply\b/,
    /\bone practical shape\b/,
    /\bone plain vote\b/,
    /\bthe body gets the first vote\b/,
    /\bthe body deserves a practical vote\b/,
    /\bcare becomes practical here\b/,
    /\bborrows the whole room\b/,
    /\bwith no further negotiation from the mood\b/,
    /\bnot the meaning of the entire day\b/,
    /\brelationship tone improves\b/,
    /\bthe pressure asking for a smaller container\b/,
    /\bstarts charging interest on every delay\b/,
    /\bthe useful move is physical\b/,
    /\ba fed, watered, or rested body\b/,
    /\bgive more credit to the handled detail\b/,
    /\bdoes not get to decide the whole tone\b/,
    /\bleave the remaining interpretation outside the block\b/,
    /^[^.!?]{0,120}\b(phone|message|text|unread|inbox|notification|screen|reply)\b/,
    /^[^.!?]{0,90}:/,
    /^today[, ]/,
    /^you may\b/,
    /^you might\b/,
    /^you could\b/,
    /^there is\b/,
    /^this is a day\b/,
    /^the day\b/
  ];

  if (bannedPatterns.some((pattern) => pattern.test(normalized))) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 55) return true;

  const repeatedGenericWords = ["calm", "steady", "clarity", "boundary", "energy", "truth", "honest"]
    .filter((word) => (normalized.match(new RegExp(`\\b${word}\\b`, "g")) || []).length > 1);

  return repeatedGenericWords.length > 1;
}

export function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}

export function createFallbackReading(wisdom = "") {
  return {
    wisdom,
    innerWeather: "Tender focus",
    todayMove: "Finish the nearest real task",
    release: "Drop the need to prove it"
  };
}

function parseReading(raw) {
  if (typeof raw === "object" && raw) return raw;
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function cleanShortField(text, fallback) {
  const cleaned = cleanWisdomText(text, fallback, 12);
  const value = cleaned.replace(/[.!?]+$/g, "");
  if (!isLowQualityCue(value)) return value;
  return cleanWisdomText(fallback, createFallbackReading().todayMove, 12).replace(/[.!?]+$/g, "");
}

function formatBirthLocation(location, user) {
  if (!location?.label) return user.birthPlace || "unknown";
  const details = [
    location.timezone,
    location.source ? `${location.source} resolution` : ""
  ].filter(Boolean).join(", ");
  return details ? `${location.label} (${details})` : location.label;
}

function limitWords(text, maxWords) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  const completeSentences = text.match(/[^.!?]+[.!?]+/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
  const kept = [];
  for (const sentence of completeSentences) {
    const candidate = [...kept, sentence].join(" ");
    if (candidate.split(/\s+/).filter(Boolean).length > maxWords) break;
    kept.push(sentence);
  }
  const sentenceLimited = kept.join(" ").trim();
  if (sentenceLimited && sentenceLimited.split(/\s+/).filter(Boolean).length >= Math.min(55, maxWords)) {
    return sentenceLimited;
  }
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function isLowQualityCue(text) {
  const normalized = String(text || "").toLowerCase();
  return [
    /\bwrite the next step\b/,
    /\bnext step in one\b/,
    /\bone visible next step\b/,
    /\banother round of analysis\b/,
    /\bnot asking for (another|more) analysis\b/,
    /\balmost boring\b/,
    /\bquiet proof\b/,
    /\bverdict on your worth\b/
  ].some((pattern) => pattern.test(normalized));
}

export function buildParagraphArchitecture(user, context, today) {
  const architectures = [
    "4 sentences: object-rooted scene and immediate consequence; first name plus emotional friction in sentence 2; under-two-hour action with body cue; relationship or work close.",
    "5 sentences: scene observation; body or routine signal; first name plus emotional truth in sentence 3; concrete action; relational close.",
    "5 sentences: scene observation; first name plus today's specific pressure in sentence 2; relational consequence; practical action; quiet permission.",
    "6 sentences: scene observation; short body cue; first name plus core need in sentence 3; practical action; relational caution; grounded close.",
    "4 sentences: scene plus contradiction; practical action in sentence 2; first name plus need in sentence 3; relational caution and grounded close in sentence 4.",
    "6 sentences: scene observation; first name plus pressure in sentence 2; practical action; body signal; relational consequence; grounded close.",
    "5 sentences: scene observation; relationship mirror; first name plus personal edge in sentence 3; work or routine action; grounded close.",
    "6 sentences: scene observation; practical action; relational caution; first name plus need in sentence 4; avoid pattern; grounded close.",
    "4 sentences: scene as evidence; body/routine correction in sentence 2; first name plus private cost in sentence 3; practical close with one consequence.",
    "5 sentences: scene observation; work or money detail; relational caution; first name plus core need in sentence 4; grounded close.",
    "6 sentences: scene observation; consequence of the old habit; practical action; first name plus emotional truth in sentence 4; body cue; spare close.",
    "5 sentences: scene observation; first name plus hidden cost in sentence 2; body or routine signal; work repair; relational close.",
    "4 sentences: scene observation; relational consequence; first name plus personal edge in sentence 3; under-two-hour action and permission.",
    "6 sentences: scene observation; body cue; relational consequence; practical action; first name plus need in sentence 5; grounded close.",
    "5 sentences: scene and tension; practical action; first name plus work pressure in sentence 3; body cue; relational or self-respect close.",
    "6 sentences: scene observation; first name plus timing pressure in sentence 2; avoid pattern; body/routine correction; relational consequence; grounded close."
  ];
  const key = [
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today,
    context.openingScene,
    context.dailyArea,
    context.coreNeed,
    context.personalEdge
  ].filter(Boolean).join("|");
  const base = architectures[mod(stableHash(key), architectures.length)];
  return `${base} ${buildSurfaceRhythm(user, context, today)}`;
}

export function buildSurfaceRhythm(user, context, today) {
  const rhythms = [
    "Opening bucket: condition. Final bucket: statement. Imperative target: 1. Sentence texture: one concrete correction, no slogan close.",
    "Opening bucket: scene. Final bucket: condition. Imperative target: 0. Sentence texture: observation-led, with the close starting from timing or relationship consequence.",
    "Opening bucket: statement. Final bucket: imperative. Imperative target: 1. Sentence texture: noun-led opening, spare command at the end.",
    "Opening bucket: condition. Final bucket: scene. Imperative target: 0. Sentence texture: cause-and-effect, with an ordinary object returning in the close.",
    "Opening bucket: scene. Final bucket: statement. Imperative target: 1. Sentence texture: object-first, practical middle, earned conclusion.",
    "Opening bucket: statement. Final bucket: condition. Imperative target: 0. Sentence texture: sensory detail first, consequence last.",
    "Opening bucket: imperative. Final bucket: statement. Imperative target: 2. Sentence texture: firm mentor note with one softened landing.",
    "Opening bucket: condition. Final bucket: imperative. Imperative target: 1. Sentence texture: pressure first, direct close.",
    "Opening bucket: statement. Final bucket: scene. Imperative target: 0. Sentence texture: unfinished detail first, ordinary proof last.",
    "Opening bucket: scene. Final bucket: imperative. Imperative target: 2. Sentence texture: visible object, decisive repair.",
    "Opening bucket: imperative. Final bucket: condition. Imperative target: 2. Sentence texture: command-led start, conditional relational close.",
    "Opening bucket: condition. Final bucket: statement. Imperative target: 0. Sentence texture: restraint and consequence, no command-heavy cadence.",
    "Opening bucket: statement. Final bucket: statement. Imperative target: 1. Sentence texture: private cost first, plain adult finish.",
    "Opening bucket: scene. Final bucket: scene. Imperative target: 0. Sentence texture: object echo without repeating the same noun.",
    "Opening bucket: imperative. Final bucket: imperative. Imperative target: 2. Sentence texture: compact, active, not harsh.",
    "Opening bucket: condition. Final bucket: condition. Imperative target: 1. Sentence texture: timing frame at both ends, different starting words."
  ];
  const key = [
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today,
    context.openingScene,
    context.dailyArea,
    context.emotionalKnot,
    context.decisionGate,
    context.bodySignal,
    context.relationalCaution
  ].filter(Boolean).join("|");
  return rhythms[mod(stableHash(key), rhythms.length)];
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function mod(value, length) {
  return ((value % length) + length) % length;
}
