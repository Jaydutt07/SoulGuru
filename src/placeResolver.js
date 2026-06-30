const DEFAULT_PLACE = {
  label: "India",
  latitude: 22.9734,
  longitude: 78.6569,
  timezone: "Asia/Kolkata",
  timezoneOffsetMinutes: 330
};

const PLACE_CATALOG = [
  ["mumbai", "Mumbai, India", 19.076, 72.8777, "Asia/Kolkata", 330],
  ["bombay", "Mumbai, India", 19.076, 72.8777, "Asia/Kolkata", 330],
  ["delhi", "Delhi, India", 28.6139, 77.209, "Asia/Kolkata", 330],
  ["new delhi", "New Delhi, India", 28.6139, 77.209, "Asia/Kolkata", 330],
  ["bengaluru", "Bengaluru, India", 12.9716, 77.5946, "Asia/Kolkata", 330],
  ["bangalore", "Bengaluru, India", 12.9716, 77.5946, "Asia/Kolkata", 330],
  ["hyderabad", "Hyderabad, India", 17.385, 78.4867, "Asia/Kolkata", 330],
  ["ahmedabad", "Ahmedabad, India", 23.0225, 72.5714, "Asia/Kolkata", 330],
  ["chennai", "Chennai, India", 13.0827, 80.2707, "Asia/Kolkata", 330],
  ["kolkata", "Kolkata, India", 22.5726, 88.3639, "Asia/Kolkata", 330],
  ["calcutta", "Kolkata, India", 22.5726, 88.3639, "Asia/Kolkata", 330],
  ["pune", "Pune, India", 18.5204, 73.8567, "Asia/Kolkata", 330],
  ["jaipur", "Jaipur, India", 26.9124, 75.7873, "Asia/Kolkata", 330],
  ["surat", "Surat, India", 21.1702, 72.8311, "Asia/Kolkata", 330],
  ["lucknow", "Lucknow, India", 26.8467, 80.9462, "Asia/Kolkata", 330],
  ["kanpur", "Kanpur, India", 26.4499, 80.3319, "Asia/Kolkata", 330],
  ["nagpur", "Nagpur, India", 21.1458, 79.0882, "Asia/Kolkata", 330],
  ["indore", "Indore, India", 22.7196, 75.8577, "Asia/Kolkata", 330],
  ["bhopal", "Bhopal, India", 23.2599, 77.4126, "Asia/Kolkata", 330],
  ["patna", "Patna, India", 25.5941, 85.1376, "Asia/Kolkata", 330],
  ["vadodara", "Vadodara, India", 22.3072, 73.1812, "Asia/Kolkata", 330],
  ["baroda", "Vadodara, India", 22.3072, 73.1812, "Asia/Kolkata", 330],
  ["ludhiana", "Ludhiana, India", 30.901, 75.8573, "Asia/Kolkata", 330],
  ["agra", "Agra, India", 27.1767, 78.0081, "Asia/Kolkata", 330],
  ["nashik", "Nashik, India", 19.9975, 73.7898, "Asia/Kolkata", 330],
  ["umarga", "Umarga, Maharashtra, India", 17.839767, 76.622246, "Asia/Kolkata", 330],
  ["omerga", "Umarga, Maharashtra, India", 17.839767, 76.622246, "Asia/Kolkata", 330],
  ["faridabad", "Faridabad, India", 28.4089, 77.3178, "Asia/Kolkata", 330],
  ["meerut", "Meerut, India", 28.9845, 77.7064, "Asia/Kolkata", 330],
  ["rajkot", "Rajkot, India", 22.3039, 70.8022, "Asia/Kolkata", 330],
  ["varanasi", "Varanasi, India", 25.3176, 82.9739, "Asia/Kolkata", 330],
  ["srinagar", "Srinagar, India", 34.0837, 74.7973, "Asia/Kolkata", 330],
  ["amritsar", "Amritsar, India", 31.634, 74.8723, "Asia/Kolkata", 330],
  ["allahabad", "Prayagraj, India", 25.4358, 81.8463, "Asia/Kolkata", 330],
  ["prayagraj", "Prayagraj, India", 25.4358, 81.8463, "Asia/Kolkata", 330],
  ["ranchi", "Ranchi, India", 23.3441, 85.3096, "Asia/Kolkata", 330],
  ["coimbatore", "Coimbatore, India", 11.0168, 76.9558, "Asia/Kolkata", 330],
  ["jabalpur", "Jabalpur, India", 23.1815, 79.9864, "Asia/Kolkata", 330],
  ["gwalior", "Gwalior, India", 26.2183, 78.1828, "Asia/Kolkata", 330],
  ["vijayawada", "Vijayawada, India", 16.5062, 80.648, "Asia/Kolkata", 330],
  ["jodhpur", "Jodhpur, India", 26.2389, 73.0243, "Asia/Kolkata", 330],
  ["madurai", "Madurai, India", 9.9252, 78.1198, "Asia/Kolkata", 330],
  ["raipur", "Raipur, India", 21.2514, 81.6296, "Asia/Kolkata", 330],
  ["kota", "Kota, India", 25.2138, 75.8648, "Asia/Kolkata", 330],
  ["guwahati", "Guwahati, India", 26.1445, 91.7362, "Asia/Kolkata", 330],
  ["chandigarh", "Chandigarh, India", 30.7333, 76.7794, "Asia/Kolkata", 330],
  ["thiruvananthapuram", "Thiruvananthapuram, India", 8.5241, 76.9366, "Asia/Kolkata", 330],
  ["trivandrum", "Thiruvananthapuram, India", 8.5241, 76.9366, "Asia/Kolkata", 330],
  ["kochi", "Kochi, India", 9.9312, 76.2673, "Asia/Kolkata", 330],
  ["cochin", "Kochi, India", 9.9312, 76.2673, "Asia/Kolkata", 330],
  ["dehradun", "Dehradun, India", 30.3165, 78.0322, "Asia/Kolkata", 330],
  ["goa", "Goa, India", 15.2993, 74.124, "Asia/Kolkata", 330],
  ["panaji", "Panaji, India", 15.4909, 73.8278, "Asia/Kolkata", 330],
  ["london", "London, United Kingdom", 51.5072, -0.1276, "Europe/London", 0],
  ["new york", "New York, United States", 40.7128, -74.006, "America/New_York", -300],
  ["los angeles", "Los Angeles, United States", 34.0522, -118.2437, "America/Los_Angeles", -480],
  ["toronto", "Toronto, Canada", 43.6532, -79.3832, "America/Toronto", -300],
  ["dubai", "Dubai, United Arab Emirates", 25.2048, 55.2708, "Asia/Dubai", 240],
  ["singapore", "Singapore", 1.3521, 103.8198, "Asia/Singapore", 480],
  ["sydney", "Sydney, Australia", -33.8688, 151.2093, "Australia/Sydney", 600]
].map(([key, label, latitude, longitude, timezone, timezoneOffsetMinutes]) => ({
  key,
  label,
  latitude,
  longitude,
  timezone,
  timezoneOffsetMinutes
}));

export function resolveBirthPlace(input, user = {}) {
  const existingLatitude = nullableNumber(user.birthLatitude);
  const existingLongitude = nullableNumber(user.birthLongitude);
  const existingOffset = nullableNumber(user.birthTimezoneOffsetMinutes);
  if (existingLatitude !== null && existingLongitude !== null) {
    return {
      label: String(user.birthPlaceResolvedLabel || user.birthPlace || input || "Known birth place").trim(),
      latitude: existingLatitude,
      longitude: existingLongitude,
      timezone: user.birthTimezone || DEFAULT_PLACE.timezone,
      timezoneOffsetMinutes: existingOffset ?? DEFAULT_PLACE.timezoneOffsetMinutes,
      source: user.birthPlaceResolutionSource || "profile"
    };
  }

  const normalized = normalizePlace(input || user.birthPlace);
  const place = PLACE_CATALOG.find((item) => normalized === item.key || normalized.includes(item.key));
  if (place) {
    return {
      ...place,
      source: "catalog"
    };
  }

  return {
    label: String(input || user.birthPlace || DEFAULT_PLACE.label).trim() || DEFAULT_PLACE.label,
    latitude: DEFAULT_PLACE.latitude,
    longitude: DEFAULT_PLACE.longitude,
    timezone: user.birthTimezone || DEFAULT_PLACE.timezone,
    timezoneOffsetMinutes: existingOffset ?? DEFAULT_PLACE.timezoneOffsetMinutes,
    source: "default"
  };
}

export function enrichUserWithPlace(user = {}) {
  const place = resolveBirthPlace(user.birthPlace, user);
  return {
    ...user,
    birthPlace: user.birthPlace || place.label,
    birthLatitude: place.latitude,
    birthLongitude: place.longitude,
    birthTimezone: place.timezone,
    birthTimezoneOffsetMinutes: place.timezoneOffsetMinutes,
    birthPlaceResolvedLabel: place.label,
    birthPlaceResolutionSource: place.source
  };
}

function normalizePlace(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
