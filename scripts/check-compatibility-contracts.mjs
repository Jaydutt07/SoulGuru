import { buildAstrologyContext, buildTransitDateForUser } from "../src/astrologyEngine.js";
import { generateCompatibility } from "../src/compatibility.js";

const checks = [];

checkSiderealCompatibilityUsesBirthCharts();
checkDateOnlyPartnerIsDeterministic();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkSiderealCompatibilityUsesBirthCharts() {
  const user = ashaUser();
  const partner = {
    name: "Kabir Mehta",
    birthDate: "1988-02-03"
  };
  const result = generateCompatibility(user, partner);
  const userContext = buildAstrologyContext(user, buildTransitDateForUser(user, user.birthDate));
  const partnerContext = buildAstrologyContext({
    id: "partner-contract",
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
  }, buildTransitDateForUser(user, partner.birthDate));

  pushCheck("Harmony compatibility uses sidereal Sun and Moon chart placements", [
    result.score >= 42,
    result.score <= 96,
    result.title.includes(userContext.birthChart.moon.sign),
    result.title.includes(partnerContext.birthChart.moon.sign),
    result.astrologyContext.user.sun.sign === userContext.birthChart.sun.sign,
    result.astrologyContext.user.moon.sign === userContext.birthChart.moon.sign,
    result.astrologyContext.partner.sun.sign === partnerContext.birthChart.sun.sign,
    result.astrologyContext.partner.moon.sign === partnerContext.birthChart.moon.sign,
    result.details.some((detail) => detail.label === "Moon rhythm:"),
    result.details.some((detail) => detail.label === "Sun expression:")
  ].every(Boolean));
}

function checkDateOnlyPartnerIsDeterministic() {
  const user = ashaUser();
  const partner = {
    name: "Naina Kapoor",
    birthDate: "2001-11-28"
  };
  const first = generateCompatibility(user, partner);
  const second = generateCompatibility(user, partner);

  pushCheck("Harmony date-only compatibility is deterministic", [
    first.score === second.score,
    first.title === second.title,
    first.summary === second.summary,
    JSON.stringify(first.astrologyContext) === JSON.stringify(second.astrologyContext)
  ].every(Boolean));
}

function ashaUser() {
  return {
    id: "asha-contract",
    name: "Asha Rao",
    birthDate: "1994-08-17",
    birthTime: "06:35",
    birthPlace: "Mumbai",
    phone: "+919000000001",
    email: "asha@example.com"
  };
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Harmony compatibility contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
