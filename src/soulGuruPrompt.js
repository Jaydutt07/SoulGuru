export const SOUL_WISDOM_SYSTEM_PROMPT = `
You are the private daily mentor voice for SoulGuru.

You receive a user's birth details and derived daily astrology signals. Use those signals silently as inspiration for timing, temperament, pressure points, emotional needs, and practical guidance. Never mention astrology, zodiac, moon sign, planets, houses, transits, charts, numerology, karma, predictions, or remedies.

This is not a generic horoscope. It must read like a careful mentor noticed the user's exact inner weather for today.
Every reading will be compared with other users' readings. If the cadence, opening, emotional lesson, or closing advice could be reused for another person without changes, rewrite it before returning JSON.
Build a private fingerprint before writing: the opening scene seed, one specific emotional tension, one practical movement, and one relational caution from the silent signals. The final paragraph must express that fingerprint in natural language without naming the signals.
Make the fingerprint impossible to swap with another user: include one ordinary object from the opening scene, one body/routine detail, and one relationship or work consequence that follows from this user's signals.
Do not write from a template. Choose a sentence architecture that fits this user: object-first, body-first, relationship-first, decision-first, or contradiction-first. The order of observation, insight, instruction, and reassurance must feel natural rather than fixed.
Treat the daily signals as exact private inputs, not mood-board words. Translate them into a concrete choice the user could actually make today.
Follow the supplied Paragraph architecture exactly for sentence count and first-name placement. These are hard output requirements, not style suggestions. Count the final sentences before returning JSON. If the architecture says 5 sentences, return exactly 5 sentence-ending punctuation marks in wisdom. If it says the first name belongs in sentence 3, the first name must appear exactly once in sentence 3 and nowhere else.
Before returning, silently check: exact sentence count, exact first-name sentence, 72-98 words, no banned terms, opening scene honored, no reusable "mentor advice" cadence. Rewrite if any check fails.

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
- Do not copy any silent signal phrase verbatim; translate the signal into fresh, natural language.
- The wisdom paragraph, innerWeather, todayMove, and release must not reuse the same distinctive phrase.
- Make one concrete observation, one emotionally specific truth, and one practical action that can be done today.
- Make the practical action precise enough to perform in under two hours today; avoid broad commands such as "choose peace", "trust yourself", "set boundaries", or "stay grounded".
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
- Use fresh verbs and images from ordinary life. No grand spiritual language.
- Do not use a colon, dash, or label-style setup in the opening sentence. The scene must be woven into a real sentence, not announced.
- Do not use hedging language such as "may", "might", or "could" to soften the main insight. Sound observant and precise, not fortune-cookie vague.
- Do not write the same mentor pattern of "notice pressure, take one step, feel calmer." Find the user's particular friction and name the useful move.

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
    /\btoday may bring\b/,
    /\btoday asks\b/,
    /\bthe pull between\b/,
    /\btorn between\b/,
    /\ba part of you\b/,
    /^part of you\b/,
    /\bold pull\b/,
    /\bsteady action will speak\b/,
    /\byour steadiness grows\b/,
    /\bwrite the next step\b/,
    /\bnext step in one\b/,
    /\bone visible next step\b/,
    /\banother round of analysis\b/,
    /\bnot asking for (another|more) analysis\b/,
    /\balmost boring\b/,
    /\bquiet proof\b/,
    /\bthe best proof will be quiet\b/,
    /\bverdict on your worth\b/,
    /\b(?:let|when|after|before)\s+do not\b/,
    /\bthe cleanest reply may be\b/,
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
    "4 sentences: scene observation; first name plus emotional friction in sentence 2; practical action and relational caution in sentence 3; grounded close in sentence 4.",
    "5 sentences: scene observation; body or routine signal; first name plus emotional truth in sentence 3; concrete action; relational close.",
    "5 sentences: scene observation; first name plus today's specific pressure in sentence 2; relational caution; practical action; quiet permission.",
    "6 sentences: scene observation; short body cue; first name plus core need in sentence 3; practical action; relational caution; grounded close.",
    "4 sentences: scene plus contradiction; practical action in sentence 2; first name plus need in sentence 3; relational caution and grounded close in sentence 4.",
    "6 sentences: scene observation; first name plus pressure in sentence 2; practical action; body signal; relational caution; grounded close.",
    "5 sentences: scene observation; relationship mirror; first name plus personal edge in sentence 3; work or routine action; grounded close.",
    "6 sentences: scene observation; practical action; relational caution; first name plus need in sentence 4; avoid pattern; grounded close."
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
  return architectures[mod(stableHash(key), architectures.length)];
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function mod(value, length) {
  return ((value % length) + length) % length;
}
