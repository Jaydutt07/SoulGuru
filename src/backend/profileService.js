import { createSupabaseAdmin } from "./supabaseAdmin.js";
import { enrichUserWithServerPlace } from "./placeResolutionService.js";

const PROFILE_SELECT = "id, auth_user_id, phone, email, full_name, birth_date, birth_time, birth_place, birth_latitude, birth_longitude, birth_timezone, birth_timezone_offset_minutes, birth_place_resolved_label, birth_place_resolution_source, created_at, updated_at";

export async function handleUserProfile(payload, env = process.env, deps = {}) {
  const action = payload.action || "upsert";
  if (action === "lookup") {
    return lookupUserProfile(payload, env, deps);
  }
  return upsertUserProfile(payload, env, deps);
}

export async function lookupUserProfile(payload, env = process.env, deps = {}) {
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);
  if (!supabase) {
    return {
      configured: false,
      profile: null
    };
  }

  const phone = normalizePhone(payload.phone || payload.user?.phone);
  const email = normalizeEmail(payload.email || payload.user?.email);
  const authUserId = payload.user?.authUserId || payload.authUserId || "";

  if (!phone && !email && !authUserId) {
    throw new Error("Phone, email, or authenticated user is required");
  }

  const query = supabase
    .from("user_profiles")
    .select(PROFILE_SELECT)
    .limit(1);

  const { data, error } = await applyProfileLookupFilter(query, { phone, email, authUserId }).maybeSingle();

  if (error) {
    throw new Error(`Unable to load user profile: ${error.message}`);
  }

  return {
    configured: true,
    profile: data ? mapProfile(data) : null
  };
}

export async function upsertUserProfile(payload, env = process.env, deps = {}) {
  const user = await enrichUserWithServerPlace(payload.user || {}, env, deps);
  const supabase = hasOwn(deps, "supabase") ? deps.supabase : createSupabaseAdmin(env);

  if (!supabase) {
    return {
      configured: false,
      profile: normalizeLocalProfile(user)
    };
  }

  const profile = normalizeProfileForDatabase(user);
  const conflictTarget = profile.auth_user_id ? "auth_user_id" : profile.phone ? "phone" : null;

  if (!conflictTarget) {
    throw new Error("Phone or authenticated user is required");
  }
  if (!profile.birth_date) {
    throw new Error("Birth date is required");
  }

  if (profile.auth_user_id && profile.phone) {
    const mergedProfile = await mergeExistingPhoneProfile(supabase, profile);
    if (mergedProfile) {
      return {
        configured: true,
        profile: mapProfile(mergedProfile)
      };
    }
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile, { onConflict: conflictTarget })
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505" && profile.auth_user_id && profile.phone) {
      const mergedProfile = await mergeExistingPhoneProfile(supabase, profile, { requireExisting: true });
      if (mergedProfile) {
        return {
          configured: true,
          profile: mapProfile(mergedProfile)
        };
      }
    }

    throw new Error(`Unable to save user profile: ${error.message}`);
  }

  return {
    configured: true,
    profile: mapProfile(data)
  };
}

export async function upsertUserProfileId(supabase, user, { warnLabel = "Unable to upsert user profile" } = {}) {
  if (!supabase) return null;

  try {
    const result = await upsertUserProfile({ user }, {}, { supabase });
    return result.profile?.id || result.profile?.profileId || null;
  } catch (error) {
    console.warn(warnLabel, error.message);
    return null;
  }
}

async function mergeExistingPhoneProfile(supabase, profile, { requireExisting = false } = {}) {
  const { data: existing, error: readError } = await supabase
    .from("user_profiles")
    .select(PROFILE_SELECT)
    .eq("phone", profile.phone)
    .maybeSingle();

  if (readError) {
    throw new Error(`Unable to load existing phone profile: ${readError.message}`);
  }
  if (!existing) {
    if (requireExisting) {
      throw new Error("Profile conflict could not be resolved");
    }
    return null;
  }

  if (existing.auth_user_id && existing.auth_user_id !== profile.auth_user_id) {
    throwHttpError("This phone number is already linked to another account", 409);
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .update(profile)
    .eq("id", existing.id)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throwHttpError("This phone number is already linked to another account", 409);
    }
    throw new Error(`Unable to merge user profile: ${error.message}`);
  }

  return data;
}

function applyProfileLookupFilter(query, { phone, email, authUserId }) {
  if (authUserId) {
    return query.eq("auth_user_id", authUserId);
  }
  if (phone) {
    return query.eq("phone", phone);
  }
  return query.eq("email", email);
}

function normalizeProfileForDatabase(user) {
  return {
    auth_user_id: user.authUserId || null,
    phone: normalizePhone(user.phone) || null,
    email: normalizeEmail(user.email) || null,
    full_name: String(user.name || "SoulGuru user").trim(),
    birth_date: user.birthDate || null,
    birth_time: user.birthTime || null,
    birth_place: String(user.birthPlace || "").trim() || null,
    birth_latitude: nullableNumber(user.birthLatitude),
    birth_longitude: nullableNumber(user.birthLongitude),
    birth_timezone: String(user.birthTimezone || "").trim() || null,
    birth_timezone_offset_minutes: nullableNumber(user.birthTimezoneOffsetMinutes),
    birth_place_resolved_label: String(user.birthPlaceResolvedLabel || "").trim() || null,
    birth_place_resolution_source: String(user.birthPlaceResolutionSource || "").trim() || null,
    updated_at: new Date().toISOString()
  };
}

function normalizeLocalProfile(user) {
  return {
    id: user.profileId || null,
    authUserId: user.authUserId || null,
    phone: normalizePhone(user.phone),
    email: normalizeEmail(user.email),
    name: String(user.name || "").trim(),
    birthDate: user.birthDate || "",
    birthTime: normalizeTime(user.birthTime),
    birthPlace: String(user.birthPlace || "").trim(),
    birthLatitude: nullableNumber(user.birthLatitude),
    birthLongitude: nullableNumber(user.birthLongitude),
    birthTimezone: String(user.birthTimezone || "").trim(),
    birthTimezoneOffsetMinutes: nullableNumber(user.birthTimezoneOffsetMinutes),
    birthPlaceResolvedLabel: String(user.birthPlaceResolvedLabel || "").trim(),
    birthPlaceResolutionSource: String(user.birthPlaceResolutionSource || "").trim(),
    updatedAt: new Date().toISOString()
  };
}

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    profileId: row.id,
    authUserId: row.auth_user_id || null,
    phone: row.phone || "",
    email: row.email || "",
    name: row.full_name || "SoulGuru user",
    birthDate: row.birth_date || "",
    birthTime: normalizeTime(row.birth_time),
    birthPlace: row.birth_place || "",
    birthLatitude: nullableNumber(row.birth_latitude),
    birthLongitude: nullableNumber(row.birth_longitude),
    birthTimezone: row.birth_timezone || "",
    birthTimezoneOffsetMinutes: nullableNumber(row.birth_timezone_offset_minutes),
    birthPlaceResolvedLabel: row.birth_place_resolved_label || "",
    birthPlaceResolutionSource: row.birth_place_resolution_source || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeTime(time) {
  return String(time || "").slice(0, 5);
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function throwHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
