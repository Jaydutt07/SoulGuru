import { handleUserProfile, lookupUserProfile, upsertUserProfile, upsertUserProfileId } from "../src/backend/profileService.js";
import { suggestBirthPlaces } from "../src/backend/placeResolutionService.js";

const checks = [];

await checkLocalFallbackContract();
await checkLookupContract();
await checkPhoneProfileCreationContract();
await checkGeocodedBirthPlaceProfileContract();
await checkBirthPlaceSuggestionsContract();
await checkGeocoderValidationContract();
await checkStrictPlaceResolutionContract();
await checkAuthenticatedPhoneMergeContract();
await checkSharedProfileIdMergeContract();
await checkPhoneMergeRaceContract();
await checkPhoneIdentityConflictContract();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkLocalFallbackContract() {
  const result = await handleUserProfile({
    action: "upsert",
    user: profileUser({
      phone: "+91 99990 01234",
      email: "ASHA@SOULGURU.LOCAL"
    })
  }, {}, { supabase: null });

  pushCheck("Profile service returns normalized local fallback only when unconfigured", [
    result.configured === false,
    result.profile?.phone === "+919999001234",
    result.profile?.email === "asha@soulguru.local",
    result.profile?.birthTime === "06:45"
  ].every(Boolean));
}

async function checkLookupContract() {
  const supabase = createFakeProfileSupabase({
    profiles: [
      profileRow({
        id: "phone-profile",
        phone: "+919999001234",
        auth_user_id: null,
        full_name: "Phone Profile"
      }),
      profileRow({
        id: "auth-profile",
        phone: "+919999009999",
        auth_user_id: "clerk_contract_123",
        full_name: "Auth Profile"
      })
    ]
  });

  const byAuth = await lookupUserProfile({
    authUserId: "clerk_contract_123",
    phone: "+919999001234"
  }, {}, { supabase });

  await expectRejects(
    "Profile lookup requires an identifier",
    () => lookupUserProfile({}, {}, { supabase }),
    /required/i
  );

  pushCheck("Profile lookup prefers authenticated identity over phone", [
    byAuth.configured === true,
    byAuth.profile?.id === "auth-profile",
    byAuth.profile?.name === "Auth Profile"
  ].every(Boolean));
}

async function checkPhoneProfileCreationContract() {
  const supabase = createFakeProfileSupabase();
  const result = await upsertUserProfile({
    user: profileUser({
      authUserId: "",
      phone: "+91 99990 01234",
      email: "new@soulguru.local"
    })
  }, {}, { supabase });

  const rows = Array.from(supabase.state.profiles.values());
  pushCheck("Phone-only profile writes one persisted birth profile", [
    result.configured === true,
    result.profile?.phone === "+919999001234",
    result.profile?.authUserId === null,
    result.profile?.birthPlace === "Mumbai, India",
    rows.length === 1,
    rows[0].phone === "+919999001234",
    rows[0].birth_timezone === "Asia/Kolkata"
  ].every(Boolean));
}

async function checkGeocodedBirthPlaceProfileContract() {
  const supabase = createFakeProfileSupabase();
  const geocoderRequests = [];
  const result = await upsertUserProfile({
    user: profileUser({
      authUserId: "",
      phone: "+91 99990 04567",
      email: "paris@soulguru.local",
      birthPlace: "Paris, France",
      birthLatitude: null,
      birthLongitude: null,
      birthTimezone: "",
      birthTimezoneOffsetMinutes: null,
      birthPlaceResolvedLabel: "",
      birthPlaceResolutionSource: ""
    })
  }, {
    PLACE_GEOCODER_URL: "https://geocoder.example/search",
    PLACE_GEOCODER_USER_AGENT: "SoulGuru Contract Test"
  }, {
    supabase,
    fetch: async (url, options) => {
      geocoderRequests.push({ url, options });
      return {
        ok: true,
        async json() {
          return [{
            display_name: "Paris, Ile-de-France, France",
            lat: "48.8566",
            lon: "2.3522"
          }];
        }
      };
    }
  });

  const row = Array.from(supabase.state.profiles.values())[0];
  const requestUrl = new URL(geocoderRequests[0]?.url || "https://missing.example");

  pushCheck("Profile upsert resolves uncatalogued birth place through backend geocoder", [
    result.configured === true,
    geocoderRequests.length === 1,
    requestUrl.origin === "https://geocoder.example",
    requestUrl.searchParams.get("q") === "Paris, France",
    requestUrl.searchParams.get("format") === "jsonv2",
    requestUrl.searchParams.get("limit") === "1",
    geocoderRequests[0].options.headers["User-Agent"] === "SoulGuru Contract Test",
    result.profile?.birthPlace === "Paris, France",
    approx(result.profile?.birthLatitude, 48.8566, 0.001),
    approx(result.profile?.birthLongitude, 2.3522, 0.001),
    result.profile?.birthTimezone === "Europe/Paris",
    result.profile?.birthTimezoneOffsetMinutes === 120,
    result.profile?.birthPlaceResolvedLabel === "Paris, Ile-de-France, France",
    result.profile?.birthPlaceResolutionSource === "geocoder",
    row.birth_timezone === "Europe/Paris",
    row.birth_place_resolution_source === "geocoder"
  ].every(Boolean));
}

async function checkBirthPlaceSuggestionsContract() {
  const geocoderRequests = [];
  const suggestions = await suggestBirthPlaces("Pari", {
    PLACE_GEOCODER_URL: "https://geocoder.example/search",
    PLACE_GEOCODER_USER_AGENT: "SoulGuru Contract Test"
  }, {
    fetch: async (url, options) => {
      geocoderRequests.push({ url, options });
      return {
        ok: true,
        async json() {
          return [
            {
              display_name: "Impossible place",
              lat: "999",
              lon: "999"
            },
            {
              display_name: "Paris, Ile-de-France, France",
              lat: "48.8566",
              lon: "2.3522"
            }
          ];
        }
      };
    }
  });
  const requestUrl = new URL(geocoderRequests[0]?.url || "https://missing.example");
  const geoapifyRequests = [];
  const geoapifySuggestions = await suggestBirthPlaces("Pari", {
    PLACE_GEOCODER_URL: "https://api.geoapify.com/v1/geocode/autocomplete?apiKey=geoapify-contract-key",
    PLACE_GEOCODER_USER_AGENT: "SoulGuru Contract Test"
  }, {
    fetch: async (url, options) => {
      geoapifyRequests.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            results: [
              {
                formatted: "Paris, Ile-de-France, France",
                lat: 48.8566,
                lon: 2.3522
              }
            ]
          };
        }
      };
    }
  });
  const geoapifyUrl = new URL(geoapifyRequests[0]?.url || "https://missing.example");
  const catalogSuggestions = await suggestBirthPlaces("mum", {}, { fetch: async () => ({ ok: false }) });

  pushCheck("Birth place suggestions use the configured geocoder provider", [
    geocoderRequests.length === 1,
    requestUrl.origin === "https://geocoder.example",
    requestUrl.searchParams.get("q") === "Pari",
    requestUrl.searchParams.get("format") === "jsonv2",
    requestUrl.searchParams.get("limit") === "6",
    geocoderRequests[0].options.headers["User-Agent"] === "SoulGuru Contract Test",
    suggestions.length === 1,
    suggestions[0].label === "Paris, Ile-de-France, France",
    suggestions[0].source === "geocoder",
    suggestions[0].timezone === "Europe/Paris"
  ].every(Boolean));
  pushCheck("Birth place suggestions support Geoapify autocomplete URLs", [
    geoapifyRequests.length === 1,
    geoapifyUrl.origin === "https://api.geoapify.com",
    geoapifyUrl.pathname === "/v1/geocode/autocomplete",
    geoapifyUrl.searchParams.get("apiKey") === "geoapify-contract-key",
    geoapifyUrl.searchParams.get("text") === "Pari",
    geoapifyUrl.searchParams.get("format") === "json",
    geoapifyUrl.searchParams.get("limit") === "6",
    geoapifyRequests[0].options.headers["User-Agent"] === "SoulGuru Contract Test",
    geoapifySuggestions.length === 1,
    geoapifySuggestions[0].label === "Paris, Ile-de-France, France",
    geoapifySuggestions[0].source === "geocoder",
    geoapifySuggestions[0].timezone === "Europe/Paris"
  ].every(Boolean));
  pushCheck("Birth place suggestions fall back to the local catalog when provider config is absent", [
    catalogSuggestions.length >= 1,
    catalogSuggestions[0].label === "Mumbai, India",
    catalogSuggestions[0].source === "catalog",
    catalogSuggestions[0].timezone === "Asia/Kolkata"
  ].every(Boolean));
}

async function checkGeocoderValidationContract() {
  const supabase = createFakeProfileSupabase();
  const geocoderRequests = [];
  const result = await upsertUserProfile({
    user: profileUser({
      authUserId: "",
      phone: "+91 99990 07890",
      email: "validated-place@soulguru.local",
      birthPlace: "Paris, France",
      birthLatitude: null,
      birthLongitude: null,
      birthTimezone: "",
      birthTimezoneOffsetMinutes: null,
      birthPlaceResolvedLabel: "",
      birthPlaceResolutionSource: ""
    })
  }, {
    PLACE_GEOCODER_URL: "https://geocoder.example/search",
    PLACE_GEOCODER_USER_AGENT: "SoulGuru Contract Test"
  }, {
    supabase,
    fetch: async (url, options) => {
      geocoderRequests.push({ url, options });
      return {
        ok: true,
        async json() {
          return [
            {
              display_name: "Impossible place",
              lat: "999",
              lon: "999"
            },
            {
              display_name: "Paris, Ile-de-France, France",
              lat: "48.8566",
              lon: "2.3522"
            }
          ];
        }
      };
    }
  });

  const insecureSupabase = createFakeProfileSupabase();
  const insecureRequests = [];
  const insecureResult = await upsertUserProfile({
    user: profileUser({
      authUserId: "",
      phone: "+91 99990 07891",
      email: "insecure-place@soulguru.local",
      birthPlace: "Paris, France",
      birthLatitude: null,
      birthLongitude: null,
      birthTimezone: "",
      birthTimezoneOffsetMinutes: null,
      birthPlaceResolvedLabel: "",
      birthPlaceResolutionSource: ""
    })
  }, {
    PLACE_GEOCODER_URL: "http://geocoder.example/search",
    PLACE_GEOCODER_USER_AGENT: "SoulGuru Contract Test"
  }, {
    supabase: insecureSupabase,
    fetch: async (url, options) => {
      insecureRequests.push({ url, options });
      return {
        ok: true,
        async json() {
          return [{
            display_name: "Paris, Ile-de-France, France",
            lat: "48.8566",
            lon: "2.3522"
          }];
        }
      };
    }
  });

  pushCheck("Profile geocoder skips impossible coordinates and stores the first valid place", [
    geocoderRequests.length === 1,
    result.profile?.birthPlaceResolutionSource === "geocoder",
    result.profile?.birthPlaceResolvedLabel === "Paris, Ile-de-France, France",
    approx(result.profile?.birthLatitude, 48.8566, 0.001),
    approx(result.profile?.birthLongitude, 2.3522, 0.001),
    result.profile?.birthTimezone === "Europe/Paris"
  ].every(Boolean));
  pushCheck("Profile geocoder ignores insecure geocoder config", [
    insecureRequests.length === 0,
    insecureResult.profile?.birthPlaceResolutionSource === "default",
    insecureResult.profile?.birthPlace === "Paris, France",
    insecureResult.profile?.birthTimezone === "Asia/Kolkata"
  ].every(Boolean));
}

async function checkStrictPlaceResolutionContract() {
  const strictSupabase = createFakeProfileSupabase();
  const strictRequests = [];
  await expectRejects(
    "Strict profile place resolution rejects unresolved uncatalogued places",
    () => upsertUserProfile({
      user: profileUser({
        authUserId: "",
        phone: "+91 99990 08801",
        email: "unknown-place@soulguru.local",
        birthPlace: "Atlantis, Ocean",
        birthLatitude: null,
        birthLongitude: null,
        birthTimezone: "",
        birthTimezoneOffsetMinutes: null,
        birthPlaceResolvedLabel: "",
        birthPlaceResolutionSource: ""
      })
    }, {
      PLACE_GEOCODER_URL: "https://geocoder.example/search",
      PLACE_GEOCODER_USER_AGENT: "SoulGuru Contract Test",
      PLACE_GEOCODER_REQUIRE_RESOLUTION: "true"
    }, {
      supabase: strictSupabase,
      fetch: async (url, options) => {
        strictRequests.push({ url, options });
        return {
          ok: true,
          async json() {
            return [];
          }
        };
      }
    }),
    /Birth place could not be resolved accurately/i,
    422
  );

  const catalogSupabase = createFakeProfileSupabase();
  const catalogRequests = [];
  const catalogResult = await upsertUserProfile({
    user: profileUser({
      authUserId: "",
      phone: "+91 99990 08802",
      email: "catalog-place@soulguru.local",
      birthPlace: "Mumbai, India",
      birthLatitude: null,
      birthLongitude: null,
      birthTimezone: "",
      birthTimezoneOffsetMinutes: null,
      birthPlaceResolvedLabel: "",
      birthPlaceResolutionSource: ""
    })
  }, {
    PLACE_GEOCODER_REQUIRE_RESOLUTION: "true"
  }, {
    supabase: catalogSupabase,
    fetch: async (url, options) => {
      catalogRequests.push({ url, options });
      return {
        ok: true,
        async json() {
          return [];
        }
      };
    }
  });

  const catalogRow = Array.from(catalogSupabase.state.profiles.values())[0];
  pushCheck("Strict profile place resolution does not persist default coordinates", [
    strictRequests.length === 1,
    strictSupabase.state.profiles.size === 0,
    strictSupabase.state.calls.filter((call) => call.operation === "upsert").length === 0
  ].every(Boolean));
  pushCheck("Strict profile place resolution still accepts catalog places", [
    catalogRequests.length === 0,
    catalogResult.profile?.birthPlaceResolutionSource === "catalog",
    catalogResult.profile?.birthTimezone === "Asia/Kolkata",
    approx(catalogResult.profile?.birthLatitude, 19.076, 0.001),
    approx(catalogResult.profile?.birthLongitude, 72.8777, 0.001),
    catalogRow?.birth_place_resolution_source === "catalog"
  ].every(Boolean));
}

async function checkAuthenticatedPhoneMergeContract() {
  const supabase = createFakeProfileSupabase({
    profiles: [
      profileRow({
        id: "otp-profile",
        auth_user_id: null,
        phone: "+919999001234",
        email: "old@soulguru.local",
        full_name: "OTP User"
      })
    ]
  });

  const result = await upsertUserProfile({
    user: profileUser({
      authUserId: "clerk_contract_123",
      phone: "+91 99990 01234",
      email: "asha@soulguru.local",
      name: "Asha Rao"
    })
  }, {}, { supabase });

  const rows = Array.from(supabase.state.profiles.values());
  const updateCalls = supabase.state.calls.filter((call) => call.operation === "update");

  pushCheck("Authenticated profile sync links existing OTP phone profile", [
    result.configured === true,
    result.profile?.id === "otp-profile",
    result.profile?.authUserId === "clerk_contract_123",
    result.profile?.email === "asha@soulguru.local",
    result.profile?.name === "Asha Rao",
    rows.length === 1,
    rows[0].auth_user_id === "clerk_contract_123",
    rows[0].phone === "+919999001234",
    updateCalls.length === 1
  ].every(Boolean));
}

async function checkSharedProfileIdMergeContract() {
  const supabase = createFakeProfileSupabase({
    profiles: [
      profileRow({
        id: "shared-otp-profile",
        auth_user_id: null,
        phone: "+919999001234"
      })
    ]
  });

  const profileId = await upsertUserProfileId(supabase, profileUser({
    authUserId: "clerk_shared_123",
    phone: "+91 99990 01234"
  }));
  const row = supabase.state.profiles.get("shared-otp-profile");

  pushCheck("Shared profile id helper links existing OTP phone profile", [
    profileId === "shared-otp-profile",
    row?.auth_user_id === "clerk_shared_123",
    row?.phone === "+919999001234"
  ].every(Boolean));
}

async function checkPhoneMergeRaceContract() {
  const supabase = createFakeProfileSupabase({ racePhoneInsertOnAuthUpsert: true });
  const result = await upsertUserProfile({
    user: profileUser({
      authUserId: "clerk_race_123",
      phone: "+91 99990 01235",
      email: "race@soulguru.local"
    })
  }, {}, { supabase });

  pushCheck("Authenticated profile sync recovers from raced phone profile insert", [
    result.configured === true,
    result.profile?.authUserId === "clerk_race_123",
    result.profile?.phone === "+919999001235",
    supabase.state.profiles.size === 1,
    supabase.state.racedPhoneInsertCount === 1
  ].every(Boolean));
}

async function checkPhoneIdentityConflictContract() {
  const supabase = createFakeProfileSupabase({
    profiles: [
      profileRow({
        id: "taken-phone-profile",
        auth_user_id: "clerk_other_123",
        phone: "+919999001234"
      })
    ]
  });

  await expectRejects(
    "Authenticated profile sync rejects phone linked to another account",
    () => upsertUserProfile({
      user: profileUser({
        authUserId: "clerk_contract_123",
        phone: "+91 99990 01234"
      })
    }, {}, { supabase }),
    /already linked/i,
    409
  );
}

function createFakeProfileSupabase(options = {}) {
  const state = {
    profiles: new Map((options.profiles || []).map((profile) => [profile.id, clone(profile)])),
    calls: [],
    nextProfileId: 1,
    racePhoneInsertOnAuthUpsert: Boolean(options.racePhoneInsertOnAuthUpsert),
    racedPhoneInsertCount: 0
  };

  return {
    state,
    from(table) {
      return createProfileQuery(state, table);
    }
  };
}

function createProfileQuery(state, table) {
  const query = {
    filters: {},
    operation: "select",
    payload: null,
    options: {},
    select() {
      return query;
    },
    limit() {
      return query;
    },
    eq(column, value) {
      query.filters[column] = value;
      return query;
    },
    upsert(payload, options = {}) {
      query.operation = "upsert";
      query.payload = clone(payload);
      query.options = clone(options);
      state.calls.push({ table, operation: "upsert", payload: clone(payload), options: clone(options) });
      return query;
    },
    update(payload) {
      query.operation = "update";
      query.payload = clone(payload);
      state.calls.push({ table, operation: "update", payload: clone(payload) });
      return query;
    },
    async maybeSingle() {
      if (table !== "user_profiles") {
        return { data: null, error: null };
      }
      if (query.operation === "upsert") {
        return applyProfileUpsert(state, query.payload, query.options);
      }
      if (query.operation === "update") {
        return applyProfileUpdate(state, query.payload, query.filters);
      }
      return {
        data: clone(findProfile(state, query.filters)) || null,
        error: null
      };
    }
  };

  return query;
}

function applyProfileUpsert(state, payload, options = {}) {
  const conflictTarget = options.onConflict || "phone";

  if (
    conflictTarget === "auth_user_id"
    && state.racePhoneInsertOnAuthUpsert
    && state.racedPhoneInsertCount === 0
    && payload.phone
    && !findByColumn(state, "phone", payload.phone)
  ) {
    state.racedPhoneInsertCount += 1;
    const racedProfile = profileRow({
      ...payload,
      id: `race-profile-${state.nextProfileId++}`,
      auth_user_id: null
    });
    state.profiles.set(racedProfile.id, racedProfile);
    return {
      data: null,
      error: { code: "23505", message: "duplicate phone" }
    };
  }

  const existing = payload[conflictTarget] ? findByColumn(state, conflictTarget, payload[conflictTarget]) : null;
  const conflict = findUniqueConflict(state, payload, existing?.id);
  if (conflict) {
    return {
      data: null,
      error: { code: "23505", message: `duplicate ${conflict}` }
    };
  }

  const next = {
    ...(existing || {}),
    ...clone(payload),
    id: existing?.id || `profile-${state.nextProfileId++}`,
    created_at: existing?.created_at || "2026-06-24T00:00:00.000Z",
    updated_at: payload.updated_at || "2026-06-24T00:00:00.000Z"
  };
  state.profiles.set(next.id, next);
  return { data: clone(next), error: null };
}

function applyProfileUpdate(state, payload, filters) {
  const existing = findProfile(state, filters);
  if (!existing) {
    return { data: null, error: null };
  }

  const conflict = findUniqueConflict(state, payload, existing.id);
  if (conflict) {
    return {
      data: null,
      error: { code: "23505", message: `duplicate ${conflict}` }
    };
  }

  const next = {
    ...existing,
    ...clone(payload),
    id: existing.id,
    created_at: existing.created_at,
    updated_at: payload.updated_at || existing.updated_at
  };
  state.profiles.set(existing.id, next);
  return { data: clone(next), error: null };
}

function findProfile(state, filters = {}) {
  return Array.from(state.profiles.values()).find((profile) => {
    if (filters.id && profile.id !== filters.id) return false;
    if (filters.auth_user_id && profile.auth_user_id !== filters.auth_user_id) return false;
    if (filters.phone && profile.phone !== filters.phone) return false;
    if (filters.email && profile.email !== filters.email) return false;
    return true;
  });
}

function findByColumn(state, column, value) {
  if (!value) return null;
  return Array.from(state.profiles.values()).find((profile) => profile[column] === value) || null;
}

function findUniqueConflict(state, payload, currentId) {
  for (const column of ["auth_user_id", "phone"]) {
    const value = payload[column];
    if (!value) continue;
    const conflict = Array.from(state.profiles.values()).find((profile) => (
      profile.id !== currentId && profile[column] === value
    ));
    if (conflict) return column;
  }
  return "";
}

function profileUser(overrides = {}) {
  return {
    authUserId: "clerk_contract_123",
    phone: "+919999001234",
    email: "asha@soulguru.local",
    name: "Asha Rao",
    birthDate: "1991-04-05",
    birthTime: "06:45",
    birthPlace: "Mumbai, India",
    birthLatitude: 19.076,
    birthLongitude: 72.8777,
    birthTimezone: "Asia/Kolkata",
    birthTimezoneOffsetMinutes: 330,
    birthPlaceResolvedLabel: "Mumbai, Maharashtra, India",
    birthPlaceResolutionSource: "catalog",
    ...overrides
  };
}

function profileRow(overrides = {}) {
  return {
    id: "profile-seed",
    auth_user_id: "clerk_seed",
    phone: "+919999001234",
    email: "seed@soulguru.local",
    full_name: "Seed User",
    birth_date: "1991-04-05",
    birth_time: "06:45:00",
    birth_place: "Mumbai, India",
    birth_latitude: 19.076,
    birth_longitude: 72.8777,
    birth_timezone: "Asia/Kolkata",
    birth_timezone_offset_minutes: 330,
    birth_place_resolved_label: "Mumbai, Maharashtra, India",
    birth_place_resolution_source: "catalog",
    created_at: "2026-06-24T00:00:00.000Z",
    updated_at: "2026-06-24T00:00:00.000Z",
    ...overrides
  };
}

async function expectRejects(label, action, pattern, statusCode) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, [
      pattern.test(String(error.message || "")),
      statusCode ? error.statusCode === statusCode : true
    ].every(Boolean));
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function approx(actual, expected, tolerance) {
  return Math.abs(Number(actual) - expected) <= tolerance;
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Profile contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
