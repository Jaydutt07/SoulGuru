import { upsertGuidanceMemory } from "./memoryService.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";

const DEFAULT_LIMIT = 10;

export async function getMoreGuidanceDashboard(payload, env = process.env) {
  const user = payload.user || {};
  const userKey = buildUserKey(user);
  const supabase = createSupabaseAdmin(env);

  if (!supabase) {
    return {
      configured: false,
      subscription: null,
      guidanceHistory: [],
      savedGuidance: []
    };
  }

  const [subscription, guidanceHistory, savedGuidance] = await Promise.all([
    readSubscription(supabase, userKey),
    readGuidanceHistory(supabase, userKey, payload.limit),
    readSavedGuidance(supabase, userKey, payload.limit)
  ]);

  return {
    configured: true,
    subscription,
    guidanceHistory,
    savedGuidance
  };
}

export async function saveGuidance(payload, env = process.env) {
  const user = payload.user || {};
  const reading = normalizeReading(payload.reading);
  const userKey = buildUserKey(user);
  const supabase = createSupabaseAdmin(env);

  if (!reading?.wisdom) {
    throw new Error("Guidance reading is required");
  }

  if (!supabase) {
    await upsertGuidanceMemory({
      user,
      kind: "saved-guidance",
      sourceId: payload.sourceId || `saved-${Date.now()}`,
      text: reading.wisdom,
      metadata: {
        source: "more-guidance",
        savedAt: new Date().toISOString()
      }
    }, env);

    return {
      configured: false,
      saved: false,
      item: {
        id: payload.sourceId || `saved-${Date.now()}`,
        date: new Date().toISOString(),
        note: payload.note || "",
        reading
      }
    };
  }

  const userProfileId = await upsertUserProfile(supabase, user);
  const { data, error } = await supabase
    .from("saved_guidance")
    .insert({
      user_key: userKey,
      daily_reading_id: payload.dailyReadingId || null,
      note: payload.note || null,
      reading
    })
    .select("id, note, reading, created_at")
    .single();

  if (error) {
    throw new Error(`Unable to save guidance: ${error.message}`);
  }

  if (userProfileId) {
    await linkSavedGuidanceToProfile(supabase, data.id, userProfileId);
  }

  await upsertGuidanceMemory({
    user,
    kind: "saved-guidance",
    sourceId: data.id,
    text: reading.wisdom,
    metadata: {
      source: "more-guidance",
      savedAt: data.created_at
    }
  }, env);

  return {
    configured: true,
    saved: true,
    item: mapSavedGuidance(data)
  };
}

async function readSubscription(supabase, userKey) {
  const { data, error } = await supabase
    .from("more_guidance_subscriptions")
    .select("id, plan_name, status, starts_at, ends_at, astro_bonus_questions, provider, provider_payment_id, provider_subscription_id, metadata, created_at")
    .eq("user_key", userKey)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Unable to read More Guidance subscription", error.message);
    return null;
  }

  if (!data) return null;
  return {
    id: data.id,
    active: data.status === "active" && new Date(data.ends_at).getTime() > Date.now(),
    name: data.plan_name,
    duration: "3 months",
    astroBonusQuestions: data.astro_bonus_questions,
    startedAt: data.starts_at,
    endsAt: data.ends_at,
    provider: data.provider,
    providerPaymentId: data.provider_payment_id,
    providerSubscriptionId: data.provider_subscription_id,
    metadata: data.metadata || {}
  };
}

async function readGuidanceHistory(supabase, userKey, limit = DEFAULT_LIMIT) {
  const { data, error } = await supabase
    .from("daily_soul_readings")
    .select("id, reading, reading_date, created_at")
    .eq("user_key", userKey)
    .order("reading_date", { ascending: false })
    .limit(Number(limit || DEFAULT_LIMIT));

  if (error) {
    console.warn("Unable to read guidance history", error.message);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    date: item.created_at || item.reading_date,
    dateKey: item.reading_date,
    reading: item.reading,
    wisdom: item.reading?.wisdom || ""
  }));
}

async function readSavedGuidance(supabase, userKey, limit = DEFAULT_LIMIT) {
  const { data, error } = await supabase
    .from("saved_guidance")
    .select("id, note, reading, created_at")
    .eq("user_key", userKey)
    .order("created_at", { ascending: false })
    .limit(Number(limit || DEFAULT_LIMIT));

  if (error) {
    console.warn("Unable to read saved guidance", error.message);
    return [];
  }

  return (data || []).map(mapSavedGuidance);
}

function mapSavedGuidance(item) {
  return {
    id: item.id,
    date: item.created_at,
    note: item.note || "",
    reading: item.reading,
    wisdom: item.reading?.wisdom || ""
  };
}

async function upsertUserProfile(supabase, user) {
  const profile = {
    auth_user_id: user.authUserId || null,
    phone: user.phone || null,
    email: user.email || null,
    full_name: user.name || "SoulGuru user",
    birth_date: user.birthDate,
    birth_time: user.birthTime || null,
    birth_place: user.birthPlace || null,
    birth_latitude: user.birthLatitude || null,
    birth_longitude: user.birthLongitude || null,
    updated_at: new Date().toISOString()
  };

  const conflictTarget = profile.auth_user_id ? "auth_user_id" : profile.phone ? "phone" : null;
  if (!conflictTarget || !profile.birth_date) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile, { onConflict: conflictTarget })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("Unable to upsert More Guidance user profile", error.message);
    return null;
  }

  return data?.id || null;
}

async function linkSavedGuidanceToProfile(supabase, savedGuidanceId, userProfileId) {
  const { error } = await supabase
    .from("saved_guidance")
    .update({ user_profile_id: userProfileId })
    .eq("id", savedGuidanceId);

  if (error) {
    console.warn("Unable to link saved guidance to profile", error.message);
  }
}

function normalizeReading(reading) {
  if (!reading || typeof reading !== "object") return null;
  return {
    wisdom: String(reading.wisdom || "").trim(),
    innerWeather: String(reading.innerWeather || "").trim(),
    todayMove: String(reading.todayMove || "").trim(),
    release: String(reading.release || "").trim()
  };
}

function buildUserKey(user) {
  const stableValue = user.authUserId || user.id || user.phone || user.email || `${user.name}-${user.birthDate}-${user.birthTime}`;
  return String(stableValue || "anonymous").toLowerCase().trim();
}
