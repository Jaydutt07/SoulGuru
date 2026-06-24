import { createSupabaseAdmin } from "./supabaseAdmin.js";

export async function handleUserProfile(payload, env = process.env) {
  const action = payload.action || "upsert";
  if (action === "lookup") {
    return lookupUserProfile(payload, env);
  }
  return upsertUserProfile(payload, env);
}

export async function lookupUserProfile(payload, env = process.env) {
  const supabase = createSupabaseAdmin(env);
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
    .select("id, auth_user_id, phone, email, full_name, birth_date, birth_time, birth_place, birth_latitude, birth_longitude, created_at, updated_at")
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

export async function upsertUserProfile(payload, env = process.env) {
  const user = payload.user || {};
  const supabase = createSupabaseAdmin(env);

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

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile, { onConflict: conflictTarget })
    .select("id, auth_user_id, phone, email, full_name, birth_date, birth_time, birth_place, birth_latitude, birth_longitude, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to save user profile: ${error.message}`);
  }

  return {
    configured: true,
    profile: mapProfile(data)
  };
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
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
