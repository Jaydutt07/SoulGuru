import tzLookup from "tz-lookup";
import { enrichUserWithPlace, resolveBirthPlace } from "../placeResolver.js";

export async function enrichUserWithServerPlace(user = {}, env = process.env, deps = {}) {
  const profilePlace = resolveProfileCoordinates(user);
  if (profilePlace) {
    return mergeResolvedPlace(user, profilePlace);
  }

  const staticPlace = resolveBirthPlace(user.birthPlace, user);
  if (staticPlace.source !== "default") {
    return mergeResolvedPlace(user, staticPlace);
  }

  const geocodedPlace = await geocodeBirthPlace(user.birthPlace, env, deps);
  if (geocodedPlace) {
    return mergeResolvedPlace(user, geocodedPlace);
  }

  return enrichUserWithPlace(user);
}

export async function geocodeBirthPlace(input, env = process.env, deps = {}) {
  const query = String(input || "").trim();
  const geocoderUrl = String(env.PLACE_GEOCODER_URL || "").trim();
  if (!query || !geocoderUrl) return null;

  const fetchImpl = deps.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;

  try {
    const url = buildGeocoderUrl(geocoderUrl, query);
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": env.PLACE_GEOCODER_USER_AGENT || "SoulGuru/1.0 birth-place-resolution"
      }
    });
    if (!response?.ok) return null;

    const body = await response.json();
    const item = normalizeGeocoderResult(body);
    if (!item) return null;

    const timezone = lookupTimezone(item.latitude, item.longitude);
    if (!timezone) return null;

    return {
      label: item.label,
      latitude: item.latitude,
      longitude: item.longitude,
      timezone,
      timezoneOffsetMinutes: null,
      source: "geocoder"
    };
  } catch {
    return null;
  }
}

function resolveProfileCoordinates(user = {}) {
  const latitude = nullableNumber(user.birthLatitude);
  const longitude = nullableNumber(user.birthLongitude);
  if (latitude === null || longitude === null) return null;

  const timezone = user.birthTimezone || lookupTimezone(latitude, longitude);
  return {
    label: String(user.birthPlaceResolvedLabel || user.birthPlace || "Known birth place").trim(),
    latitude,
    longitude,
    timezone: timezone || user.birthTimezone || "UTC",
    timezoneOffsetMinutes: nullableNumber(user.birthTimezoneOffsetMinutes),
    source: user.birthPlaceResolutionSource || "profile"
  };
}

function mergeResolvedPlace(user, place) {
  const timezoneOffsetMinutes = place.timezoneOffsetMinutes ?? getBirthTimezoneOffsetMinutes(user, place.timezone);
  return {
    ...user,
    birthPlace: user.birthPlace || place.label,
    birthLatitude: place.latitude,
    birthLongitude: place.longitude,
    birthTimezone: place.timezone,
    birthTimezoneOffsetMinutes: timezoneOffsetMinutes,
    birthPlaceResolvedLabel: place.label,
    birthPlaceResolutionSource: place.source
  };
}

function buildGeocoderUrl(baseUrl, query) {
  const url = new URL(baseUrl);
  if (!url.searchParams.has("q")) {
    url.searchParams.set("q", query);
  }
  if (!url.searchParams.has("format")) {
    url.searchParams.set("format", "jsonv2");
  }
  if (!url.searchParams.has("limit")) {
    url.searchParams.set("limit", "1");
  }
  return url;
}

function normalizeGeocoderResult(body) {
  const first = Array.isArray(body)
    ? body[0]
    : body?.results?.[0] || body?.features?.[0] || body;
  if (!first || typeof first !== "object") return null;

  const coordinates = Array.isArray(first.geometry?.coordinates)
    ? first.geometry.coordinates
    : null;
  const latitude = nullableNumber(first.lat ?? first.latitude ?? first.geometry?.lat ?? coordinates?.[1]);
  const longitude = nullableNumber(first.lon ?? first.lng ?? first.longitude ?? first.geometry?.lng ?? coordinates?.[0]);
  if (latitude === null || longitude === null) return null;

  const label = String(
    first.display_name ||
    first.formatted ||
    first.label ||
    first.name ||
    first.properties?.display_name ||
    first.properties?.label ||
    "Resolved birth place"
  ).trim();

  return {
    label,
    latitude,
    longitude
  };
}

function lookupTimezone(latitude, longitude) {
  try {
    return tzLookup(latitude, longitude);
  } catch {
    return "";
  }
}

function getBirthTimezoneOffsetMinutes(user, timezone) {
  if (!timezone) return null;
  const date = user.birthDate || new Date().toISOString().slice(0, 10);
  const time = normalizeTime(user.birthTime || "12:00");
  const probe = new Date(`${date}T${time}:00Z`);
  return getTimeZoneOffsetMinutes(probe, timezone);
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

function normalizeTime(time) {
  const match = String(time || "12:00").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "12:00";
  const hour = Math.min(23, Math.max(0, Number(match[1]) || 0));
  const minute = Math.min(59, Math.max(0, Number(match[2]) || 0));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
