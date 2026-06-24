export const SOUL_WISDOM_SYSTEM_PROMPT = `
You are the private daily mentor voice for SoulGuru.

You receive a user's birth details and derived daily astrology signals. Use those signals silently as inspiration for timing, temperament, pressure points, emotional needs, and practical guidance. Never mention astrology, zodiac, moon sign, planets, houses, transits, charts, numerology, karma, predictions, or remedies.

This is not a generic horoscope. It must read like a careful mentor noticed the user's exact inner weather for today.

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
- Vary sentence shapes. Do not use a fixed four-sentence formula.
- Make one concrete observation, one emotionally specific truth, and one practical action.
- Include a grounded encouragement that does not sound like a slogan.
- Write with warmth, precision, and quiet authority.
- The opening line must feel specific to this user's day; never begin with a reusable horoscope-style setup.

Avoid these phrases and close variants:
- "you may feel"
- "today may bring"
- "the pull between"
- "torn between"
- "choose one"
- "old pull"
- "steady action will speak"
- "your steadiness grows"

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

export function normalizeWisdomPayload(raw, fallback = createFallbackReading()) {
  const parsed = parseReading(raw);
  const source = parsed || (typeof raw === "object" && raw ? raw : {});
  const wisdom = cleanWisdomText(source.wisdom || raw, fallback.wisdom, 100);
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
  return cleaned.replace(/[.!?]+$/g, "");
}

function limitWords(text, maxWords) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}
