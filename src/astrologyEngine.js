import * as Astronomy from "astronomy-engine";

const SIDEREAL_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

const ELEMENTS = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water"
};

const DAILY_AREAS = [
  "unfinished work and personal authority",
  "relationship tone and unspoken expectations",
  "family responsibility and private fatigue",
  "money choices, self-worth, and restraint",
  "learning, discipline, and scattered attention",
  "home rhythm, rest, and emotional privacy",
  "public image, ambition, and delayed recognition",
  "healing a repeated conversation with yourself",
  "health rhythm, food, and nervous-system recovery",
  "creative voice, visibility, and self-expression",
  "friendship, social pressure, and belonging",
  "private closure, forgiveness, and sleep"
];

const BLUEPRINTS = [
  "Begin with a concrete scene from the user's day, then reveal the emotional lesson, then give one precise instruction.",
  "Open with a firm mentor statement, contrast what drains them with what restores them, end with a quiet permission.",
  "Start from the body or routine, connect it to an inner pattern, then give a relational caution.",
  "Name the hidden cost of their current habit, offer a cleaner replacement, close with grounded reassurance.",
  "Lead with what not to chase today, then define the single useful direction, then soften the pressure.",
  "Use a warm direct address, include one surprising but believable observation, and avoid a symmetrical four-part rhythm."
];

const VOICE_TEXTURES = [
  "clear, intimate, lightly firm",
  "warm but unsentimental",
  "precise, adult, non-performative",
  "gentle with one sharp edge",
  "quietly confident, practical",
  "protective, spare, emotionally exact"
];

const TIMING_TONES = [
  "act early, then observe",
  "wait until the body settles",
  "repair one small leak",
  "use fewer words than usual",
  "take the slower but cleaner route",
  "make the practical choice first",
  "answer only what was asked",
  "close the open loop before starting another"
];

const INNER_WEATHERS = [
  "restless but ready to simplify",
  "sensitive to tone and timing",
  "tired of carrying the room",
  "sharp-minded but easily scattered",
  "quietly ambitious, privately doubtful",
  "protective of peace, slow to trust",
  "drawn toward honesty after avoidance",
  "more capable than the mood suggests"
];

const EMOTIONAL_KNOTS = [
  "wanting permission for a decision already made",
  "confusing delay with rejection",
  "treating responsibility as proof of love",
  "making self-respect depend on someone else's softness",
  "turning unfinished work into a story about worth",
  "staying available so nobody calls you difficult",
  "seeking certainty from people who are also unsure",
  "trying to be understood before becoming clear"
];

const DECISION_GATES = [
  "send the message only after simplifying it",
  "do the visible task before the emotional debate",
  "pay attention to what repeats, not what is loud",
  "let one answer be enough for the day",
  "take care of the body before naming the problem",
  "make the choice that reduces future mess",
  "finish the promise you made to yourself",
  "decline the extra burden without making a speech"
];

const RELATIONSHIP_MIRRORS = [
  "someone's reaction is not the whole truth",
  "warmth does not require immediate access",
  "the right conversation will need fewer defenses",
  "listening closely does not mean absorbing everything",
  "love becomes cleaner when timing is respected",
  "silence should be rest, not punishment",
  "care is stronger when it has a shape",
  "attention is not the same as surrender"
];

const BODY_SIGNALS = [
  "eat before the difficult conversation",
  "leave space between messages",
  "walk before deciding",
  "sleep matters more than one more check",
  "drink water before calling it intuition",
  "lower the pace of the morning",
  "protect the first quiet hour",
  "do not negotiate with exhaustion"
];

const WORK_SIGNALS = [
  "complete the task with a name and deadline",
  "clean up the oldest unfinished item",
  "make the draft imperfect and real",
  "separate planning from proving",
  "document progress before judging it",
  "choose depth over scattered effort",
  "answer the practical question first",
  "let the next step be almost boring"
];

export function buildAstrologyContext(user, date = new Date()) {
  const birthDate = buildBirthDate(user);
  const today = new Date(date);
  const birthSun = siderealBody("Sun", birthDate);
  const birthMoon = siderealBody("Moon", birthDate);
  const birthSaturn = siderealBody("Saturn", birthDate);
  const transitMoon = siderealBody("Moon", today);
  const transitSun = siderealBody("Sun", today);
  const transitSaturn = siderealBody("Saturn", today);
  const lifePath = reduceDigits(user.birthDate);
  const moonDistance = signDistance(birthMoon.sign, transitMoon.sign);
  const saturnDistance = signDistance(birthMoon.sign, transitSaturn.sign);
  const solarDistance = signDistance(birthSun.sign, transitSun.sign);
  const seed = stableHash([
    user.id,
    user.phone,
    user.email,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today.toISOString().slice(0, 10),
    transitMoon.sign,
    transitSaturn.sign
  ].join("|"));

  return {
    sign: birthSun.sign,
    element: ELEMENTS[birthSun.sign],
    moonSign: birthMoon.sign,
    lifePath,
    birthChart: {
      sun: serializePlacement(birthSun),
      moon: serializePlacement(birthMoon),
      saturn: serializePlacement(birthSaturn)
    },
    transits: {
      sun: serializePlacement(transitSun),
      moon: serializePlacement(transitMoon),
      saturn: serializePlacement(transitSaturn),
      moonFromNatalMoon: moonDistance,
      saturnFromNatalMoon: saturnDistance,
      sunFromNatalSun: solarDistance
    },
    dailyArea: DAILY_AREAS[mod(moonDistance + solarDistance + lifePath, DAILY_AREAS.length)],
    timingTone: TIMING_TONES[mod(transitMoon.signIndex + lifePath, TIMING_TONES.length)],
    innerWeather: INNER_WEATHERS[mod(moonDistance + seed, INNER_WEATHERS.length)],
    emotionalKnot: EMOTIONAL_KNOTS[mod(saturnDistance + lifePath + seed, EMOTIONAL_KNOTS.length)],
    decisionGate: DECISION_GATES[mod(transitSaturn.signIndex + solarDistance + seed, DECISION_GATES.length)],
    relationshipMirror: RELATIONSHIP_MIRRORS[mod(transitMoon.signIndex + birthMoon.signIndex, RELATIONSHIP_MIRRORS.length)],
    bodySignal: BODY_SIGNALS[mod(moonDistance + transitSun.signIndex, BODY_SIGNALS.length)],
    workSignal: WORK_SIGNALS[mod(saturnDistance + transitSaturn.signIndex, WORK_SIGNALS.length)],
    stabilizer: pickStabilizer(moonDistance, saturnDistance, seed),
    avoid: pickAvoidPattern(saturnDistance, solarDistance, seed),
    blueprint: BLUEPRINTS[mod(seed + moonDistance + lifePath, BLUEPRINTS.length)],
    voiceTexture: VOICE_TEXTURES[mod(seed + saturnDistance + lifePath, VOICE_TEXTURES.length)]
  };
}

export function getSaadeSatiFromChart(user, date = new Date()) {
  const birthMoon = siderealBody("Moon", buildBirthDate(user));
  const transitSaturn = siderealBody("Saturn", date);
  const distance = signDistance(birthMoon.sign, transitSaturn.sign);
  const active = [12, 1, 2].includes(distance);
  const phaseIndex = distance === 12 ? 1 : distance === 1 ? 2 : distance === 2 ? 3 : 0;
  const phaseTitle = ["Outside Saade Sati", "Rising phase", "Peak phase", "Setting phase"][phaseIndex];
  return {
    active,
    phaseIndex,
    phaseTitle,
    moonSign: birthMoon.sign,
    saturnSign: transitSaturn.sign
  };
}

function siderealBody(bodyName, date) {
  const tropical = geocentricLongitude(bodyName, date);
  const sidereal = mod(tropical - lahiriAyanamsa(date), 360);
  const signIndex = Math.floor(sidereal / 30);
  return {
    body: bodyName,
    longitude: round(sidereal),
    sign: SIDEREAL_SIGNS[signIndex],
    signIndex,
    degree: round(sidereal % 30)
  };
}

function geocentricLongitude(bodyName, date) {
  if (bodyName === "Moon") {
    return Astronomy.EclipticGeoMoon(date).lon;
  }
  if (bodyName === "Sun") {
    return mod(Astronomy.EclipticLongitude(Astronomy.Body.Earth, date) + 180, 360);
  }
  const vector = Astronomy.GeoVector(Astronomy.Body[bodyName], date, true);
  return Astronomy.Ecliptic(vector).elon;
}

function buildBirthDate(user) {
  const date = user.birthDate || new Date().toISOString().slice(0, 10);
  const time = user.birthTime || "12:00";
  return new Date(`${date}T${time}:00+05:30`);
}

function lahiriAyanamsa(date) {
  const year = date.getUTCFullYear() + (dayOfYear(date) - 1) / 365.2425;
  return 23.85675 + (year - 2000) * 0.013968;
}

function dayOfYear(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86400000);
}

function serializePlacement(placement) {
  return {
    sign: placement.sign,
    degree: placement.degree,
    longitude: placement.longitude
  };
}

function signDistance(fromSign, toSign) {
  const from = SIDEREAL_SIGNS.indexOf(fromSign);
  const to = SIDEREAL_SIGNS.indexOf(toSign);
  return mod(to - from, 12) + 1;
}

function pickStabilizer(moonDistance, saturnDistance, seed) {
  const stabilizers = [
    "complete one pending responsibility before noon",
    "make one clean decision and let it stand",
    "slow your speech before a sensitive conversation",
    "return to food, water, and rest before reacting",
    "write the next step in one sentence",
    "keep one limit without apologizing for it",
    "protect the first quiet hour of the day",
    "document progress before judging yourself"
  ];
  return stabilizers[mod(moonDistance + saturnDistance + seed, stabilizers.length)];
}

function pickAvoidPattern(saturnDistance, solarDistance, seed) {
  const patterns = [
    "over-explaining",
    "checking for signs in every small change",
    "rushing to fix someone else's discomfort",
    "turning tiredness into doubt",
    "reopening a settled conversation",
    "proving worth through exhaustion",
    "answering before your body settles",
    "making one mood responsible for the whole day"
  ];
  return patterns[mod(saturnDistance + solarDistance + seed, patterns.length)];
}

function reduceDigits(value) {
  let sum = String(value || "").replace(/\D/g, "").split("").reduce((total, digit) => total + Number(digit), 0);
  while (sum > 9) {
    sum = String(sum).split("").reduce((total, digit) => total + Number(digit), 0);
  }
  return sum || 1;
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function mod(value, length) {
  return ((value % length) + length) % length;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
