import { getNumbers, reduceDigits, reduceName } from "../src/numerology.js";

const checks = [];

checkKnownNumerologyValues();
checkDeterministicProfile();
checkGracefulFallbackProfile();
checkNoteQuality();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkKnownNumerologyValues() {
  const user = {
    name: "Asha Rao",
    birthDate: "1994-08-17"
  };
  const profile = getNumbers(user);
  const byLabel = Object.fromEntries(profile.map((item) => [item.label, item]));

  pushCheck("Numbers tab returns required cards in order", [
    profile.map((item) => item.label).join("|") === "Birth number|Life path|Name number|Lucky number|Avoid",
    profile.length === 5
  ].every(Boolean));

  pushCheck("Numbers tab computes known numerology values", [
    byLabel["Birth number"]?.value === 8,
    byLabel["Life path"]?.value === 3,
    byLabel["Name number"]?.value === 9,
    byLabel["Lucky number"]?.value === 2,
    byLabel.Avoid?.value === 6,
    reduceDigits("1994-08-17") === 3,
    reduceName("Asha Rao") === 9
  ].every(Boolean));
}

function checkDeterministicProfile() {
  const user = {
    name: "Kabir Mehta",
    birthDate: "1988-02-03"
  };
  const first = getNumbers(user);
  const second = getNumbers(user);

  pushCheck("Numbers tab output is deterministic", JSON.stringify(first) === JSON.stringify(second));
}

function checkGracefulFallbackProfile() {
  const profile = getNumbers({
    name: "",
    birthDate: ""
  });

  pushCheck("Numbers tab handles partial profile data safely", [
    profile.length === 5,
    profile.every((item) => Number.isInteger(item.value)),
    profile.every((item) => item.value >= 1 && item.value <= 9),
    profile.every((item) => typeof item.note === "string" && item.note.length > 20)
  ].every(Boolean));
}

function checkNoteQuality() {
  const users = [
    { name: "Naina Kapoor", birthDate: "2001-11-28" },
    { name: "Rohan Iyer", birthDate: "1990-05-06" },
    { name: "Meera Shah", birthDate: "1985-12-19" }
  ];
  const profiles = users.flatMap((user) => getNumbers(user));

  pushCheck("Numbers tab notes are polished one-line explanations", profiles.every((item) => [
    item.note.endsWith("."),
    words(item.note).length >= 7,
    words(item.note).length <= 18,
    !/[{}[\]<>]/.test(item.note),
    !/\bundefined|null|NaN\b/i.test(item.note)
  ].every(Boolean)));
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Numbers contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
