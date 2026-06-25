import tzLookup from "tz-lookup";
import { enrichUserWithPlace, resolveBirthPlace } from "../placeResolver.js";
import { fetchWithTimeout } from "./fetchWithTimeout.js";

const MAX_GEOCODER_QUERY_LENGTH = 160;
const MIN_GEOCODER_LABEL_LENGTH = 3;
const MIN_GEOCODER_USER_AGENT_LENGTH = 8;

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
  const query = normalizeGeocoderQuery(input);
  const geocoderUrl = getConfiguredGeocoderUrl(env);
  const userAgent = getConfiguredGeocoderUserAgent(env);
  if (!query || !geocoderUrl || !userAgent) return null;

  const fetchImpl = deps.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;

  try {
    const url = buildGeocoderUrl(geocoderUrl, query);
    const response = await fetchWithTimeout(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent
      }
    }, {
      env,
      fetchImpl,
      label: "Birth place geocoder"
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
  if (!isValidCoordinatePair(latitude, longitude)) return null;

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
  const candidates = Array.isArray(body)
    ? body
    : Array.isArray(body?.results)
      ? body.results
      : Array.isArray(body?.features)
        ? body.features
        : body
          ? [body]
          : [];

  for (const item of candidates) {
    const normalized = normalizeGeocoderItem(item);
    if (normalized) return normalized;
  }

  return null;
}

function normalizeGeocoderItem(first) {
  const item = first;
  if (!item || typeof item !== "object") return null;

  const coordinates = Array.isArray(item.geometry?.coordinates)
    ? item.geometry.coordinates
    : null;
  const latitude = nullableNumber(item.lat ?? item.latitude ?? item.geometry?.lat ?? item.properties?.lat ?? coordinates?.[1]);
  const longitude = nullableNumber(item.lon ?? item.lng ?? item.longitude ?? item.geometry?.lng ?? item.properties?.lon ?? item.properties?.lng ?? coordinates?.[0]);
  if (!isValidCoordinatePair(latitude, longitude)) return null;

  const label = sanitizeGeocoderLabel(
    item.display_name ||
    item.formatted ||
    item.label ||
    item.name ||
    item.properties?.display_name ||
    item.properties?.formatted ||
    item.properties?.label ||
    item.properties?.name
  );
  if (!label) return null;

  return {
    label,
    latitude,
    longitude
  };
}

function getConfiguredGeocoderUrl(env) {
  const value = String(env.PLACE_GEOCODER_URL || "").trim();
  if (isPlaceholderValue(value)) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) return "";
    if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function getConfiguredGeocoderUserAgent(env) {
  const value = String(env.PLACE_GEOCODER_USER_AGENT || "").trim();
  if (isPlaceholderValue(value) || value.length < MIN_GEOCODER_USER_AGENT_LENGTH) return "";
  return value;
}

function normalizeGeocoderQuery(input) {
  return String(input || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_GEOCODER_QUERY_LENGTH);
}

function sanitizeGeocoderLabel(value) {
  const label = String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (isPlaceholderValue(label) || label.length < MIN_GEOCODER_LABEL_LENGTH) return "";
  return label;
}

function isValidCoordinatePair(latitude, longitude) {
  return latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
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
