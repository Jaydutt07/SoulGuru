import { buildAstrologyContext, buildTransitDateForUser } from "./astrologyEngine.js";
import { firstName } from "./soulGuruPrompt.js";

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

const ELEMENT_PAIRS = new Set(["air-fire", "earth-water"]);

export function generateCompatibility(user, partner) {
  const userContext = buildAstrologyContext(user, buildTransitDateForUser(user, user.birthDate));
  const partnerContext = buildAstrologyContext(buildDateOnlyPartner(user, partner), buildTransitDateForUser(user, partner.birthDate));
  const userSun = userContext.birthChart.sun;
  const partnerSun = partnerContext.birthChart.sun;
  const userMoon = userContext.birthChart.moon;
  const partnerMoon = partnerContext.birthChart.moon;
  const sunDistance = signDistance(userSun.sign, partnerSun.sign);
  const moonDistance = signDistance(userMoon.sign, partnerMoon.sign);
  const elementScore = scoreElements(userContext.element, partnerContext.element);
  const moonScore = scoreMoonDistance(moonDistance);
  const sunScore = scoreSunDistance(sunDistance);
  const lifeScore = 16 - Math.min(10, Math.abs(userContext.lifePath - partnerContext.lifePath) * 2);
  const nameScore = stableHash(`${user.name}|${partner.name}|${partner.birthDate}`) % 7;
  const score = clamp(38 + elementScore + moonScore + sunScore + lifeScore + nameScore, 42, 96);

  return {
    score,
    title: `${userMoon.sign} Moon and ${partnerMoon.sign} Moon`,
    summary: `${firstName(user.name)} and ${firstName(partner.name)} have a ${score >= 78 ? "naturally supportive" : score >= 62 ? "promising but practice-based" : "growth-heavy"} bond. The strongest signal is the Moon rhythm: it shows how care, timing, and reassurance are exchanged when both people stop performing and start listening.`,
    details: [
      {
        label: "Moon rhythm:",
        text: `${userMoon.sign} and ${partnerMoon.sign} sit ${moonDistance} sign${moonDistance === 1 ? "" : "s"} apart, so emotional safety improves when responses are timed, not demanded.`
      },
      {
        label: "Sun expression:",
        text: `${userSun.sign} ${userContext.element} with ${partnerSun.sign} ${partnerContext.element} shows how attraction becomes visible through action, pride, pace, and daily respect.`
      },
      {
        label: "Growth edge:",
        text: `Life paths ${userContext.lifePath} and ${partnerContext.lifePath} can build loyalty when both partners name expectations before they become tests.`
      }
    ],
    astrologyContext: {
      user: {
        sun: userSun,
        moon: userMoon,
        lifePath: userContext.lifePath,
        element: userContext.element
      },
      partner: {
        sun: partnerSun,
        moon: partnerMoon,
        lifePath: partnerContext.lifePath,
        element: partnerContext.element
      },
      moonDistance,
      sunDistance
    }
  };
}

function buildDateOnlyPartner(user, partner) {
  return {
    id: `partner-${stableHash(`${partner.name}|${partner.birthDate}`)}`,
    name: partner.name,
    birthDate: partner.birthDate,
    birthTime: "12:00",
    birthPlace: user.birthPlace,
    birthLatitude: user.birthLatitude,
    birthLongitude: user.birthLongitude,
    birthTimezone: user.birthTimezone,
    birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
    birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
    birthPlaceResolutionSource: user.birthPlaceResolutionSource
  };
}

function scoreElements(first, second) {
  if (first === second) return 18;
  return ELEMENT_PAIRS.has([first, second].sort().join("-")) ? 14 : 8;
}

function scoreMoonDistance(distance) {
  const scores = {
    1: 22,
    2: 13,
    3: 17,
    4: 14,
    5: 21,
    6: 10,
    7: 20,
    8: 9,
    9: 21,
    10: 14,
    11: 17,
    12: 13
  };
  return scores[distance] || 12;
}

function scoreSunDistance(distance) {
  if ([1, 5, 7, 9].includes(distance)) return 10;
  if ([3, 4, 10, 11].includes(distance)) return 7;
  return 4;
}

function signDistance(fromSign, toSign) {
  const from = SIDEREAL_SIGNS.indexOf(fromSign);
  const to = SIDEREAL_SIGNS.indexOf(toSign);
  if (from < 0 || to < 0) return 1;
  return mod(to - from, 12) + 1;
}

function mod(value, size) {
  return ((value % size) + size) % size;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}
