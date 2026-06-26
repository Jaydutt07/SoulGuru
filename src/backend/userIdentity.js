import crypto from "node:crypto";

const USER_KEY_PREFIX = "sgu_";
const USER_KEY_PATTERN = /^sgu_[a-f0-9]{32}$/;

export function buildBackendUserKey(user = {}) {
  return hashBackendUserIdentity(getBackendUserIdentity(user) || "anonymous");
}

export function getBackendUserIdentity(user = {}) {
  const authUserId = normalizeIdentityPart(user.authUserId || user.clerkUserId);
  if (authUserId) return `auth:${authUserId}`;

  const id = normalizeIdentityPart(user.id || user.userId);
  if (id) return `id:${id}`;

  const phone = normalizePhone(user.phone);
  if (phone) return `phone:${phone}`;

  const email = normalizeEmail(user.email);
  if (email) return `email:${email}`;

  const profileParts = [
    normalizeIdentityPart(user.name || user.fullName),
    normalizeIdentityPart(user.birthDate || user.birth_date),
    normalizeIdentityPart(user.birthTime || user.birth_time)
  ].filter(Boolean);
  return profileParts.length >= 2 ? `profile:${profileParts.join("|")}` : "";
}

export function normalizeBackendUserKey(value) {
  const normalized = String(value || "").toLowerCase().trim();
  return USER_KEY_PATTERN.test(normalized) ? normalized : "";
}

export function isBackendUserKey(value) {
  return USER_KEY_PATTERN.test(String(value || "").toLowerCase().trim());
}

export function hashBackendUserIdentity(identity) {
  const normalized = String(identity || "anonymous").toLowerCase().trim() || "anonymous";
  const digest = crypto
    .createHash("sha256")
    .update(`soulguru:user-key:${normalized}`)
    .digest("hex")
    .slice(0, 32);
  return `${USER_KEY_PREFIX}${digest}`;
}

function normalizeIdentityPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(value) {
  return normalizeIdentityPart(value);
}

function normalizePhone(value) {
  return String(value || "")
    .replace(/[\s().-]+/g, "")
    .trim();
}
