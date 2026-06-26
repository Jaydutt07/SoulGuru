import {
  buildAstrologyContext,
  buildTransitDateForUser,
  getLunarDayFromLongitudes,
  getLunarMansionFromLongitude,
  getSaadeSatiFromChart,
  getSaturnSignWindow
} from "../src/astrologyEngine.js";
import { enrichUserWithPlace, resolveBirthPlace } from "../src/placeResolver.js";

const checks = [];

checkPlaceResolutionContract();
checkTimezoneAwareTransitDates();
checkSiderealChartAndTransitContract();
checkDailyTransitSensitivity();
checkLunarMansionAndTithiHelpers();
checkSaadeSatiContract();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkPlaceResolutionContract() {
  const bombay = resolveBirthPlace("Bombay");
  const profile = resolveBirthPlace("Mumbai", {
    birthLatitude: 40.7128,
    birthLongitude: -74.006,
    birthTimezone: "America/New_York",
    birthTimezoneOffsetMinutes: -300,
    birthPlaceResolvedLabel: "New York custom",
    birthPlaceResolutionSource: "profile"
  });
  const toronto = enrichUserWithPlace({ birthPlace: "Toronto" });

  pushCheck("Place resolver handles catalog aliases and profile overrides", [
    bombay.label === "Mumbai, India",
    bombay.source === "catalog",
    approx(bombay.latitude, 19.076, 0.001),
    approx(bombay.longitude, 72.8777, 0.001),
    profile.label === "New York custom",
    profile.source === "profile",
    profile.timezone === "America/New_York",
    toronto.birthPlaceResolvedLabel === "Toronto, Canada",
    toronto.birthTimezone === "America/Toronto"
  ].every(Boolean));
}

function checkTimezoneAwareTransitDates() {
  const mumbaiDate = buildTransitDateForUser({
    birthPlace: "Mumbai"
  }, "2026-06-24");
  const londonDate = buildTransitDateForUser({
    birthPlace: "London"
  }, "2026-06-24");
  const profileDate = buildTransitDateForUser({
    birthPlace: "Unknown",
    birthLatitude: 40.7128,
    birthLongitude: -74.006,
    birthTimezone: "America/New_York",
    birthTimezoneOffsetMinutes: -300
  }, "2026-06-24");

  pushCheck("Transit date uses resolved local noon and timezone", [
    mumbaiDate.toISOString() === "2026-06-24T06:30:00.000Z",
    londonDate.toISOString() === "2026-06-24T11:00:00.000Z",
    profileDate.toISOString() === "2026-06-24T16:00:00.000Z"
  ].every(Boolean));
}

function checkSiderealChartAndTransitContract() {
  const user = ashaUser();
  const date = buildTransitDateForUser(user, "2026-06-24");
  const context = buildAstrologyContext(user, date);

  pushCheck("Astrology context contains sidereal birth chart placements", [
    context.birthLocation.label === "Mumbai, India",
    context.birthLocation.source === "catalog",
    context.sign === "Leo",
    context.element === "fire",
    context.moonSign === "Sagittarius",
    context.lifePath === 3,
    context.birthChart.sun.sign === "Leo",
    approx(context.birthChart.sun.degree, 0.14, 0.08),
    context.birthChart.moon.sign === "Sagittarius",
    approx(context.birthChart.moon.degree, 6.67, 0.08),
    context.birthMoonMansion.name === "Mula",
    context.birthMoonMansion.pada === 3,
    context.birthChart.moon.lunarMansion.name === "Mula",
    context.birthChart.moon.lunarMansion.pada === 3,
    context.birthChart.saturn.sign === "Aquarius",
    approx(context.birthChart.saturn.degree, 16.4, 0.08)
  ].every(Boolean));

  pushCheck("Astrology context contains real daily transit placements and lunar timing", [
    context.transits.sun.sign === "Gemini",
    approx(context.transits.sun.degree, 8.57, 0.12),
    context.transits.moon.sign === "Libra",
    approx(context.transits.moon.degree, 5.66, 0.12),
    context.dailyLunarMansion.name === "Chitra",
    context.dailyLunarMansion.pada === 4,
    context.transits.moon.lunarMansion.name === "Chitra",
    context.dailyLunarDay.name === "Dashami",
    context.dailyLunarDay.paksha === "Shukla",
    context.dailyLunarDay.phase === "waxing",
    approx(context.dailyLunarDay.angle, 117.09, 0.16),
    context.transits.saturn.sign === "Pisces",
    approx(context.transits.saturn.degree, 19.63, 0.12),
    context.transits.moonFromNatalMoon === 11,
    context.transits.saturnFromNatalMoon === 4,
    context.transits.sunFromNatalSun === 11,
    context.openingScene === "the old tab in your mind that keeps reopening"
  ].every(Boolean));
}

function checkDailyTransitSensitivity() {
  const user = ashaUser();
  const first = buildAstrologyContext(user, buildTransitDateForUser(user, "2026-06-24"));
  const repeat = buildAstrologyContext(user, buildTransitDateForUser(user, "2026-06-24"));
  const next = buildAstrologyContext(user, buildTransitDateForUser(user, "2026-06-25"));

  pushCheck("Astrology context is deterministic for the same user/date", [
    JSON.stringify(first.birthChart) === JSON.stringify(repeat.birthChart),
    JSON.stringify(first.transits) === JSON.stringify(repeat.transits),
    first.innerWeather === repeat.innerWeather,
    first.attentionAnchor === repeat.attentionAnchor,
    first.openingScene === repeat.openingScene
  ].every(Boolean));
  pushCheck("Astrology context changes with daily transits", [
    first.transits.moon.sign === next.transits.moon.sign,
    Math.abs(next.transits.moon.longitude - first.transits.moon.longitude) > 5,
    first.dailyLunarMansion.name !== next.dailyLunarMansion.name,
    first.dailyLunarDay.name !== next.dailyLunarDay.name,
    first.attentionAnchor !== next.attentionAnchor,
    first.openingScene !== next.openingScene
  ].every(Boolean));
}

function checkLunarMansionAndTithiHelpers() {
  const firstMansion = getLunarMansionFromLongitude(0);
  const secondMansion = getLunarMansionFromLongitude(13.34);
  const waxingFirst = getLunarDayFromLongitudes(100, 90);
  const darkMoon = getLunarDayFromLongitudes(179, 180);

  pushCheck("Lunar mansion helper returns nakshatra, pada, and progress", [
    firstMansion.name === "Ashwini",
    firstMansion.pada === 1,
    firstMansion.progress === 0,
    secondMansion.name === "Bharani",
    secondMansion.pada === 1
  ].every(Boolean));

  pushCheck("Lunar day helper returns tithi, paksha, phase, and angle", [
    waxingFirst.name === "Pratipada",
    waxingFirst.paksha === "Shukla",
    waxingFirst.phase === "waxing",
    approx(waxingFirst.angle, 10, 0.01),
    darkMoon.name === "Amavasya",
    darkMoon.paksha === "Krishna",
    darkMoon.phase === "waning",
    approx(darkMoon.angle, 359, 0.01)
  ].every(Boolean));
}

function checkSaadeSatiContract() {
  const user = {
    name: "Rohan Iyer",
    birthDate: "1979-05-09",
    birthTime: "04:20",
    birthPlace: "Chennai"
  };
  const date = new Date("2026-06-24T06:30:00.000Z");
  const saadeSati = getSaadeSatiFromChart(user, date);
  const saturnWindow = getSaturnSignWindow(date);

  pushCheck("Saade Sati uses Saturn/Moon sign distance and Saturn windows", [
    saadeSati.moonSign === "Virgo",
    saadeSati.saturnSign === "Pisces",
    saadeSati.active === false,
    saadeSati.phaseTitle === "Outside Saade Sati",
    saadeSati.saturnTransit.sign === "Pisces",
    saturnWindow.sign === "Pisces",
    saturnWindow.startDate instanceof Date,
    saturnWindow.endDate instanceof Date,
    saturnWindow.startDate.getUTCFullYear() === 2025,
    saturnWindow.endDate.getUTCFullYear() === 2027,
    saturnWindow.startDate.getTime() < date.getTime(),
    saturnWindow.endDate.getTime() > date.getTime(),
    saadeSati.nextStartDate instanceof Date,
    saadeSati.nextStartDate.getUTCFullYear() >= 2036
  ].every(Boolean));
}

function ashaUser() {
  return {
    name: "Asha Rao",
    birthDate: "1994-08-17",
    birthTime: "06:35",
    birthPlace: "Mumbai",
    phone: "+919000000001",
    email: "asha@example.com"
  };
}

function approx(actual, expected, tolerance) {
  return Math.abs(Number(actual) - expected) <= tolerance;
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Astrology engine contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
