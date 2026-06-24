import * as Astronomy from "astronomy-engine";
import { resolveBirthPlace } from "./placeResolver.js";

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

const DAILY_SCENES = [
  "an unanswered message, unfinished task, or slightly messy room",
  "a promise made quietly to yourself",
  "a conversation that needs timing more than force",
  "the moment before you explain yourself too much",
  "one practical detail that has been draining attention",
  "a private worry hiding inside ordinary work",
  "the first hour after you check your phone",
  "a decision that becomes simpler once the body is cared for",
  "the small pause before spending money, words, or trust",
  "a returning thought that needs one practical answer",
  "a duty that deserves shape before it becomes resentment",
  "the part of the day where silence can become strength",
  "a half-finished message waiting in the mind",
  "the receipt, deadline, or tab that keeps taking attention",
  "a room, desk, or inbox asking for one visible reset",
  "the moment your shoulders tighten before saying yes",
  "an old worry trying to enter a new conversation",
  "a choice that gets cleaner once it is written plainly"
];

const OPENING_SCENES = [
  "the water glass beside the bed before the first decision",
  "a calendar square that needs one honest appointment",
  "a notebook page with one unfinished line",
  "the kitchen counter before the first practical task",
  "the wallet, receipt, or small payment decision",
  "the chair where the same worry keeps returning",
  "the shoes near the door before a necessary errand",
  "a desk corner asking for one visible reset",
  "the first meal that keeps getting delayed",
  "a door half-closed before a conversation",
  "the list that grew because one item stayed unnamed",
  "the cup cooling while you rehearse the answer",
  "the bag, keys, or charger gathered too late",
  "the mirror moment before you agree too quickly",
  "the old tab in your mind that keeps reopening",
  "the quiet room after a sentence you did not send",
  "the folded laundry, open drawer, or small domestic proof",
  "the pen waiting beside a decision you already understand"
];

const CORE_NEEDS = [
  "respect without over-explaining",
  "a cleaner pace than the mood is asking for",
  "proof through follow-through, not pressure",
  "room to listen before responding",
  "a softer standard for the first attempt",
  "one boundary that does not require a speech",
  "less urgency around another person's reaction",
  "care that includes the body, not only the mind",
  "a decision that protects tomorrow's ease",
  "permission to finish before perfecting"
];

const PERSONAL_EDGES = [
  "stop treating delay as a verdict",
  "let a small completion restore trust in yourself",
  "choose the clean answer over the dramatic one",
  "notice where loyalty has become self-abandonment",
  "separate tiredness from truth before you decide",
  "give worry a practical job or let it stand down",
  "leave one old explanation unfinished",
  "make the smallest action visible enough to respect",
  "protect peace without turning cold",
  "answer the real question, not the imagined accusation"
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
  "decline the extra burden without making a speech",
  "name the cost before accepting the request",
  "put the deadline on paper before negotiating the mood",
  "repair the practical leak before asking for certainty",
  "wait until the first reaction has passed"
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
  "do not negotiate with exhaustion",
  "notice where the jaw or shoulders are voting no",
  "step away from the screen before choosing words",
  "start with breath, food, or movement before judgment",
  "let the body get neutral before you call it a sign"
];

const WORK_SIGNALS = [
  "complete the task with a name and deadline",
  "clean up the oldest unfinished item",
  "make the draft imperfect and real",
  "separate planning from proving",
  "document progress before judging it",
  "choose depth over scattered effort",
  "answer the practical question first",
  "make the action plain enough to complete",
  "close the loop that already has enough information",
  "turn the vague plan into a visible appointment",
  "finish one useful draft before improving it",
  "protect the work from unnecessary explanation"
];

const ATTENTION_ANCHORS = [
  "a tab, bill, or receipt that keeps reopening in the mind",
  "the message you have edited too many times",
  "the first yes that would quietly cost too much",
  "a private standard no one else can see",
  "the task that became heavier because it stayed unnamed",
  "a conversation that needs a clean time, not a louder tone",
  "one comfort habit that has started asking for repayment",
  "a promise that becomes easier once it is made smaller",
  "the difference between being available and being reachable",
  "the moment a small delay starts sounding like rejection"
];

const MENTOR_MOVES = [
  "make the promise smaller and keep it completely",
  "answer with timing instead of a long defense",
  "turn one private worry into a scheduled action",
  "let respect show through consistency, not volume",
  "choose the repair that future-you will notice",
  "pause before making tiredness sound like intuition",
  "remove one unnecessary explanation from the plan",
  "give the day a visible finish line",
  "let care arrive with a shape and a limit",
  "protect the useful work from emotional noise"
];

const RELATIONAL_CAUTIONS = [
  "do not make another person's uncertainty your assignment",
  "warmth becomes stronger when access has timing",
  "the cleanest reply may be shorter than your fear prefers",
  "a kind no can save more trust than a resentful yes",
  "wait for behavior to confirm what words are promising",
  "let listening inform you without recruiting you",
  "do not confuse being needed with being chosen",
  "give closeness a doorway instead of leaving every window open"
];

const CLOSING_PERMISSIONS = [
  "you can be gentle without becoming endlessly available",
  "one completed promise is enough evidence for today",
  "a slower answer can still be a loving one",
  "you do not have to turn pressure into performance",
  "letting the day be plain is not the same as wasting it",
  "self-respect can be quiet and still be final",
  "not every delay deserves a personal meaning",
  "finish the useful part and let the rest wait"
];

export function buildAstrologyContext(user, date = new Date()) {
  const birthPlace = resolveBirthPlace(user.birthPlace, user);
  const birthDate = buildBirthDate(user, birthPlace);
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
    birthPlace.label,
    birthPlace.latitude,
    birthPlace.longitude,
    birthPlace.timezone,
    today.toISOString().slice(0, 10),
    transitMoon.sign,
    transitSaturn.sign
  ].join("|"));

  return {
    sign: birthSun.sign,
    element: ELEMENTS[birthSun.sign],
    moonSign: birthMoon.sign,
    lifePath,
    birthLocation: {
      label: birthPlace.label,
      latitude: birthPlace.latitude,
      longitude: birthPlace.longitude,
      timezone: birthPlace.timezone,
      timezoneOffsetMinutes: birthPlace.timezoneOffsetMinutes,
      source: birthPlace.source
    },
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
    attentionAnchor: ATTENTION_ANCHORS[mod(seed + moonDistance + solarDistance, ATTENTION_ANCHORS.length)],
    mentorMove: MENTOR_MOVES[mod(seed + saturnDistance + transitMoon.signIndex, MENTOR_MOVES.length)],
    relationalCaution: RELATIONAL_CAUTIONS[mod(seed + birthMoon.signIndex + transitSaturn.signIndex, RELATIONAL_CAUTIONS.length)],
    closingPermission: CLOSING_PERMISSIONS[mod(seed + lifePath + transitSun.signIndex, CLOSING_PERMISSIONS.length)],
    dailyScene: DAILY_SCENES[mod(seed + transitMoon.signIndex + solarDistance, DAILY_SCENES.length)],
    openingScene: OPENING_SCENES[mod(seed + transitMoon.signIndex + transitSun.signIndex + lifePath, OPENING_SCENES.length)],
    coreNeed: CORE_NEEDS[mod(seed + saturnDistance + lifePath, CORE_NEEDS.length)],
    personalEdge: PERSONAL_EDGES[mod(seed + moonDistance + transitSaturn.signIndex, PERSONAL_EDGES.length)],
    stabilizer: pickStabilizer(moonDistance, saturnDistance, seed),
    avoid: pickAvoidPattern(saturnDistance, solarDistance, seed),
    blueprint: BLUEPRINTS[mod(seed + moonDistance + lifePath, BLUEPRINTS.length)],
    voiceTexture: VOICE_TEXTURES[mod(seed + saturnDistance + lifePath, VOICE_TEXTURES.length)]
  };
}

export function buildTransitDateForUser(user = {}, dateKey = new Date().toISOString().slice(0, 10), time = "12:00") {
  const birthPlace = resolveBirthPlace(user.birthPlace, user);
  return buildDateInTimeZone(dateKey, time, birthPlace.timezone, birthPlace.timezoneOffsetMinutes);
}

export function getSaadeSatiFromChart(user, date = new Date()) {
  const birthMoon = siderealBody("Moon", buildBirthDate(user, resolveBirthPlace(user.birthPlace, user)));
  const today = new Date(date);
  const transitSaturn = siderealBody("Saturn", today);
  const distance = signDistance(birthMoon.sign, transitSaturn.sign);
  const active = [12, 1, 2].includes(distance);
  const phaseIndex = distance === 12 ? 1 : distance === 1 ? 2 : distance === 2 ? 3 : 0;
  const phaseTitle = ["Outside Saade Sati", "Rising phase", "Peak phase", "Setting phase"][phaseIndex];
  const moonIndex = birthMoon.signIndex;
  const activeSignIndexes = [
    mod(moonIndex - 1, SIDEREAL_SIGNS.length),
    moonIndex,
    mod(moonIndex + 1, SIDEREAL_SIGNS.length)
  ];
  const saturnTransit = getSaturnSignWindow(today);
  const activeEndDate = active ? findNextSaturnConditionDate(today, (signIndex) => !activeSignIndexes.includes(signIndex)) : null;
  const nextStartDate = active ? null : findNextSaturnConditionDate(today, (signIndex) => activeSignIndexes.includes(signIndex));

  return {
    active,
    phaseIndex,
    phaseTitle,
    moonSign: birthMoon.sign,
    saturnSign: transitSaturn.sign,
    saturnTransit,
    activeEndDate,
    nextStartDate
  };
}

export function getSaturnSignWindow(date = new Date()) {
  const current = siderealBody("Saturn", date);
  const startDate = findSaturnSignBoundary(date, current.signIndex, -1);
  const endDate = findSaturnSignBoundary(date, current.signIndex, 1);
  return {
    sign: current.sign,
    signIndex: current.signIndex,
    degree: current.degree,
    startDate,
    endDate
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

function findSaturnSignBoundary(date, targetSignIndex, direction) {
  const stepMs = direction * 7 * 86400000;
  const maxSteps = 220;
  let inside = new Date(date);
  let outside = new Date(date);

  for (let step = 0; step < maxSteps; step += 1) {
    const candidate = new Date(outside.getTime() + stepMs);
    const signIndex = siderealBody("Saturn", candidate).signIndex;
    if (signIndex !== targetSignIndex) {
      return refineSaturnBoundary({
        inside,
        outside: candidate,
        targetSignIndex,
        direction
      });
    }
    inside = candidate;
    outside = candidate;
  }

  return new Date(date.getTime() + direction * 3 * 365 * 86400000);
}

function findNextSaturnConditionDate(date, condition) {
  const start = new Date(date);
  const stepMs = 30 * 86400000;
  const maxSteps = 40 * 12;
  let before = start;

  for (let step = 1; step <= maxSteps; step += 1) {
    const candidate = new Date(start.getTime() + step * stepMs);
    const signIndex = siderealBody("Saturn", candidate).signIndex;
    if (condition(signIndex)) {
      return refineConditionBoundary({
        before,
        after: candidate,
        condition
      });
    }
    before = candidate;
  }

  return null;
}

function refineSaturnBoundary({ inside, outside, targetSignIndex, direction }) {
  let low = direction > 0 ? inside : outside;
  let high = direction > 0 ? outside : inside;
  const minMs = 60 * 60 * 1000;

  while (high.getTime() - low.getTime() > minMs) {
    const middle = new Date((low.getTime() + high.getTime()) / 2);
    const signIndex = siderealBody("Saturn", middle).signIndex;
    if (signIndex === targetSignIndex) {
      if (direction > 0) {
        low = middle;
      } else {
        high = middle;
      }
    } else if (direction > 0) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return high;
}

function refineConditionBoundary({ before, after, condition }) {
  let low = before;
  let high = after;
  const minMs = 60 * 60 * 1000;

  while (high.getTime() - low.getTime() > minMs) {
    const middle = new Date((low.getTime() + high.getTime()) / 2);
    const signIndex = siderealBody("Saturn", middle).signIndex;
    if (condition(signIndex)) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return high;
}

function buildBirthDate(user, birthPlace = resolveBirthPlace(user.birthPlace, user)) {
  const date = user.birthDate || new Date().toISOString().slice(0, 10);
  const time = user.birthTime || "12:00";
  return buildDateInTimeZone(date, time, birthPlace.timezone, birthPlace.timezoneOffsetMinutes);
}

function buildDateInTimeZone(date, time, timeZone, offsetMinutes = 330) {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute } = parseTimeParts(time);
  const localUtc = Date.UTC(year, month - 1, day, hour, minute);

  if (!timeZone) {
    return buildDateWithOffset(date, time, offsetMinutes);
  }

  let utc = localUtc;
  for (let index = 0; index < 3; index += 1) {
    const zoneOffset = getTimeZoneOffsetMinutes(new Date(utc), timeZone);
    if (zoneOffset === null) {
      return buildDateWithOffset(date, time, offsetMinutes);
    }
    const nextUtc = localUtc - zoneOffset * 60000;
    if (Math.abs(nextUtc - utc) < 1000) {
      return new Date(nextUtc);
    }
    utc = nextUtc;
  }

  return new Date(utc);
}

function buildDateWithOffset(date, time, offsetMinutes = 330) {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute } = parseTimeParts(time);
  const offset = finiteNumber(offsetMinutes, 330);
  const utc = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(utc - offset * 60000);
}

function parseDateParts(date) {
  const [year, month, day] = String(date).split("-").map(Number);
  return {
    year: year || 2000,
    month: month || 1,
    day: day || 1
  };
}

function parseTimeParts(time) {
  const [hour = 12, minute = 0] = String(time || "12:00").split(":").map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0
  };
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
    const zoneTimeAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return Math.round((zoneTimeAsUtc - date.getTime()) / 60000);
  } catch {
    return null;
  }
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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
    "name one small finish line before you begin",
    "keep one limit without apologizing for it",
    "protect the first quiet hour of the day",
    "document progress before judging yourself",
    "put the oldest loose end somewhere visible",
    "make the first reply shorter than your first draft",
    "turn the worry into a time-bound errand",
    "finish the draft before improving its style",
    "let the body settle before making meaning"
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
    "making one mood responsible for the whole day",
    "turning every delay into a private verdict",
    "confusing access with affection",
    "letting a small mess become your whole identity",
    "spending care without checking the cost",
    "using explanation as a substitute for a decision"
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
