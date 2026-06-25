import { loadEnv } from "vite";
import { geocodeBirthPlace } from "../src/backend/placeResolutionService.js";

const args = new Set(process.argv.slice(2));
const allowMissingEnv = args.has("--allow-missing-env");
const outputJson = args.has("--json");
const mode = getArgValue("--mode") || process.env.NODE_ENV || "production";
const place = String(getArgValue("--place") || "Paris, France").trim();
const expectedTimezone = String(getArgValue("--expect-timezone") || (place === "Paris, France" ? "Europe/Paris" : "")).trim();
const env = {
  ...loadEnv(mode, process.cwd(), ""),
  ...process.env
};

const missingEnv = getMissingGeocoderEnv(env);
if (missingEnv.length > 0) {
  if (allowMissingEnv) {
    printSkip(`missing ${missingEnv.join(", ")}`);
    process.exit(0);
  }
  fail(`Missing birth place geocoder configuration: ${missingEnv.join(", ")}.`);
}

if (!place) {
  fail("Provide a birth place with --place=\"City, Country\".");
}

const report = {
  ok: true,
  place,
  checkedAt: new Date().toISOString(),
  result: null,
  checks: []
};

const deps = buildFixtureDeps();
const result = await geocodeBirthPlace(place, env, deps);
report.result = result ? {
  label: result.label,
  latitude: result.latitude,
  longitude: result.longitude,
  timezone: result.timezone,
  source: result.source
} : null;

pushCheck({
  id: "config",
  label: "Birth place geocoder configuration",
  passed: true,
  detail: "Required geocoder env names are present and production-shaped."
});
pushCheck({
  id: "resolution",
  label: "Birth place geocoder resolves requested place",
  passed: Boolean(result),
  detail: result
    ? `Resolved ${result.label} at ${formatCoordinate(result.latitude)}, ${formatCoordinate(result.longitude)}.`
    : "The geocoder did not return a valid place; check provider reachability, quota, response shape, and user-agent setup."
});
pushCheck({
  id: "coordinates",
  label: "Resolved coordinates are usable",
  passed: isValidCoordinatePair(result?.latitude, result?.longitude),
  detail: result
    ? "Latitude and longitude are inside valid Earth coordinate ranges."
    : "No usable coordinates were returned."
});
pushCheck({
  id: "timezone",
  label: "Resolved timezone is usable for chart dates",
  passed: Boolean(result?.timezone),
  detail: result?.timezone
    ? `Timezone ${result.timezone} was derived from resolved coordinates.`
    : "No IANA timezone could be derived from the resolved coordinates."
});
pushCheck({
  id: "source",
  label: "Resolution source is server geocoder",
  passed: result?.source === "geocoder",
  detail: result?.source === "geocoder"
    ? "Profile enrichment can persist this as a server geocoder result."
    : "Expected the place resolution source to be geocoder."
});

if (expectedTimezone) {
  pushCheck({
    id: "expected-timezone",
    label: "Resolved timezone matches expected smoke target",
    passed: result?.timezone === expectedTimezone,
    detail: result?.timezone === expectedTimezone
      ? `Timezone matched ${expectedTimezone}.`
      : `Expected ${expectedTimezone}, received ${result?.timezone || "none"}.`
  });
}

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (!report.ok) {
  process.exit(1);
}

function buildFixtureDeps() {
  const fixtureName = getArgValue("--fixture");
  const fixtureJson = getArgValue("--fixture-json");
  if (!fixtureName && !fixtureJson) return {};

  let body;
  if (fixtureJson) {
    try {
      body = JSON.parse(fixtureJson);
    } catch {
      fail("--fixture-json must be valid JSON.");
    }
  } else {
    body = getNamedFixture(fixtureName);
  }

  return {
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() {
        return body;
      }
    })
  };
}

function getNamedFixture(name) {
  if (name === "paris") {
    return [{
      display_name: "Paris, Ile-de-France, France",
      lat: "48.8566",
      lon: "2.3522"
    }];
  }

  if (name === "invalid-coordinates") {
    return [{
      display_name: "Impossible place",
      lat: "999",
      lon: "999"
    }];
  }

  fail(`Unknown fixture "${name}".`);
}

function getMissingGeocoderEnv(source) {
  const missing = [];
  const url = String(source.PLACE_GEOCODER_URL || "").trim();
  const userAgent = String(source.PLACE_GEOCODER_USER_AGENT || "").trim();

  if (!hasValue(url)) {
    missing.push("PLACE_GEOCODER_URL");
  } else if (!isSafeHttpsUrl(url)) {
    missing.push("PLACE_GEOCODER_URL=https provider URL");
  }

  if (!hasValue(userAgent)) {
    missing.push("PLACE_GEOCODER_USER_AGENT");
  } else if (userAgent.length < 8) {
    missing.push("PLACE_GEOCODER_USER_AGENT>=8 characters");
  }

  return missing;
}

function hasValue(value) {
  return Boolean(value && !isPlaceholderValue(value));
}

function isSafeHttpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) return false;
    if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) return false;
    return true;
  } catch {
    return false;
  }
}

function isPlaceholderValue(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!normalized) return true;
  if (normalized.startsWith("${{") || normalized.startsWith("$")) return true;
  if (/^(true|false|null|undefined)$/i.test(normalized)) return true;
  if (/^(your|replace|change|changeme|placeholder|example|dummy|fake|todo|xxx|xxxx|redacted)(?:[-_\s].*)?$/i.test(normalized)) {
    return true;
  }
  if (/^<[^>]+>$/.test(normalized)) return true;
  if (/^\*+$/.test(normalized)) return true;

  return false;
}

function isValidCoordinatePair(latitude, longitude) {
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
}

function formatCoordinate(value) {
  return Number(value).toFixed(4);
}

function pushCheck(check) {
  report.checks.push(check);
  if (!check.passed) {
    report.ok = false;
  }
}

function printReport(result) {
  console.log(`SoulGuru place geocoder smoke: ${result.ok ? "pass" : "fail"}`);
  console.log(`Place: ${result.place}`);
  if (result.result) {
    console.log(`Resolved: ${result.result.label}; timezone=${result.result.timezone}; source=${result.result.source}`);
  }
  for (const check of result.checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    console.log(`  ${check.detail}`);
  }
}

function printSkip(reason) {
  if (outputJson) {
    console.log(JSON.stringify({
      ok: true,
      skipped: true,
      reason
    }, null, 2));
  } else {
    console.log(`SoulGuru place geocoder smoke: skipped (${reason}).`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getArgValue(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1).trim() : "";
}
