import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Clock3,
  Crown,
  Hash,
  Heart,
  LockKeyhole,
  LogIn,
  LogOut,
  MessageCircle,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
  X
} from "lucide-react";
import "./styles.css";
import {
  authFetch,
  getClerkSessionSnapshot,
  initializeClerkAuth,
  isClerkAuthConfigured,
  openClerkSignIn,
  openClerkUserProfile,
  signOutClerk
} from "./authClient.js";
import { SIDEREAL_SIGNS, buildAstrologyContext, buildTransitDateForUser, getSaadeSatiFromChart, normalizeSiderealSign } from "./astrologyEngine.js";
import { buildFallbackAstroSolveInsight } from "./astroSolveGuidance.js";
import { generateCompatibility } from "./compatibility.js";
import { buildFallbackDeepGuidance } from "./deepGuidance.js";
import { getDailyFocus, getDailyWisdom } from "./localSoulWisdom.js";
import { getNumbers } from "./numerology.js";
import { clearObservedUser, identifyUser, initializeObservability, trackEvent } from "./observability.js";
import { enrichUserWithPlace } from "./placeResolver.js";
import { buildFallbackPanditAnswer } from "./shaniGuidance.js";
import { firstName, normalizeWisdomPayload } from "./soulGuruPrompt.js";
import { SOUL_WISDOM_PROMPT_VERSION } from "./soulWisdomVersion.js";

const ACCOUNT_DB_KEY = "soulguru.accounts.v1";
const SESSION_KEY = "soulguru.session.v1";
const SOUL_READING_CACHE_VERSION = SOUL_WISDOM_PROMPT_VERSION;
const SOUL_READING_CACHE_PREFIX = `soulguru.dailySoulReading.${SOUL_READING_CACHE_VERSION}`;
const SOUL_READING_HISTORY_PREFIX = `soulguru.dailySoulReadingHistory.${SOUL_READING_CACHE_VERSION}`;
const SOUL_READING_REQUESTS = new Map();
const SOUL_WISDOM_PENDING_RETRY_LIMIT = 60;
const SOUL_WISDOM_PENDING_RETRY_MS = 5000;
const MORE_GUIDANCE_PENDING_RETRY_LIMIT = 60;
const MORE_GUIDANCE_PENDING_RETRY_MS = 5000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const LOCAL_AUTH_FALLBACK_SETTING = import.meta.env.VITE_LOCAL_AUTH_FALLBACK;
const IS_NATIVE_MOBILE_SHELL = detectNativeMobileShell();
const NATIVE_DEMO_AUTH_DEFAULT = IS_NATIVE_MOBILE_SHELL && !API_BASE_URL && LOCAL_AUTH_FALLBACK_SETTING !== "false";
const LOCAL_AUTH_FALLBACK_ENABLED = LOCAL_AUTH_FALLBACK_SETTING === "true" || import.meta.env.MODE !== "production" || NATIVE_DEMO_AUTH_DEFAULT;
const LOCAL_READING_FALLBACK_ENABLED = LOCAL_AUTH_FALLBACK_ENABLED && !API_BASE_URL;
const LOCAL_PAID_FALLBACK_ENABLED = import.meta.env.VITE_LOCAL_PAID_FALLBACK === "true" || import.meta.env.MODE !== "production";
const DEMO_PAYMENTS_ENABLED = import.meta.env.VITE_DEMO_PAYMENTS === "true" || import.meta.env.MODE !== "production";

initializeObservability();
initializeClerkAuth();

const TABS = [
  { id: "soul", label: "Soul Guru", Icon: Sparkles },
  { id: "astro", label: "Astro Solves", Icon: ShieldCheck },
  { id: "shani", label: "Shani", Icon: Clock3 },
  { id: "numbers", label: "#Numbers", Icon: Hash },
  { id: "harmony", label: "Harmony", Icon: Heart }
];

const MEMBERSHIP_PLANS = [
  { id: "3m", name: "3 months", price: "Starter guidance" },
  { id: "6m", name: "6 months", price: "Steady remedies" },
  { id: "1y", name: "1 year", price: "Full-year map" },
  { id: "full", name: "Remaining timeline", price: "Complete guide map" }
];

const ASTRO_PROMPTS = [
  "Why does this keep returning to me?",
  "What is the hidden lesson in this delay?",
  "Where am I giving away my power?",
  "What should I protect before I answer?",
  "How do I move without losing peace?"
];

function detectNativeMobileShell() {
  const capacitor = typeof window !== "undefined" ? window.Capacitor : null;
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === "function") {
    return capacitor.isNativePlatform();
  }
  return ["android", "ios"].includes(capacitor.getPlatform?.());
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [user, setUser] = useState(() => getSessionUser());
  const [activeTab, setActiveTab] = useState("soul");

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashDone(true), 1700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    identifyUser(user);
  }, [user]);

  useEffect(() => {
    if (!user || LOCAL_READING_FALLBACK_ENABLED) return;
    const todayKey = getTodayKey(new Date(), user.birthTimezone || undefined);
    if (readDailyReadingCache(user, todayKey)?.reading) return;

    const fallbackReading = getDailyWisdom(user, todayKey);
    const payload = buildDailyReadingPayload(user, todayKey, fallbackReading);
    requestDailyReadingFromServer(user, todayKey, payload)
      .then(({ ok, data }) => {
        if (!ok || !(data?.reading || data?.wisdom) || data.stored === false) return;
        const nextReading = normalizeWisdomPayload(data.reading || data.wisdom, fallbackReading);
        writeDailyReadingCache(user, todayKey, nextReading, {
          cached: Boolean(data.cached),
          model: data.model,
          source: data.source || "api",
          stored: data.stored !== false
        });
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (splashDone && user) {
      trackEvent("tab_viewed", { tab: activeTab });
    }
  }, [activeTab, splashDone, user]);

  function handleLogin(account, loginMeta = {}) {
    const enrichedAccount = saveAccount(account);
    if (LOCAL_AUTH_FALLBACK_ENABLED) {
      window.localStorage.setItem(SESSION_KEY, enrichedAccount.phone);
    }
    setUser(enrichedAccount);
    setActiveTab("soul");
    syncUserProfileToServer(enrichedAccount).then((profile) => {
      if (!profile) return;
      const syncedAccount = mergeAccountProfile(enrichedAccount, profile);
      saveAccount(syncedAccount);
      setUser((current) => current?.phone === syncedAccount.phone ? mergeAccountProfile(current, profile) : current);
    });
    trackEvent("login_completed", {
      method: loginMeta.method || (LOCAL_AUTH_FALLBACK_ENABLED ? "local_demo_otp" : "backend_otp"),
      flow: loginMeta.flow || "unknown",
      server_backed: Boolean(loginMeta.serverBacked)
    });
  }

  function updateUser(updater) {
    setUser((current) => {
      const nextRaw = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      const next = saveAccount(nextRaw);
      if (LOCAL_AUTH_FALLBACK_ENABLED) {
        window.localStorage.setItem(SESSION_KEY, next.phone);
      }
      if (hasProfileChanged(current, next)) {
        syncUserProfileToServer(next);
      }
      return next;
    });
  }

  function handleLogout() {
    window.localStorage.removeItem(SESSION_KEY);
    signOutClerk();
    clearObservedUser();
    setUser(null);
    setActiveTab("soul");
    trackEvent("logout_completed");
  }

  if (!splashDone) {
    return <Splash onSkip={() => setSplashDone(true)} />;
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <MentorApp
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
      updateUser={updateUser}
      onLogout={handleLogout}
    />
  );
}

function Splash({ onSkip }) {
  return (
    <section className="splash-screen">
      <div className="splash-sky" aria-hidden="true">
        <span className="splash-star splash-star-one" />
        <span className="splash-star splash-star-two" />
        <span className="splash-star splash-star-three" />
        <span className="splash-horizon-glow" />
      </div>
      <div className="splash-content">
        <UniversalEntityLogo className="splash-entity-mark" />
        <p className="splash-kicker">Soul Guru is opening</p>
        <h1>Soul Guru</h1>
        <p className="splash-subtitle">A wiser light for every turning point.</p>
        <CosmicBuffer label="Aligning your inner compass." tone="soul" compact />
      </div>
      <button className="icon-text splash-skip" type="button" onClick={onSkip}>
        Begin
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

function UniversalEntityLogo({ className = "" }) {
  return (
    <div className={`universal-entity ${className}`} aria-hidden="true">
      <span className="entity-aura entity-aura-one" />
      <span className="entity-aura entity-aura-two" />
      <img src="/assets/soulguru-universal-entity.png" alt="" />
      <span className="entity-orbit entity-orbit-one" />
      <span className="entity-orbit entity-orbit-two" />
      <span className="entity-star entity-star-one" />
      <span className="entity-star entity-star-two" />
      <span className="entity-star entity-star-three" />
      <span className="entity-star entity-star-four" />
      <span className="entity-star entity-star-five" />
      <span className="entity-star entity-star-six" />
    </div>
  );
}

function CosmicBuffer({ label, tone = "soul", compact = false }) {
  return (
    <div className={`cosmic-buffer cosmic-buffer-${tone}${compact ? " compact" : ""}`} role="status" aria-live="polite">
      <div className="cosmic-buffer-orb" aria-hidden="true">
        <span className="buffer-ring buffer-ring-outer" />
        <span className="buffer-ring buffer-ring-inner" />
        <span className="buffer-horizon" />
        <span className="buffer-sun" />
        <span className="buffer-dot buffer-dot-one" />
        <span className="buffer-dot buffer-dot-two" />
        <span className="buffer-dot buffer-dot-three" />
      </div>
      <div className="cosmic-buffer-copy">
        <strong>{label}</strong>
        <div className="buffer-phrases" aria-hidden="true">
          <span>Reading the sky</span>
          <span>Finding the thread</span>
          <span>Polishing the next step</span>
        </div>
      </div>
    </div>
  );
}

function isBufferingStatus(status) {
  return /preparing|finishing|syncing|checking|reading|opening|verifying|saving|sending|noting/i.test(String(status || ""));
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({
    name: "",
    birthDate: "",
    birthPlace: "",
    birthTime: "",
    phone: "",
    email: ""
  });
  const [pendingOtp, setPendingOtp] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    setPendingOtp(null);
    setOtpValue("");
    setError("");
    setIsVerifyingOtp(false);
  }, [mode]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function sendOtp() {
    if (isSendingOtp) return;
    const phone = normalizePhone(form.phone);
    const accounts = readAccounts();
    setError("");

    if (!isValidPhone(phone)) {
      setError("Enter a valid phone number.");
      return;
    }

    setIsSendingOtp(true);

    try {
      if (mode === "existing") {
        const account = await lookupAccountFromServer(phone) || (LOCAL_AUTH_FALLBACK_ENABLED ? accounts[phone] : null);
        if (!account) {
          setError("No account found for this number.");
          return;
        }
        const otp = await requestOtpFromServer({
          phone,
          email: account.email,
          purpose: "login"
        });
        const enrichedAccount = saveAccount(account);
        setPendingOtp({
          phone,
          ...otp,
          account: enrichedAccount,
          payload: enrichedAccount
        });
        setOtpValue("");
        return;
      }

      const requiredFields = ["name", "birthDate", "birthPlace", "birthTime", "email"];
      const missingField = requiredFields.find((field) => !String(form[field]).trim());
      if (missingField) {
        setError("Complete all details before verification.");
        return;
      }
      const serverAccount = await lookupAccountFromServer(phone);
      if ((LOCAL_AUTH_FALLBACK_ENABLED && accounts[phone]) || serverAccount) {
        if (serverAccount) saveAccount(serverAccount);
        setError("This number already has an account.");
        return;
      }
      const otp = await requestOtpFromServer({
        phone,
        email: form.email,
        purpose: "create"
      });

      setPendingOtp({
        phone,
        ...otp,
        payload: { ...form, phone }
      });
      setOtpValue("");
    } catch (error) {
      setError(error.message || "Unable to send OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function verifyOtp() {
    if (!pendingOtp) return;
    if (isVerifyingOtp) return;
    setError("");
    setIsVerifyingOtp(true);

    try {
      const verified = await verifyOtpWithServer(pendingOtp, otpValue);
      if (!verified) {
        setError("OTP did not match.");
        return;
      }

      if (mode === "existing") {
        const account = pendingOtp.account || readAccounts()[pendingOtp.phone];
        if (!account) {
          setError("No account found for this number.");
          return;
        }
        onLogin(account, buildLoginMeta(pendingOtp, "existing"));
        return;
      }

      const account = enrichUserWithPlace({
        id: `sg-${Date.now()}`,
        name: pendingOtp.payload.name.trim(),
        birthDate: pendingOtp.payload.birthDate,
        birthPlace: pendingOtp.payload.birthPlace.trim(),
        birthTime: pendingOtp.payload.birthTime,
        phone: pendingOtp.phone,
        email: pendingOtp.payload.email.trim(),
        createdAt: new Date().toISOString(),
        solvedProblems: [],
        memberPlan: "",
        guidanceHistory: [],
        savedGuidance: []
      });

      if (!LOCAL_AUTH_FALLBACK_ENABLED) {
        const profile = await syncUserProfileToServer(account);
        if (!profile) {
          setError("Unable to save your account profile. Please try again shortly.");
          return;
        }
        onLogin(mergeAccountProfile(account, profile), buildLoginMeta(pendingOtp, "create"));
        return;
      }

      onLogin(account, buildLoginMeta(pendingOtp, "create"));
    } catch (error) {
      setError(error.message || "Unable to verify OTP.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Sparkles size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Soul Guru</p>
            <h1>Begin softly.</h1>
          </div>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Account options">
          <button
            type="button"
            className={mode === "existing" ? "active" : ""}
            onClick={() => setMode("existing")}
          >
            <LogIn size={17} aria-hidden="true" />
            Already existing account
          </button>
          <button
            type="button"
            className={mode === "create" ? "active" : ""}
            onClick={() => setMode("create")}
          >
            <UserPlus size={17} aria-hidden="true" />
            Create new account
          </button>
        </div>

        <div className="auth-fields">
          {mode === "create" && (
            <>
              <InputField label="Name" value={form.name} onChange={(value) => updateField("name", value)} autoComplete="name" />
              <div className="field-grid">
                <InputField label="Birth date" type="date" value={form.birthDate} onChange={(value) => updateField("birthDate", value)} />
                <InputField label="Birth time" type="time" value={form.birthTime} onChange={(value) => updateField("birthTime", value)} />
              </div>
              <InputField label="Birth place" value={form.birthPlace} onChange={(value) => updateField("birthPlace", value)} autoComplete="address-level2" />
              <InputField label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} autoComplete="email" />
            </>
          )}
          <InputField label="Phone number" type="tel" value={form.phone} onChange={(value) => updateField("phone", value)} autoComplete="tel" />
        </div>

        {error && <p className="form-error">{error}</p>}

        {pendingOtp ? (
          <div className="otp-box">
            <div>
              <p className="eyebrow">OTP sent</p>
              <strong>{maskPhone(pendingOtp.phone)}</strong>
            </div>
            {pendingOtp.code ? (
              <span className="otp-demo">Demo OTP {pendingOtp.code}</span>
            ) : (
              <span className="otp-demo">Check your OTP message</span>
            )}
            <InputField label="Enter OTP" inputMode="numeric" value={otpValue} onChange={setOtpValue} />
            {isVerifyingOtp && <CosmicBuffer label="Verifying your entry." tone="soul" compact />}
            <button className="primary-action" type="button" onClick={verifyOtp} disabled={isVerifyingOtp}>
              <ShieldCheck size={18} aria-hidden="true" />
              {isVerifyingOtp ? "Verifying" : "Verify and enter"}
            </button>
          </div>
        ) : (
          <>
            {isSendingOtp && <CosmicBuffer label="Sending a quiet signal." tone="soul" compact />}
            <button className="primary-action" type="button" onClick={sendOtp} disabled={isSendingOtp}>
              <Send size={18} aria-hidden="true" />
              {isSendingOtp ? "Checking account" : "Send OTP"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function InputField({ label, value, onChange, type = "text", ...props }) {
  return (
    <label className="input-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}

function MentorApp({ activeTab, onTabChange, user, updateUser, onLogout }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeLabel = activeTab === "subscription" ? "More Guidance" : TABS.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="app-page">
      <div className={`phone-shell theme-${activeTab}`}>
        <header className="app-header">
          <div className="header-title">
            <span className="brand-mark-mini" aria-hidden="true">
              <Sparkles size={16} />
            </span>
            <span className="brand-wordmark">Soul Guru</span>
            <span className="screen-context">{activeLabel}</span>
          </div>
          <button className="date-switch" type="button" aria-label="Today's guidance">
            Today
            <span aria-hidden="true">⌄</span>
          </button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            <Settings size={20} aria-hidden="true" />
          </button>
        </header>

        <nav className="top-tabs" aria-label="SoulGuru tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => onTabChange(id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <main className="tab-stage">
          {activeTab === "soul" && (
            <SoulGuruTab
              user={user}
              updateUser={updateUser}
              onMoreGuidance={() => onTabChange("subscription")}
            />
          )}
          {activeTab === "astro" && <AstroSolvesTab user={user} updateUser={updateUser} />}
          {activeTab === "shani" && <ShaniTab user={user} updateUser={updateUser} />}
          {activeTab === "numbers" && <NumbersTab user={user} />}
          {activeTab === "harmony" && <HarmonyTab user={user} />}
          {activeTab === "subscription" && (
            <SubscriptionPage
              user={user}
              updateUser={updateUser}
              onBack={() => onTabChange("soul")}
            />
          )}
        </main>

        {settingsOpen && (
          <SettingsDrawer user={user} onClose={() => setSettingsOpen(false)} onLogout={onLogout} />
        )}
      </div>
    </div>
  );
}

function SoulGuruTab({ user, updateUser, onMoreGuidance }) {
  const todayKey = useMemo(() => getTodayKey(new Date(), user.birthTimezone || undefined), [user.birthTimezone]);
  const fallbackReading = useMemo(() => getDailyWisdom(user, todayKey), [user, todayKey]);
  const [reading, setReading] = useState(LOCAL_READING_FALLBACK_ENABLED ? fallbackReading : null);
  const [readingStatus, setReadingStatus] = useState(LOCAL_READING_FALLBACK_ENABLED ? "" : "Preparing today's guidance...");
  const [isSavingAdvice, setIsSavingAdvice] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [feedbackChoice, setFeedbackChoice] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const focusItems = useMemo(() => getDailyFocus(user), [user]);
  const wisdomEditorial = useMemo(() => splitWisdomForEditorial(reading), [reading]);
  const focusCue = focusItems.find((item) => item.label === "Focus")?.value || reading?.innerWeather || "One clean priority";
  const anchorCue = focusItems.find((item) => item.label === "Anchor")?.value || reading?.innerWeather || "Steady the next choice";
  const avoidCue = focusItems.find((item) => item.label === "Avoid")?.value || reading?.release || "The extra debate";
  const mentorMove = reading?.todayMove || focusCue || "Finish one real step";
  const releaseMove = reading?.release || avoidCue || "The extra debate";
  const mentorName = firstName(user.name) || "Seeker";
  const readingDeck = useMemo(() => buildSoulGuruReadingDeck({
    reading,
    focusCue,
    anchorCue,
    avoidCue,
    mentorMove,
    releaseMove
  }), [anchorCue, avoidCue, focusCue, mentorMove, reading, releaseMove]);

  useEffect(() => {
    setFeedbackChoice("");
    setFeedbackStatus("");
  }, [reading?.wisdom]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;
    const cached = readDailyReadingCache(user, todayKey);

    if (cached?.reading) {
      setReading(cached.reading);
      setReadingStatus("");
      return () => {
        cancelled = true;
      };
    }

    if (LOCAL_READING_FALLBACK_ENABLED) {
      setReading(fallbackReading);
      setReadingStatus("");
    } else {
      setReading(null);
      setReadingStatus("Preparing today's guidance...");
    }

    const payload = buildDailyReadingPayload(user, todayKey, fallbackReading);

    const requestDailyReading = (attempt = 0) => {
      const freshCached = readDailyReadingCache(user, todayKey);
      if (freshCached?.reading) {
        setReading(freshCached.reading);
        setReadingStatus("");
        return;
      }

      requestDailyReadingFromServer(user, todayKey, payload)
        .then(({ ok, status, data }) => {
          if (cancelled) return;

          if (ok && (data?.reading || data?.wisdom)) {
            if (data.stored === false && !LOCAL_READING_FALLBACK_ENABLED) {
              setReading(null);
              setReadingStatus("Today's guidance could not be saved. Please try again shortly.");
              trackEvent("soul_wisdom_failed", { reason: "not_stored" });
              return;
            }

            const nextReading = normalizeWisdomPayload(data.reading || data.wisdom, fallbackReading);
            setReading(nextReading);
            setReadingStatus("");
            if (data.stored !== false || LOCAL_READING_FALLBACK_ENABLED) {
              writeDailyReadingCache(user, todayKey, nextReading, {
                cached: Boolean(data.cached),
                model: data.model,
                source: data.source || "api",
                stored: data.stored !== false
              });
            }
            return;
          }

          if (status === 409 && /already being prepared/.test(data?.error || "")) {
            if (LOCAL_READING_FALLBACK_ENABLED) {
              setReading(fallbackReading);
              setReadingStatus("Using local guidance while today's backend reading finishes.");
              return;
            }
            if (attempt < SOUL_WISDOM_PENDING_RETRY_LIMIT) {
              setReading(null);
              setReadingStatus("Soul Guru is finishing today's guidance. This can take a few minutes the first time, then it will be saved for today.");
              trackEvent("soul_wisdom_pending", { attempt });
              retryTimer = window.setTimeout(() => requestDailyReading(attempt + 1), SOUL_WISDOM_PENDING_RETRY_MS);
              return;
            }
            setReading(null);
            setReadingStatus("Soul Guru is still preparing today's guidance. Keep this tab open or check again shortly.");
            trackEvent("soul_wisdom_failed", { reason: "pending_timeout" });
            return;
          }

          if (LOCAL_READING_FALLBACK_ENABLED) {
            setReading(fallbackReading);
            setReadingStatus("Using local guidance until the backend is connected.");
            return;
          }

          setReading(null);
          setReadingStatus("Soul Guru is unavailable. Please try again shortly.");
          trackEvent("soul_wisdom_failed", { reason: "unavailable", status });
        })
        .catch(() => {
          if (!cancelled) {
            if (LOCAL_READING_FALLBACK_ENABLED) {
              setReading(fallbackReading);
              setReadingStatus("Using local guidance until the backend is connected.");
              return;
            }
            setReading(null);
            setReadingStatus("Soul Guru is unavailable. Please try again shortly.");
            trackEvent("soul_wisdom_failed", { reason: "network" });
          }
        });
    };

    requestDailyReading();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [fallbackReading, todayKey, user]);

  async function saveAdvice() {
    if (isSavingAdvice || !reading) return;

    const savedItem = {
      id: `saved-${Date.now()}`,
      date: new Date().toISOString(),
      reading
    };

    setIsSavingAdvice(true);
    setSaveStatus("Saving advice...");

    try {
      const result = await saveGuidanceToServer(user, reading, savedItem.id);
      const storedItem = result.item || savedItem;
      updateUser((current) => ({
        ...current,
        savedGuidance: [storedItem, ...(current.savedGuidance || [])].slice(0, 30),
        guidanceHistory: upsertHistory(current.guidanceHistory || [], reading)
      }));
      setSaveStatus(result.saved ? "Advice saved." : "Saved locally until the backend is connected.");
      trackEvent("guidance_saved", { source: result.saved ? "server" : "local-fallback" });
    } catch {
      if (LOCAL_PAID_FALLBACK_ENABLED) {
        updateUser((current) => ({
          ...current,
          savedGuidance: [savedItem, ...(current.savedGuidance || [])].slice(0, 30),
          guidanceHistory: upsertHistory(current.guidanceHistory || [], reading)
        }));
        setSaveStatus("Saved locally until the backend is connected.");
        trackEvent("guidance_saved", { source: "local-fallback" });
      } else {
        setSaveStatus("Advice could not sync. Please try again shortly.");
        trackEvent("guidance_save_failed");
      }
    } finally {
      setIsSavingAdvice(false);
    }
  }

  async function sendWisdomFeedback(rating) {
    if (!reading) return;

    setFeedbackChoice(rating);
    setFeedbackStatus("Noting this...");

    try {
      const response = await authFetch(getApiUrl("/api/soul-wisdom-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            birthDate: user.birthDate,
            birthTime: user.birthTime,
            birthPlace: user.birthPlace,
            birthLatitude: user.birthLatitude,
            birthLongitude: user.birthLongitude,
            birthTimezone: user.birthTimezone,
            birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
            birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
            birthPlaceResolutionSource: user.birthPlaceResolutionSource
          },
          rating,
          readingDate: todayKey,
          promptVersion: SOUL_WISDOM_PROMPT_VERSION,
          wisdom: reading.wisdom
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save feedback");
      }

      setFeedbackStatus(data.stored ? "Feedback saved." : "Feedback noted.");
      trackEvent("soul_wisdom_feedback", { rating, stored: Boolean(data.stored) });
    } catch {
      setFeedbackStatus("Feedback could not sync.");
      trackEvent("soul_wisdom_feedback_failed", { rating });
    }
  }

  return (
    <section className="tab-section soul-section">
      <div className="soul-guru-hero" aria-label="Today's Soul Guru room">
        <UniversalEntityLogo className="soul-guru-cosmos guru-sanctum" />
        <div className="soul-guru-daily">
          <p className="eyebrow">Soul Guru</p>
          <h2>Words of Wisdom</h2>
          <span>
            <Clock3 size={14} aria-hidden="true" />
            {formatDate(todayKey)}
          </span>
          <strong>{mentorName}, keep today's answer close.</strong>
        </div>
      </div>
      <article className="wisdom-panel">
        <div className="wisdom-sigil" aria-hidden="true" />
        <div className="wisdom-panel-top">
          <p className="editorial-kicker">Today's private note</p>
          {reading && (
            <span className="soul-weather-pill">
              <Sparkles size={14} aria-hidden="true" />
              Chart signal
            </span>
          )}
        </div>
        {reading ? (
          <>
            <div className="soul-note-frame">
              <h3 className="wisdom-headline">{wisdomEditorial.headline}</h3>
              {wisdomEditorial.body && <p className="wisdom-body">{wisdomEditorial.body}</p>}
            </div>
            <div className="soul-reading-briefing" aria-label="Soul Guru reading briefing">
              {readingDeck.map((layer, index) => (
                <section className={`soul-briefing-row soul-briefing-row-${layer.id}`} key={layer.id}>
                  <span className="soul-briefing-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <span>{layer.label}</span>
                    <p>{layer.value}</p>
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <CosmicBuffer label={readingStatus || "Soul Guru is opening today's guidance."} tone="soul" />
        )}
      </article>
      {reading && (
        <div className="mentor-cues" aria-label="Today's mentor cues">
          <div>
            <span>Do before sunset</span>
            <strong>{mentorMove}</strong>
          </div>
          <div>
            <span>Do not carry tonight</span>
            <strong>{releaseMove}</strong>
          </div>
        </div>
      )}
      <div className="wisdom-feedback" aria-label="Reading feedback">
        <button
          className={feedbackChoice === "accurate" ? "active" : ""}
          type="button"
          onClick={() => sendWisdomFeedback("accurate")}
          disabled={!reading}
          aria-pressed={feedbackChoice === "accurate"}
        >
          <ThumbsUp size={17} aria-hidden="true" />
          Accurate
        </button>
        <button
          className={feedbackChoice === "missed" ? "active" : ""}
          type="button"
          onClick={() => sendWisdomFeedback("missed")}
          disabled={!reading}
          aria-pressed={feedbackChoice === "missed"}
        >
          <ThumbsDown size={17} aria-hidden="true" />
          Missed
        </button>
      </div>
      <div className="guidance-actions">
        <button className="secondary-action calm-action" type="button" onClick={saveAdvice} disabled={isSavingAdvice || !reading}>
          <BadgeCheck size={18} aria-hidden="true" />
          {isSavingAdvice ? "Saving" : "Save Advice"}
        </button>
        <button className="primary-action guidance-action" type="button" onClick={onMoreGuidance}>
          <Crown size={18} aria-hidden="true" />
          More Guidance
        </button>
      </div>
      {saveStatus && (
        isSavingAdvice
          ? <CosmicBuffer label={saveStatus} tone="soul" compact />
          : <p className="checkout-note">{saveStatus}</p>
      )}
      {feedbackStatus && (
        isBufferingStatus(feedbackStatus)
          ? <CosmicBuffer label={feedbackStatus} tone="soul" compact />
          : <p className="checkout-note">{feedbackStatus}</p>
      )}
    </section>
  );
}

function splitWisdomForEditorial(input) {
  const source = input && typeof input === "object" ? input : { wisdom: input };
  const clean = String(source.wisdom || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return {
      headline: "",
      body: ""
    };
  }

  const cueHeadline = normalizeReadingHeadline(source.innerWeather || source.todayMove || "");
  if (cueHeadline) {
    return {
      headline: cueHeadline,
      body: sentenceCase(clean)
    };
  }

  if (words(clean).length <= 18 && clean.length <= 118) {
    return {
      headline: normalizeMentorHeadline(clean),
      body: ""
    };
  }

  const sentenceMatch = clean.match(/^(.+?[.!?])\s+(.+)$/);
  if (sentenceMatch) {
    const firstSentence = sentenceMatch[1];
    if (words(firstSentence).length <= 14 && firstSentence.length <= 92) {
      return {
        headline: normalizeMentorHeadline(firstSentence),
        body: sentenceCase(sentenceMatch[2])
      };
    }
  }

  const mentorMove = normalizeMentorHeadline(source.todayMove || source.innerWeather);
  if (mentorMove) {
    return {
      headline: mentorMove,
      body: sentenceCase(clean)
    };
  }

  return {
    headline: normalizeMentorHeadline(limitDisplayWords(clean, 12)),
    body: ""
  };
}

function buildSoulGuruReadingDeck({ reading, focusCue, anchorCue, avoidCue, mentorMove, releaseMove }) {
  if (!reading) return [];
  const layers = [];
  pushUniqueReadingLayer(layers, "signal", "Today's pressure", focusCue || reading.innerWeather);
  pushUniqueReadingLayer(layers, "move", "The move to make", mentorMove || reading.todayMove);
  pushUniqueReadingLayer(layers, "anchor", "Steadying anchor", anchorCue || reading.innerWeather);
  pushUniqueReadingLayer(layers, "release", "Stop feeding", releaseMove || avoidCue || reading.release);
  return layers.slice(0, 4);
}

function pushUniqueReadingLayer(layers, id, label, value) {
  const clean = ensureSentence(value);
  if (!clean) return;
  const normalized = clean.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (layers.some((layer) => layer.normalized === normalized)) return;
  layers.push({ id, label, value: clean, normalized });
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function sentenceCase(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean ? `${clean.charAt(0).toUpperCase()}${clean.slice(1)}` : "";
}

function normalizeMentorHeadline(text) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[,:;]+$/, "")
    .trim();
  if (!clean || /^(syncing|wait for today's guidance)$/i.test(clean)) return "";
  const cleanWords = words(clean);
  if (cleanWords.length > 10 || clean.length > 76) return "";
  const headline = sentenceCase(clean);
  return /[.!?]$/.test(headline) ? headline : `${headline}.`;
}

function normalizeReadingHeadline(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return sentenceCase(limitDisplayWords(clean.replace(/[.!?]+$/, ""), 8));
}

function ensureSentence(text) {
  const clean = sentenceCase(String(text || "").replace(/\s+/g, " ").trim());
  return clean && !/[.!?]$/.test(clean) ? `${clean}.` : clean;
}

function limitDisplayWords(text, maxWords) {
  const displayWords = words(text);
  if (displayWords.length <= maxWords) return sentenceCase(String(text || "").trim());
  return `${displayWords.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function AstroSolvesTab({ user, updateUser }) {
  const [problem, setProblem] = useState("");
  const [visibleSolvedProblems, setVisibleSolvedProblems] = useState([]);
  const [isSolving, setIsSolving] = useState(false);
  const [solveStatus, setSolveStatus] = useState("");
  const [serverAllowance, setServerAllowance] = useState(null);
  const solvedProblems = user.solvedProblems || [];
  const localAllowance = getAstroQuestionAllowance(user);
  const allowance = serverAllowance?.limit ?? localAllowance;
  const remaining = Number.isFinite(serverAllowance?.remaining)
    ? serverAllowance.remaining
    : Math.max(0, allowance - solvedProblems.length);

  useEffect(() => {
    let cancelled = false;

    async function syncAstroAllowance() {
      if (LOCAL_AUTH_FALLBACK_ENABLED) {
        setServerAllowance(null);
        return;
      }

      try {
        const response = await authFetch(getApiUrl("/api/astro-solve"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "allowance",
            priorCount: solvedProblems.length,
            subscription: user.soulGuruSubscription,
            user: buildAstroSolveUserPayload(user)
          })
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        setServerAllowance(response.ok && data.allowance ? data.allowance : null);
      } catch {
        if (!cancelled) setServerAllowance(null);
      }
    }

    syncAstroAllowance();
    return () => {
      cancelled = true;
    };
  }, [
    solvedProblems.length,
    user.birthDate,
    user.birthLatitude,
    user.birthLongitude,
    user.birthPlace,
    user.birthPlaceResolutionSource,
    user.birthPlaceResolvedLabel,
    user.birthTime,
    user.birthTimezone,
    user.birthTimezoneOffsetMinutes,
    user.email,
    user.id,
    user.name,
    user.phone,
    user.soulGuruSubscription?.active,
    user.soulGuruSubscription?.astroBonusQuestions
  ]);

  async function submitProblem(event) {
    event.preventDefault();
    const question = problem.trim();
    if (!question || remaining <= 0 || isSolving) return;

    setIsSolving(true);
    setSolveStatus("Reading the chart pattern...");
    trackEvent("astro_solve_started", { has_more_guidance: Boolean(user.soulGuruSubscription?.active) });

    try {
      const context = buildAstrologyContext(user);
      const fallback = generateProblemInsight(question, user, solvedProblems.length, context);
      const response = await authFetch(getApiUrl("/api/astro-solve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          priorCount: solvedProblems.length,
          subscription: user.soulGuruSubscription,
          user: buildAstroSolveUserPayload(user),
          context,
          today: new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          }),
          fallback
        })
      });

      const data = await response.json().catch(() => ({}));
      if (data.allowance) {
        setServerAllowance(data.allowance);
      }
      if (response.status === 402 || data.allowed === false) {
        setSolveStatus("Your Astro Solves allowance is complete. More Guidance adds 15 more questions.");
        return;
      }

      if (!response.ok && !LOCAL_AUTH_FALLBACK_ENABLED) {
        setSolveStatus(data.error || "Astro Solves is unavailable. Please try again shortly.");
        trackEvent("astro_solve_failed", { status: response.status });
        return;
      }

      if (response.ok && data.stored === false && !LOCAL_AUTH_FALLBACK_ENABLED) {
        setSolveStatus("Analysis could not be saved. Please try again shortly.");
        trackEvent("astro_solve_failed", { reason: "not_stored" });
        return;
      }

      const insight = response.ok ? normalizeAstroSolveInsight(data, fallback) : {
        ...fallback,
        source: "local-fallback"
      };

      updateUser((current) => ({
        ...current,
        solvedProblems: [insight, ...(current.solvedProblems || [])]
      }));
      setVisibleSolvedProblems([insight]);
      setProblem("");
      setSolveStatus("A pattern has opened.");
      trackEvent("astro_solve_completed", { source: insight.source || "api" });
    } catch {
      if (!LOCAL_AUTH_FALLBACK_ENABLED) {
        setSolveStatus("Astro Solves is unavailable. Please try again shortly.");
        trackEvent("astro_solve_failed", { reason: "request_error" });
        return;
      }

      const fallback = {
        ...generateProblemInsight(question, user, solvedProblems.length),
        source: "local-fallback"
      };
      updateUser((current) => ({
        ...current,
        solvedProblems: [fallback, ...(current.solvedProblems || [])]
      }));
      setVisibleSolvedProblems([fallback]);
      setProblem("");
      setSolveStatus("A pattern has opened.");
      trackEvent("astro_solve_completed", { source: "local-fallback" });
    } finally {
      setIsSolving(false);
    }
  }

  return (
    <section className="tab-section astro-section">
      <p className="eyebrow">Astro Solves</p>
      <h2>Solution for everything</h2>

      <div className="astro-question-list" aria-label="Suggested Astro Solves prompts">
        {ASTRO_PROMPTS.map((prompt, index) => (
          <button type="button" key={prompt} style={{ "--float-index": index }} onClick={() => setProblem(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <form className="problem-form" onSubmit={submitProblem}>
        <label className="problem-input">
          <span>Share your problem</span>
          <textarea
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            placeholder="Write it exactly as it feels."
            rows={4}
            maxLength={360}
          />
        </label>
        <div className="form-row">
          <span>{remaining} detailed analysis left</span>
          <button className="primary-action small" type="submit" disabled={remaining <= 0 || !problem.trim() || isSolving}>
            <Send size={16} aria-hidden="true" />
            {isSolving ? "Reading" : "Get solution"}
          </button>
        </div>
      </form>
      {solveStatus && (
        isSolving
          ? <CosmicBuffer label={solveStatus} tone="astro" compact />
          : <p className="checkout-note">{solveStatus}</p>
      )}

      {remaining === 0 && (
        <div className="locked-note">
          <LockKeyhole size={18} aria-hidden="true" />
          <span>Your current detailed analysis allowance is complete. More Guidance can continue from here.</span>
        </div>
      )}

      <div className="solution-list">
        {visibleSolvedProblems.map((item) => (
          <article className="solution-card solution-reveal" key={item.id}>
            <div className="solution-reveal-mark" aria-hidden="true">
              <Sparkles size={18} />
            </div>
            <p className="problem-quote">{item.problem}</p>
            <div className="solution-unlocked" aria-label="Unlocked analysis">
              {[
                ["root", "Root", item.root],
                ["astrology", "Astrology", item.astrology],
                ["solution", "Solution", item.solution]
              ].map(([id, label, text]) => (
                <section className={`reveal-thread reveal-thread-${id}`} key={id}>
                  <span>{label}</span>
                  <p className="solution-copy">{text}</p>
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SubscriptionPage({ user, updateUser, onBack }) {
  const [serverDashboard, setServerDashboard] = useState(null);
  const [deepGuidance, setDeepGuidance] = useState(null);
  const [dashboardStatus, setDashboardStatus] = useState("");
  const [deepGuidanceStatus, setDeepGuidanceStatus] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState("");
  const [deepSaveStatus, setDeepSaveStatus] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isSavingDeepGuidance, setIsSavingDeepGuidance] = useState(false);
  const serverSubscription = serverDashboard?.subscription?.active ? serverDashboard.subscription : null;
  const localSubscription = LOCAL_PAID_FALLBACK_ENABLED ? user.soulGuruSubscription : null;
  const subscription = serverSubscription || localSubscription;
  const isActive = Boolean(subscription?.active);
  const tracking = serverDashboard?.tracking || buildLocalSubscriptionTracking(subscription);
  const localGuidanceHistory = LOCAL_PAID_FALLBACK_ENABLED ? getCachedGuidanceHistory(user) : [];
  const localSavedGuidance = LOCAL_PAID_FALLBACK_ENABLED ? user.savedGuidance || [] : [];
  const guidanceHistory = mergeGuidanceItems(serverDashboard?.guidanceHistory || [], localGuidanceHistory);
  const savedGuidance = mergeGuidanceItems(serverDashboard?.savedGuidance || [], localSavedGuidance);
  const fallbackDeepGuidance = useMemo(() => buildLocalDeepGuidance(user), [user]);
  const activeDeepGuidance = deepGuidance || (LOCAL_PAID_FALLBACK_ENABLED ? fallbackDeepGuidance : null);

  useEffect(() => {
    let cancelled = false;
    setDashboardStatus("Syncing guidance...");

    authFetch(getApiUrl("/api/more-guidance"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "dashboard",
        limit: 10,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthPlace: user.birthPlace,
          birthLatitude: user.birthLatitude,
          birthLongitude: user.birthLongitude,
          birthTimezone: user.birthTimezone,
          birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
          birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
          birthPlaceResolutionSource: user.birthPlaceResolutionSource
        }
      })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.configured) {
          setServerDashboard(data);
          setDashboardStatus("Guidance synced.");
          if (data.subscription?.active && !user.soulGuruSubscription?.active) {
            updateUser((current) => ({
              ...current,
              soulGuruSubscription: data.subscription
            }));
          }
          return;
        }
        setDashboardStatus("");
      })
      .catch(() => {
        if (!cancelled) setDashboardStatus("");
      });

    return () => {
      cancelled = true;
    };
  }, [updateUser, user.birthDate, user.birthLatitude, user.birthLongitude, user.birthPlace, user.birthPlaceResolutionSource, user.birthPlaceResolvedLabel, user.birthTime, user.birthTimezone, user.birthTimezoneOffsetMinutes, user.email, user.id, user.name, user.phone, user.soulGuruSubscription?.active]);

  useEffect(() => {
    if (!isActive) {
      setDeepGuidance(null);
      setDeepGuidanceStatus("");
      return undefined;
    }

    let cancelled = false;
    let retryTimer = null;
    const dateKey = getTodayKey(new Date(), user.birthTimezone || undefined);
    const context = buildAstrologyContext(user, buildDateFromKey(dateKey, user));
    setDeepGuidanceStatus("Preparing deeper guidance...");

    const payload = {
      action: "deep-guidance",
      date: dateKey,
      timezone: user.birthTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      subscription,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        birthDate: user.birthDate,
        birthTime: user.birthTime,
        birthPlace: user.birthPlace,
        birthLatitude: user.birthLatitude,
        birthLongitude: user.birthLongitude,
        birthTimezone: user.birthTimezone,
        birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
        birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
        birthPlaceResolutionSource: user.birthPlaceResolutionSource,
        soulGuruSubscription: subscription
      },
      context,
      fallback: LOCAL_PAID_FALLBACK_ENABLED ? fallbackDeepGuidance : undefined
    };

    const requestDeepGuidance = (attempt = 0) => {
      authFetch(getApiUrl("/api/more-guidance"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then((response) => response.json().then((data) => ({ ok: response.ok, status: response.status, data })).catch(() => ({ ok: false, status: response.status, data: null })))
        .then(({ ok, status, data }) => {
          if (cancelled) return;
          if (ok && data?.guidance && (data.stored !== false || LOCAL_PAID_FALLBACK_ENABLED)) {
            setDeepGuidance(data.guidance);
            setServerDashboard((current) => current ? {
              ...current,
              guidanceHistory: mergeGuidanceItems([
                {
                  id: data.id || `more-guidance-${data.readingDate || dateKey}`,
                  date: data.createdAt || new Date().toISOString(),
                  dateKey: data.readingDate || dateKey,
                  promptVersion: data.promptVersion,
                  guidance: data.guidance,
                  wisdom: data.guidance.overview
                }
              ], current.guidanceHistory || [])
            } : current);
            setDeepGuidanceStatus(data.cached ? "Deeper guidance synced." : "Deeper guidance ready.");
            return;
          }
          if (ok && data?.guidance && data.stored === false) {
            setDeepGuidance(null);
            setDeepGuidanceStatus("Deeper guidance could not be saved. Please try again shortly.");
            return;
          }
          if (status === 409 && /already being prepared/.test(data?.error || "")) {
            if (LOCAL_PAID_FALLBACK_ENABLED) {
              setDeepGuidance(fallbackDeepGuidance);
              setDeepGuidanceStatus("Using local deeper guidance while the paid backend finishes.");
              return;
            }
            if (attempt < MORE_GUIDANCE_PENDING_RETRY_LIMIT) {
              setDeepGuidance(null);
              setDeepGuidanceStatus("Soul Guru is finishing your deeper guidance. This can take a few minutes the first time, then it will be saved.");
              trackEvent("more_guidance_pending", { attempt });
              retryTimer = window.setTimeout(() => requestDeepGuidance(attempt + 1), MORE_GUIDANCE_PENDING_RETRY_MS);
              return;
            }
            setDeepGuidance(null);
            setDeepGuidanceStatus("Soul Guru is still preparing your deeper guidance. Keep this page open or check again shortly.");
            trackEvent("more_guidance_failed", { reason: "pending_timeout" });
            return;
          }
          if (status === 402) {
            setDeepGuidanceStatus("Activate More Guidance to unlock the deeper map.");
            return;
          }
          if (LOCAL_PAID_FALLBACK_ENABLED) {
            setDeepGuidance(fallbackDeepGuidance);
            setDeepGuidanceStatus("Using local deeper guidance until the backend is connected.");
            return;
          }
          setDeepGuidance(null);
          setDeepGuidanceStatus("Deeper guidance could not sync. Please try again shortly.");
        })
        .catch(() => {
          if (!cancelled) {
            if (LOCAL_PAID_FALLBACK_ENABLED) {
              setDeepGuidance(fallbackDeepGuidance);
              setDeepGuidanceStatus("Using local deeper guidance until the backend is connected.");
              return;
            }
            setDeepGuidance(null);
            setDeepGuidanceStatus("Deeper guidance could not sync. Please try again shortly.");
          }
        });
    };

    requestDeepGuidance();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [fallbackDeepGuidance, isActive, subscription, user]);

  function activatePlan(metadata = {}) {
    const start = new Date();
    const end = addMonths(start, 3);
    updateUser((current) => ({
      ...current,
      soulGuruSubscription: {
        active: true,
        name: "Soul Guru + Astro Solve",
        duration: "3 months",
        astroBonusQuestions: 15,
        startedAt: start.toISOString(),
        endsAt: end.toISOString(),
        ...metadata
      }
    }));
    trackEvent("more_guidance_activated", {
      provider: metadata.provider || "demo",
      duration: "3m"
    });
  }

  async function startCheckout() {
    if (isActive || isActivating) return;
    setIsActivating(true);
    setCheckoutStatus("Preparing secure checkout...");
    trackEvent("more_guidance_checkout_started");

    try {
      const response = await authFetch(getApiUrl("/api/create-razorpay-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email
          }
        })
      });

      const order = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (DEMO_PAYMENTS_ENABLED) {
          activatePlan({ provider: "demo", paymentStatus: "demo" });
          setCheckoutStatus("Demo activation is active for this local build.");
          return;
        }
        throw new Error(order.error || "Payment setup is not connected in this build.");
      }

      await openRazorpayCheckout({
        order,
        user,
        async onSuccess(payment) {
          setCheckoutStatus("Verifying payment...");
          try {
            const verification = await verifyRazorpayPayment({
              user,
              order,
              payment
            });
            activatePlan({
              ...(verification.subscription || {}),
              provider: "razorpay",
              paymentStatus: "verified",
              razorpayOrderId: order.orderId,
              razorpayPaymentId: payment.razorpay_payment_id
            });
            setCheckoutStatus("Payment verified. More Guidance is active.");
          } catch (error) {
            setCheckoutStatus(error.message || "Payment could not be verified.");
            trackEvent("more_guidance_payment_verification_failed");
          }
        },
        onFailure(message) {
          setCheckoutStatus(message || "Payment was not completed.");
          trackEvent("more_guidance_checkout_failed");
        }
      });
    } catch (error) {
      setCheckoutStatus(error.message || "Unable to start checkout.");
    } finally {
      setIsActivating(false);
    }
  }

  async function saveDeepGuidanceAdvice() {
    if (isSavingDeepGuidance || !activeDeepGuidance) return;

    const savedItem = {
      id: `saved-more-guidance-${Date.now()}`,
      date: new Date().toISOString(),
      guidance: activeDeepGuidance,
      wisdom: activeDeepGuidance.overview
    };

    setIsSavingDeepGuidance(true);
    setDeepSaveStatus("Saving deeper advice...");

    try {
      const result = await saveGuidanceToServer(user, {
        type: "more-guidance",
        wisdom: activeDeepGuidance.overview,
        guidance: activeDeepGuidance
      }, savedItem.id);
      const storedItem = result.item || savedItem;
      setServerDashboard((current) => current ? {
        ...current,
        savedGuidance: mergeGuidanceItems([storedItem], current.savedGuidance || [])
      } : current);
      updateUser((current) => ({
        ...current,
        savedGuidance: [storedItem, ...(current.savedGuidance || [])].slice(0, 30)
      }));
      setDeepSaveStatus(result.saved ? "Deeper advice saved." : "Saved locally until the backend is connected.");
      trackEvent("more_guidance_saved", { source: result.saved ? "server" : "local-fallback" });
    } catch {
      if (LOCAL_PAID_FALLBACK_ENABLED) {
        updateUser((current) => ({
          ...current,
          savedGuidance: [savedItem, ...(current.savedGuidance || [])].slice(0, 30)
        }));
        setDeepSaveStatus("Saved locally until the backend is connected.");
        trackEvent("more_guidance_saved", { source: "local-fallback" });
      } else {
        setDeepSaveStatus("Deeper advice could not sync. Please try again shortly.");
        trackEvent("more_guidance_save_failed");
      }
    } finally {
      setIsSavingDeepGuidance(false);
    }
  }

  return (
    <section className="tab-section subscription-section">
      <button className="back-action" type="button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        Soul Guru
      </button>
      <p className="eyebrow">More Guidance</p>
      <h2>Soul Guru + Astro Solve</h2>

      <article className="subscription-hero">
        <div className="subscription-mark">
          <Crown size={26} aria-hidden="true" />
        </div>
        <div>
          <h3>3 months of deeper guidance</h3>
          <p>Detailed daily mentorship from Soul Guru plus 15 additional Astro Solves questions for the moments that need a fuller answer.</p>
        </div>
      </article>

      <div className="subscription-benefits">
        <div>
          <BadgeCheck size={18} aria-hidden="true" />
          <span>More detailed Soul Guru readings</span>
        </div>
        <div>
          <BadgeCheck size={18} aria-hidden="true" />
          <span>15 more Astro Solves questions</span>
        </div>
        <div>
          <BadgeCheck size={18} aria-hidden="true" />
          <span>Guidance written in a calm mentor tone</span>
        </div>
      </div>

      <button
        className={isActive ? "primary-action subscribed-action" : "primary-action"}
        type="button"
        onClick={startCheckout}
        disabled={isActive || isActivating}
      >
        <Check size={18} aria-hidden="true" />
        {isActive ? "Subscription active" : isActivating ? "Opening checkout" : "Activate 3 months"}
      </button>
      {checkoutStatus && (
        isActivating
          ? <CosmicBuffer label={checkoutStatus} tone="soul" compact />
          : <p className="checkout-note">{checkoutStatus}</p>
      )}
      {dashboardStatus && (
        isBufferingStatus(dashboardStatus)
          ? <CosmicBuffer label={dashboardStatus} tone="soul" compact />
          : <p className="checkout-note">{dashboardStatus}</p>
      )}

      {isActive && (
        <>
          <article className="tracking-panel">
            <div className="section-heading-row">
              <h3>3-month tracking</h3>
              <span className="member-badge">{tracking?.daysLeft ?? 0} days left</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${tracking?.progress ?? 0}%` }} />
            </div>
            <div className="tracking-meta">
              <span>Month {tracking?.monthIndex || 1} of 3</span>
              <span>{tracking?.weeksLeft ?? 0} weeks left</span>
              <span>{tracking?.progress ?? 0}% complete</span>
            </div>
            <div className="tracking-steps">
              {(tracking?.checkpoints || []).map((checkpoint) => (
                <div className={`tracking-step ${checkpoint.status}`} key={checkpoint.label}>
                  <span>{checkpoint.label}</span>
                  <strong>{checkpoint.title}</strong>
                </div>
              ))}
            </div>
            <p>Started {formatDate(tracking?.startedAt)}. Ends {formatDate(tracking?.endsAt)}.</p>
          </article>

          <article className="deep-guidance-panel">
            <h3>Deeper guidance map</h3>
            {deepGuidanceStatus && (
              !activeDeepGuidance && isBufferingStatus(deepGuidanceStatus)
                ? <CosmicBuffer label={deepGuidanceStatus} tone="soul" compact />
                : <p className="deep-guidance-status">{deepGuidanceStatus}</p>
            )}
            {activeDeepGuidance ? (
              <>
                <div className="deep-guidance-cues">
                  <div><span>Focus</span><strong>{activeDeepGuidance.focus}</strong></div>
                  <div><span>Watch</span><strong>{activeDeepGuidance.watch}</strong></div>
                </div>
                <p><strong>Overview:</strong> {activeDeepGuidance.overview}</p>
                <p><strong>This week:</strong> {activeDeepGuidance.thisWeek}</p>
                <p><strong>This month:</strong> {activeDeepGuidance.thisMonth}</p>
                <p><strong>Practice:</strong> {activeDeepGuidance.practice}</p>
                <div className="deep-guidance-actions">
                  <button className="secondary-action calm-action" type="button" onClick={saveDeepGuidanceAdvice} disabled={isSavingDeepGuidance}>
                    <BadgeCheck size={18} aria-hidden="true" />
                    {isSavingDeepGuidance ? "Saving" : "Save Advice"}
                  </button>
                </div>
                {deepSaveStatus && (
                  isSavingDeepGuidance
                    ? <CosmicBuffer label={deepSaveStatus} tone="soul" compact />
                    : <p className="deep-guidance-status">{deepSaveStatus}</p>
                )}
              </>
            ) : (
              <p>Your deeper guidance will appear here after the paid backend sync completes.</p>
            )}
            <p><strong>Astro Solves:</strong> your plan includes 15 extra detailed questions for specific life situations.</p>
          </article>

          <div className="guidance-lists">
            <GuidanceList title="Reading history" items={guidanceHistory} empty="Your deeper readings will collect here." />
            <GuidanceList title="Saved advice" items={savedGuidance} empty="Save guidance from Soul Guru to keep it here." />
          </div>
        </>
      )}
    </section>
  );
}

function GuidanceList({ title, items, empty }) {
  return (
    <article className="guidance-list-panel">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <div className="guidance-list">
          {items.slice(0, 5).map((item) => (
            <div key={item.id || item.date}>
              <span>{formatDate(item.date || item.dateKey)}</span>
              {getGuidanceListMeta(item) && <strong>{getGuidanceListMeta(item)}</strong>}
              <p>{getGuidanceListCopy(item)}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function getGuidanceListCopy(item) {
  return item.guidance?.overview
    || item.reading?.guidance?.overview
    || item.reading?.overview
    || item.reading?.wisdom
    || item.wisdom
    || "";
}

function getGuidanceListMeta(item) {
  return item.guidance?.focus
    || item.reading?.guidance?.focus
    || item.reading?.innerWeather
    || "";
}

function ShaniTab({ user, updateUser }) {
  const [now, setNow] = useState(() => new Date());
  const [chatOpen, setChatOpen] = useState(false);
  const [planStatus, setPlanStatus] = useState("");
  const [dashboardStatus, setDashboardStatus] = useState("");
  const [serverDashboard, setServerDashboard] = useState(null);
  const [activatingPlanId, setActivatingPlanId] = useState("");
  const report = useMemo(() => getSaadeSatiReport(user, now), [user, now]);
  const countdown = useMemo(() => getCountdown(report.endDate, now), [report.endDate, now]);
  const verifiedMoonSign = normalizeSiderealSign(user.vedicMoonSignOverride);
  const serverMembership = serverDashboard?.membership?.active ? serverDashboard.membership : null;
  const localMemberPlanId = LOCAL_PAID_FALLBACK_ENABLED ? user.memberPlan : "";
  const effectiveMemberPlanId = serverMembership?.planId || localMemberPlanId;
  const memberPlan = serverMembership
    ? {
        id: serverMembership.planId,
        name: serverMembership.planName,
        price: serverMembership.endsAt ? `Active until ${formatDate(serverMembership.endsAt)}` : "Synced membership"
      }
    : MEMBERSHIP_PLANS.find((plan) => plan.id === effectiveMemberPlanId);
  const panditMembership = serverMembership || (LOCAL_PAID_FALLBACK_ENABLED && memberPlan ? {
    active: true,
    planId: memberPlan.id,
    planName: memberPlan.name,
    provider: "local"
  } : null);
  const canUsePandit = Boolean(panditMembership?.active);
  const useLocalPandit = LOCAL_PAID_FALLBACK_ENABLED && panditMembership?.provider === "local";
  const remedyMap = serverDashboard?.remedyMap || (LOCAL_PAID_FALLBACK_ENABLED && panditMembership?.active
    ? buildLocalShaniRemedyMap(report, panditMembership, now)
    : null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDashboardStatus("Checking Shani membership...");

    authFetch(getApiUrl("/api/shani-guidance"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "dashboard",
        limit: 6,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          birthPlace: user.birthPlace,
          birthLatitude: user.birthLatitude,
          birthLongitude: user.birthLongitude,
          birthTimezone: user.birthTimezone,
          birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
          birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
          birthPlaceResolutionSource: user.birthPlaceResolutionSource,
          vedicMoonSignOverride: user.vedicMoonSignOverride
        }
      })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.configured) {
          setServerDashboard(data);
          setDashboardStatus(data.membership?.active ? "Shani membership synced." : "");
          return;
        }
        setDashboardStatus("");
      })
      .catch(() => {
        if (!cancelled) {
          setServerDashboard(null);
          setDashboardStatus(LOCAL_PAID_FALLBACK_ENABLED ? "" : "Shani membership could not sync. Pandit remains locked.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user.birthDate, user.birthLatitude, user.birthLongitude, user.birthPlace, user.birthPlaceResolutionSource, user.birthPlaceResolvedLabel, user.birthTime, user.birthTimezone, user.birthTimezoneOffsetMinutes, user.email, user.id, user.name, user.phone, user.vedicMoonSignOverride]);

  function updateVerifiedMoonSign(value) {
    const sign = normalizeSiderealSign(value);
    updateUser({ vedicMoonSignOverride: sign });
    setServerDashboard(null);
  }

  async function selectPlan(planId) {
    if (serverMembership?.active) {
      setPlanStatus(`${serverMembership.planName} is already active.`);
      return;
    }
    if (activatingPlanId) return;

    setActivatingPlanId(planId);
    setPlanStatus("Preparing secure Shani checkout...");
    trackEvent("shani_checkout_started", { planId });

    try {
      const response = await authFetch(getApiUrl("/api/create-shani-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          user: buildPaymentUserPayload(user, { includeBirth: true })
        })
      });
      const order = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (DEMO_PAYMENTS_ENABLED && LOCAL_PAID_FALLBACK_ENABLED) {
          updateUser({ memberPlan: planId });
          setPlanStatus("Demo Shani member preview is active for this local build.");
          return;
        }
        throw new Error(order.error || "Shani payment setup is not connected in this build.");
      }

      await openRazorpayCheckout({
        order,
        user,
        description: `Shani Remedy - ${order.planName || planId}`,
        notes: {
          soulguru_plan: `shani_remedy_${order.planId || planId}`,
          soulguru_product: "shani_remedy",
          shani_plan_id: order.planId || planId,
          user_key: order.userKey
        },
        async onSuccess(payment) {
          setPlanStatus("Verifying Shani payment...");
          try {
            const verification = await verifyShaniPayment({
              user,
              order,
              payment
            });
            const membership = verification.membership;
            setServerDashboard((current) => ({
              ...(current || { configured: true, report, panditHistory: [] }),
              configured: true,
              membership
            }));
            updateUser((current) => ({
              ...current,
              memberPlan: membership?.planId || planId,
              shaniMembership: membership
            }));
            setPlanStatus("Payment verified. Shani remedy membership is active.");
            trackEvent("shani_checkout_verified", { planId: membership?.planId || planId });
          } catch (error) {
            setPlanStatus(error.message || "Shani payment could not be verified.");
            trackEvent("shani_payment_verification_failed", { planId });
          }
        },
        onFailure(message) {
          setPlanStatus(message || "Payment was not completed.");
          trackEvent("shani_checkout_failed", { planId });
        }
      });
    } catch (error) {
      setPlanStatus(error.message || "Unable to start Shani checkout.");
    } finally {
      setActivatingPlanId("");
    }
  }

  function activateLocalShaniPlan(planId) {
    if (LOCAL_PAID_FALLBACK_ENABLED) {
      updateUser({ memberPlan: planId });
      setPlanStatus("Local Shani member preview is active.");
      return;
    }
    setPlanStatus("Secure Shani remedy checkout is required before member guidance can unlock.");
  }

  return (
    <section className="tab-section shani-section">
      <p className="eyebrow">Shani</p>
      <h2>Saade Sati</h2>

      <div className="status-panel shani-orbit-panel">
        <div className="shani-ring-system" aria-hidden="true">
          <span className="shani-planet" />
          <span className="shani-ring shani-ring-outer" />
          <span className="shani-ring shani-ring-inner" />
          <span className="shani-ring shani-ring-front" />
          <span className="shani-axis" />
          <span className="shani-moon shani-moon-one" />
          <span className="shani-moon shani-moon-two" />
          <span className="shani-moon shani-moon-three" />
        </div>
        <div className="shani-status-copy">
          <span className={report.active || report.secondaryActive ? "status-pill active" : "status-pill"}>{report.active ? "Active" : report.secondaryActive ? "Shani pressure" : "Not active"}</span>
          <h3>{report.phaseTitle}</h3>
          <p>{report.summary}</p>
          {report.moonSignSource === "verified" && report.computedMoonSign && report.computedMoonSign !== report.moonSign && (
            <span className="shani-source-note">Verified Moon sign is overriding the calculated {report.computedMoonSign} Moon for Shani timing.</span>
          )}
        </div>
      </div>

      <div className="shani-moon-control">
        <div>
          <span>Vedic Moon sign</span>
          <strong>{verifiedMoonSign ? `Verified ${verifiedMoonSign}` : `Calculated ${report.computedMoonSign || report.moonSign}`}</strong>
        </div>
        <label>
          <span>Moon source</span>
          <select value={verifiedMoonSign} onChange={(event) => updateVerifiedMoonSign(event.target.value)}>
            <option value="">Use calculated</option>
            {SIDEREAL_SIGNS.map((sign) => (
              <option key={sign} value={sign}>{sign}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="countdown-panel shani-time-dial">
        <div className="clock-title">
          <Clock3 size={18} aria-hidden="true" />
          <span>{report.active ? "Time remaining" : "Next watch window"}</span>
        </div>
        <div className="countdown-grid" aria-live="polite">
          <div><strong>{countdown.years}</strong><span>years</span></div>
          <div><strong>{countdown.months}</strong><span>months</span></div>
          <div><strong>{countdown.days}</strong><span>days</span></div>
        </div>
        <p className="fine-print">{report.endLabel}</p>
      </div>

      <div className="phase-rail shani-phase-orbit" aria-label="Saade Sati phases">
        {[
          { label: "Entry orbit", detail: "Saturn approaches" },
          { label: "Gravity peak", detail: "Lessons concentrate" },
          { label: "Release orbit", detail: "Pressure clears" }
        ].map((phase, index) => (
          <div key={phase.label} className={report.phaseIndex === index + 1 ? "active" : ""}>
            <strong>{phase.label}</strong>
            <span>{phase.detail}</span>
          </div>
        ))}
      </div>

      <div className="membership-block shani-vow-panel">
        <div className="section-heading-row">
          <h3>Remedy membership</h3>
          {memberPlan && <span className="member-badge"><Check size={14} aria-hidden="true" /> {memberPlan.name}</span>}
        </div>
        <div className="plan-grid">
          {MEMBERSHIP_PLANS.map((plan) => (
            <button
              type="button"
              key={plan.id}
              className={effectiveMemberPlanId === plan.id ? "plan-card active" : "plan-card"}
              onClick={() => selectPlan(plan.id).catch(() => activateLocalShaniPlan(plan.id))}
              disabled={Boolean(activatingPlanId)}
            >
              <strong>{plan.name}</strong>
              <span>{activatingPlanId === plan.id ? "Opening checkout" : plan.price}</span>
            </button>
          ))}
        </div>
        {planStatus && (
          activatingPlanId
            ? <CosmicBuffer label={planStatus} tone="shani" compact />
            : <p className="checkout-note">{planStatus}</p>
        )}
        {dashboardStatus && (
          isBufferingStatus(dashboardStatus)
            ? <CosmicBuffer label={dashboardStatus} tone="shani" compact />
            : <p className="checkout-note">{dashboardStatus}</p>
        )}
      </div>

      {remedyMap && <ShaniRemedyMap map={remedyMap} />}

      {canUsePandit && (
        <button className="pandit-fab" type="button" onClick={() => setChatOpen(true)} aria-label="Open Pandit chat">
          <MessageCircle size={22} aria-hidden="true" />
        </button>
      )}

      {chatOpen && canUsePandit && (
        <PanditChat
          user={user}
          report={report}
          membership={panditMembership}
          useLocalPandit={useLocalPandit}
          onClose={() => setChatOpen(false)}
        />
      )}
    </section>
  );
}

function ShaniRemedyMap({ map }) {
  return (
    <article className="remedy-map">
      <div className="section-heading-row">
        <h3>Member guide map</h3>
        <span className="member-badge">{map.renewal?.daysLeft ?? 0} days left</span>
      </div>
      <div className="remedy-phase">
        <span>{map.phase?.title}</span>
        <p>{map.phase?.summary}</p>
        <p>{map.phase?.pressure}</p>
      </div>
      <div className="remedy-grid">
        <div>
          <span>Next 7 days</span>
          <strong>{map.nextSevenDays?.focus}</strong>
          <p>{map.nextSevenDays?.action}</p>
        </div>
        <div>
          <span>This month</span>
          <strong>{map.nextMonth?.focus}</strong>
          <p>{map.nextMonth?.action}</p>
        </div>
      </div>
      <div className="practice-list">
        {(map.dailyPractices || []).map((practice) => (
          <div key={practice.title}>
            <Check size={15} aria-hidden="true" />
            <p><strong>{practice.title}</strong> {practice.text}</p>
          </div>
        ))}
      </div>
      {map.nextSevenDays?.caution && <p className="fine-print">{map.nextSevenDays.caution}</p>}
    </article>
  );
}

function PanditChat({ user, report, membership, useLocalPandit, onClose }) {
  const [messages, setMessages] = useState([
    {
      from: "pandit",
      text: `Namaste ${firstName(user.name)}. Your ${report.phaseTitle.toLowerCase()} needs patience, clean routine, and steady remedies. Ask what is weighing on you.`
    }
  ]);
  const [draft, setDraft] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    setChatStatus("");
    setMessages((current) => [...current, { from: "user", text }]);

    if (useLocalPandit) {
      setMessages((current) => [...current, { from: "pandit", text: buildPanditReply(text, user, report) }]);
      return;
    }

    if (!membership?.active) {
      setMessages((current) => [...current, { from: "pandit", text: "Shani remedy membership is required before Pandit guidance can open." }]);
      return;
    }

    setIsSending(true);
    try {
      const response = await authFetch(getApiUrl("/api/shani-guidance"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pandit",
          question: text,
          membership,
          report,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            birthDate: user.birthDate,
            birthTime: user.birthTime,
            birthPlace: user.birthPlace,
            birthLatitude: user.birthLatitude,
            birthLongitude: user.birthLongitude,
            birthTimezone: user.birthTimezone,
            birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
            birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
            birthPlaceResolutionSource: user.birthPlaceResolutionSource,
            vedicMoonSignOverride: user.vedicMoonSignOverride
          }
        })
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.answer && data.stored !== false) {
        setMessages((current) => [...current, { from: "pandit", text: formatPanditAnswer(data.answer) }]);
        trackEvent("shani_pandit_answered", { source: data.source || "unknown" });
        return;
      }

      if (response.status === 402) {
        setMessages((current) => [...current, { from: "pandit", text: "Your Shani remedy membership needs to be active before I can answer in detail." }]);
        return;
      }

      setChatStatus(data.error || "Pandit guidance could not sync. Please try again shortly.");
    } catch {
      setChatStatus("Pandit guidance could not sync. Please try again shortly.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="chat-sheet">
      <header>
        <div>
          <p className="eyebrow">Member guide</p>
          <h3>Pandit</h3>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close Pandit chat">
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <p key={`${message.from}-${index}`} className={message.from === "user" ? "user-message" : "pandit-message"}>
            {message.text}
          </p>
        ))}
        {isSending && <CosmicBuffer label="Pandit is weighing the remedy." tone="shani" compact />}
      </div>
      <form className="chat-form" onSubmit={sendMessage}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about your remedy" disabled={isSending} />
        <button className="icon-button filled" type="submit" aria-label="Send message" disabled={isSending}>
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
      {chatStatus && <p className="checkout-note">{chatStatus}</p>}
    </div>
  );
}

function NumbersTab({ user }) {
  const numbers = useMemo(() => getNumbers(user), [user]);
  const primaryNumber = numbers.find((item) => /life path/i.test(item.label)) || numbers[0];
  const supportNumbers = numbers.filter((item) => item !== primaryNumber);

  return (
    <section className="tab-section numbers-section">
      <p className="eyebrow">#Numbers</p>
      <h2>Numbers that Change Life</h2>
      {primaryNumber && (
        <article className={`number-card number-card-primary number-card-${getNumberTone(primaryNumber.label)}`}>
          <div className="number-ball-shell">
            <div className="number-ball-sphere" aria-hidden="true" />
            <strong className="number-ball-value">{primaryNumber.value}</strong>
          </div>
          <div className="number-copy">
            <span>{primaryNumber.label}</span>
            <p>{primaryNumber.note}</p>
          </div>
        </article>
      )}
      <div className="number-grid number-orbit-grid">
        {supportNumbers.map((item) => (
          <article key={item.label} className={`number-card number-card-${getNumberTone(item.label)}`}>
            <div className="number-ball-shell">
              <div className="number-ball-sphere" aria-hidden="true" />
              <strong className="number-ball-value">{item.value}</strong>
            </div>
            <div className="number-copy">
              <span>{item.label}</span>
              <p>{item.note}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getNumberTone(label) {
  const normalized = String(label || "").toLowerCase();
  if (normalized.includes("life path")) return "life-path";
  if (normalized.includes("birth")) return "birth";
  if (normalized.includes("name")) return "name";
  if (normalized.includes("lucky")) return "lucky";
  if (normalized.includes("avoid")) return "avoid";
  return "default";
}

function HarmonyTab({ user }) {
  const [partner, setPartner] = useState({ name: "", birthDate: "" });
  const [result, setResult] = useState(null);
  const hasHeartSignal = Boolean(result && result.score > 70);

  function updateField(field, value) {
    setPartner((current) => ({ ...current, [field]: value }));
  }

  function runCompatibility(event) {
    event.preventDefault();
    if (!partner.name.trim() || !partner.birthDate) return;
    setResult(generateCompatibility(user, partner));
  }

  return (
    <section className="tab-section harmony-section">
      <p className="eyebrow">Harmony</p>
      <h2>Love Guru</h2>

      <div className="harmony-love-field cupid-field" aria-hidden="true">
        <img className="cupid-scene-image" src="/assets/harmony-cupid.jpeg" alt="" />
        <span className="cupid-scene-glow" />
        <span className="heart-arrow heart-arrow-one">
          <Heart size={18} aria-hidden="true" />
        </span>
        <span className="heart-arrow heart-arrow-two">
          <Heart size={14} aria-hidden="true" />
        </span>
        <span className="heart-arrow heart-arrow-three">
          <Heart size={12} aria-hidden="true" />
        </span>
      </div>

      <form className="compat-form" onSubmit={runCompatibility}>
        <InputField label="Partner name" value={partner.name} onChange={(value) => updateField("name", value)} />
        <InputField label="Partner birth date" type="date" value={partner.birthDate} onChange={(value) => updateField("birthDate", value)} />
        <button className="primary-action" type="submit" disabled={!partner.name.trim() || !partner.birthDate}>
          <Heart size={18} aria-hidden="true" />
          Check harmony
        </button>
      </form>

      {result && (
        <article className={hasHeartSignal ? "compat-result compat-result-high" : "compat-result"}>
          <div className="compat-score-wrap">
            {hasHeartSignal && (
              <div className="heart-indicator" aria-label="Strong heart signal">
                <Heart size={15} aria-hidden="true" />
                <span>Heart signal</span>
              </div>
            )}
            <div className="score-ring" style={{ "--score": `${result.score}%` }}>
              <strong>{result.score}%</strong>
              <span>match</span>
            </div>
          </div>
          <div className="compat-copy">
            <h3>{result.title}</h3>
            <p>{result.summary}</p>
          </div>
          <div className="compat-details">
            {result.details.map((detail) => (
              <p key={detail.label}><strong>{detail.label}</strong> {detail.text}</p>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

function SettingsDrawer({ user, onClose, onLogout }) {
  const [secureSession, setSecureSession] = useState({
    configured: isClerkAuthConfigured(),
    loading: isClerkAuthConfigured(),
    signedIn: false,
    label: "",
    status: ""
  });
  const [backendStatus, setBackendStatus] = useState(() => getInitialBackendStatus());

  useEffect(() => {
    if (!secureSession.configured) return undefined;

    let cancelled = false;
    refreshSecureSession();

    async function refreshSecureSession() {
      const snapshot = await getClerkSessionSnapshot();
      if (cancelled) return;
      setSecureSession({
        configured: snapshot.configured,
        loading: false,
        signedIn: snapshot.signedIn,
        label: snapshot.email || snapshot.phone || snapshot.userId || "",
        status: snapshot.signedIn ? "Connected" : "Not connected"
      });
    }

    return () => {
      cancelled = true;
    };
  }, [secureSession.configured]);

  useEffect(() => {
    let cancelled = false;
    if (!API_BASE_URL) return undefined;
    refreshBackendStatus({ silent: true, isCancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshBackendStatus({ silent = false, isCancelled = () => false } = {}) {
    if (!API_BASE_URL) {
      setBackendStatus(getInitialBackendStatus());
      return;
    }
    if (!silent) {
      setBackendStatus((current) => ({
        ...current,
        state: "checking",
        label: "Checking",
        detail: "Contacting the configured backend."
      }));
    }

    try {
      const healthResponse = await fetch(getApiUrl("/api/health"));
      if (!healthResponse.ok) {
        throw new Error(`Health check returned ${healthResponse.status}.`);
      }
      const readinessResponse = await fetch(getApiUrl("/api/readiness"));
      const readiness = await readinessResponse.json().catch(() => null);
      if (isCancelled()) return;
      const providerSummary = readiness?.providerSummary;
      const providerLine = providerSummary
        ? `${providerSummary.ready}/${providerSummary.total} providers ready`
        : "Provider summary unavailable";

      if (readiness?.ok) {
        setBackendStatus({
          state: "ready",
          label: "Ready",
          detail: providerLine,
          target: getBackendTargetLabel()
        });
        return;
      }

      setBackendStatus({
        state: "needs-setup",
        label: "Needs setup",
        detail: `${readiness?.status || "not ready"}; ${providerLine}`,
        target: getBackendTargetLabel()
      });
    } catch (error) {
      if (isCancelled()) return;
      setBackendStatus({
        state: "offline",
        label: "Unreachable",
        detail: error.message || "Backend could not be reached.",
        target: getBackendTargetLabel()
      });
    }
  }

  async function handleSecureSignIn() {
    setSecureSession((current) => ({ ...current, loading: true, status: "Opening" }));
    const opened = await openClerkSignIn();
    const snapshot = await getClerkSessionSnapshot();
    setSecureSession({
      configured: snapshot.configured,
      loading: false,
      signedIn: snapshot.signedIn,
      label: snapshot.email || snapshot.phone || snapshot.userId || "",
      status: opened ? (snapshot.signedIn ? "Connected" : "Pending") : "Unavailable"
    });
  }

  async function handleSecureAccount() {
    const opened = await openClerkUserProfile();
    if (!opened) {
      setSecureSession((current) => ({ ...current, status: "Connected" }));
    }
  }

  async function handleSecureSignOut() {
    setSecureSession((current) => ({ ...current, loading: true, status: "Signing out" }));
    await signOutClerk();
    setSecureSession((current) => ({
      ...current,
      loading: false,
      signedIn: false,
      label: "",
      status: "Not connected"
    }));
  }

  return (
    <div className="settings-layer">
      <button className="settings-scrim" type="button" onClick={onClose} aria-label="Close settings" />
      <aside className="settings-drawer">
        <header>
          <div>
            <p className="eyebrow">Settings</p>
            <h2>{user.name}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <dl className="detail-list">
          <div><dt>Phone</dt><dd>{maskPhone(user.phone)}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Birth date</dt><dd>{formatDate(user.birthDate)}</dd></div>
          <div><dt>Birth time</dt><dd>{user.birthTime}</dd></div>
          <div><dt>Birth place</dt><dd>{user.birthPlace}</dd></div>
          <div><dt>Astro Solves</dt><dd>{(user.solvedProblems || []).length}/{getAstroQuestionAllowance(user)} used</dd></div>
          <div><dt>More Guidance</dt><dd>{user.soulGuruSubscription?.active ? "Soul Guru + Astro Solve" : "Not active"}</dd></div>
        </dl>
        <section className={`backend-status-panel ${backendStatus.state}`}>
          <div>
            <p className="eyebrow">Backend</p>
            <strong>{backendStatus.label}</strong>
            <span>{backendStatus.detail}</span>
            {backendStatus.target && <span>{backendStatus.target}</span>}
          </div>
          {API_BASE_URL && (
            <button className="secondary-action small" type="button" onClick={() => refreshBackendStatus()} disabled={backendStatus.state === "checking"}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
          )}
        </section>
        {secureSession.configured && (
          <section className="secure-session-panel">
            <div>
              <p className="eyebrow">Secure session</p>
              <strong>{secureSession.loading ? "Checking" : secureSession.status}</strong>
              {secureSession.label && <span>{secureSession.label}</span>}
            </div>
            <div className="secure-session-actions">
              {secureSession.signedIn ? (
                <>
                  <button className="secondary-action small" type="button" onClick={handleSecureAccount}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    Account
                  </button>
                  <button className="secondary-action small" type="button" onClick={handleSecureSignOut} disabled={secureSession.loading}>
                    <LogOut size={16} aria-hidden="true" />
                    Disconnect
                  </button>
                </>
              ) : (
                <button className="primary-action small" type="button" onClick={handleSecureSignIn} disabled={secureSession.loading}>
                  <LogIn size={16} aria-hidden="true" />
                  Sign in
                </button>
              )}
            </div>
          </section>
        )}
        <button className="secondary-action" type="button" onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </aside>
    </div>
  );
}

function getInitialBackendStatus() {
  if (!API_BASE_URL) {
    return {
      state: "local",
      label: "Local preview",
      detail: "No API base URL is bundled in this build.",
      target: ""
    };
  }
  return {
    state: "checking",
    label: "Checking",
    detail: "Contacting the configured backend.",
    target: getBackendTargetLabel()
  };
}

function getBackendTargetLabel() {
  if (!API_BASE_URL) return "";
  try {
    const url = new URL(API_BASE_URL);
    return url.host;
  } catch {
    return API_BASE_URL;
  }
}

function readAccounts() {
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNT_DB_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAccount(account) {
  const enrichedAccount = enrichUserWithPlace(account);
  if (!LOCAL_AUTH_FALLBACK_ENABLED) {
    return enrichedAccount;
  }
  const accounts = readAccounts();
  accounts[enrichedAccount.phone] = enrichedAccount;
  window.localStorage.setItem(ACCOUNT_DB_KEY, JSON.stringify(accounts));
  return enrichedAccount;
}

async function lookupAccountFromServer(phone) {
  try {
    const response = await authFetch(getApiUrl("/api/user-profile"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "lookup",
        phone: normalizePhone(phone)
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.profile) return null;
    return profileToAccount(data.profile);
  } catch {
    return null;
  }
}

async function requestOtpFromServer({ phone, email, purpose }) {
  try {
    const response = await authFetch(getApiUrl("/api/auth-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request",
        phone: normalizePhone(phone),
        email,
        purpose
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Unable to send OTP.");
    }
    const serverBacked = Boolean(data.configured && data.challengeId);
    const fallbackCode = LOCAL_AUTH_FALLBACK_ENABLED
      ? data.demoCode || (!data.configured ? createOtp() : "")
      : "";

    if (!serverBacked && !fallbackCode) {
      throw new Error("OTP login is not configured for this build. Please try again later.");
    }

    return {
      challengeId: data.challengeId || null,
      serverBacked,
      expiresAt: data.expiresAt || null,
      delivery: data.delivery || {},
      code: fallbackCode
    };
  } catch (error) {
    if (!LOCAL_AUTH_FALLBACK_ENABLED) {
      if (error.message && error.message !== "Failed to fetch") {
        throw error;
      }
      throw new Error("Unable to reach OTP service. Please try again shortly.");
    }

    return {
      challengeId: null,
      serverBacked: false,
      expiresAt: null,
      delivery: { channel: "local-demo", sent: false },
      code: createOtp()
    };
  }
}

async function verifyOtpWithServer(pendingOtp, code) {
  const cleanedCode = String(code || "").replace(/\D/g, "");
  if (!pendingOtp.serverBacked) {
    return cleanedCode === String(pendingOtp.code || "");
  }

  const response = await authFetch(getApiUrl("/api/auth-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "verify",
      challengeId: pendingOtp.challengeId,
      phone: pendingOtp.phone,
      code: cleanedCode
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "OTP did not match.");
  }
  return Boolean(data.verified);
}

function buildLoginMeta(pendingOtp, flow) {
  const serverBacked = Boolean(pendingOtp?.serverBacked);
  return {
    flow,
    serverBacked,
    method: serverBacked ? "backend_otp" : "local_demo_otp"
  };
}

async function syncUserProfileToServer(account) {
  if (!account?.phone || !account?.birthDate) return null;
  try {
    const response = await authFetch(getApiUrl("/api/user-profile"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert",
        user: buildProfileUserPayload(account)
      })
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? data.profile : null;
  } catch {
    return null;
  }
}

async function verifyRazorpayPayment({ user, order, payment }) {
  const response = await authFetch(getApiUrl("/api/verify-razorpay-payment"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email
      },
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency || "INR",
      orderToken: order.orderToken,
      paymentId: payment.razorpay_payment_id,
      signature: payment.razorpay_signature
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.verified) {
    throw new Error(data.error || "Payment signature could not be verified.");
  }
  if (!data.stored && !LOCAL_PAID_FALLBACK_ENABLED) {
    throw new Error("Payment verified, but the subscription was not stored. Please contact support.");
  }
  return data;
}

async function verifyShaniPayment({ user, order, payment }) {
  const response = await authFetch(getApiUrl("/api/verify-shani-payment"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: buildPaymentUserPayload(user, { includeBirth: true }),
      planId: order.planId,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency || "INR",
      orderToken: order.orderToken,
      paymentId: payment.razorpay_payment_id,
      signature: payment.razorpay_signature
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.verified) {
    throw new Error(data.error || "Shani payment signature could not be verified.");
  }
  if (!data.stored && !LOCAL_PAID_FALLBACK_ENABLED) {
    throw new Error("Payment verified, but the Shani membership was not stored. Please contact support.");
  }
  return data;
}

function buildPaymentUserPayload(user, { includeBirth = false } = {}) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    ...(includeBirth ? {
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      birthPlace: user.birthPlace,
      birthLatitude: user.birthLatitude,
      birthLongitude: user.birthLongitude,
      birthTimezone: user.birthTimezone,
      birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
      birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
      birthPlaceResolutionSource: user.birthPlaceResolutionSource,
      vedicMoonSignOverride: user.vedicMoonSignOverride
    } : {})
  };
}

function buildProfileUserPayload(account) {
  return {
    id: account.id,
    authUserId: account.authUserId,
    name: account.name,
    phone: account.phone,
    email: account.email,
    birthDate: account.birthDate,
    birthTime: account.birthTime,
    birthPlace: account.birthPlace,
    birthLatitude: account.birthLatitude,
    birthLongitude: account.birthLongitude,
    birthTimezone: account.birthTimezone,
    birthTimezoneOffsetMinutes: account.birthTimezoneOffsetMinutes,
    birthPlaceResolvedLabel: account.birthPlaceResolvedLabel,
    birthPlaceResolutionSource: account.birthPlaceResolutionSource,
    vedicMoonSignOverride: account.vedicMoonSignOverride
  };
}

function profileToAccount(profile) {
  return mergeAccountProfile({
    id: profile.authUserId || profile.id || `profile-${Date.now()}`,
    phone: profile.phone,
    solvedProblems: [],
    memberPlan: "",
    guidanceHistory: [],
    savedGuidance: []
  }, profile);
}

function mergeAccountProfile(account, profile) {
  if (!profile) return account;
  const phone = normalizePhone(profile.phone || account.phone);
  return {
    ...account,
    id: account.id || profile.authUserId || profile.id,
    profileId: profile.profileId || profile.id || account.profileId,
    authUserId: profile.authUserId || account.authUserId || null,
    name: profile.name || account.name || "SoulGuru user",
    phone,
    email: profile.email || account.email || "",
    birthDate: profile.birthDate || account.birthDate || "",
    birthTime: profile.birthTime || account.birthTime || "",
    birthPlace: profile.birthPlace || account.birthPlace || "",
    birthLatitude: profile.birthLatitude ?? account.birthLatitude ?? null,
    birthLongitude: profile.birthLongitude ?? account.birthLongitude ?? null,
    birthTimezone: profile.birthTimezone || account.birthTimezone || "",
    birthTimezoneOffsetMinutes: profile.birthTimezoneOffsetMinutes ?? account.birthTimezoneOffsetMinutes ?? null,
    birthPlaceResolvedLabel: profile.birthPlaceResolvedLabel || account.birthPlaceResolvedLabel || "",
    birthPlaceResolutionSource: profile.birthPlaceResolutionSource || account.birthPlaceResolutionSource || "",
    vedicMoonSignOverride: profile.vedicMoonSignOverride || account.vedicMoonSignOverride || "",
    syncedAt: profile.updatedAt || new Date().toISOString()
  };
}

function hasProfileChanged(previous, next) {
  if (!previous) return true;
  return ["id", "authUserId", "name", "phone", "email", "birthDate", "birthTime", "birthPlace", "birthLatitude", "birthLongitude", "birthTimezone", "birthTimezoneOffsetMinutes"]
    .some((field) => previous?.[field] !== next?.[field]);
}

function getSessionUser() {
  if (!LOCAL_AUTH_FALLBACK_ENABLED) return null;
  const phone = window.localStorage.getItem(SESSION_KEY);
  if (!phone) return null;
  return readAccounts()[phone] || null;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

function isValidPhone(phone) {
  return phone.replace(/\D/g, "").length >= 8;
}

function maskPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  return `${phone.slice(0, Math.max(0, phone.length - 4)).replace(/\d/g, "*")}${digits.slice(-4)}`;
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function getApiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function buildDailyReadingPayload(user, todayKey, fallbackReading) {
  const todayDate = buildDateFromKey(todayKey, user);
  const context = buildAstrologyContext(user, todayDate);
  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      birthPlace: user.birthPlace,
      birthLatitude: user.birthLatitude,
      birthLongitude: user.birthLongitude,
      birthTimezone: user.birthTimezone,
      birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
      birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
      birthPlaceResolutionSource: user.birthPlaceResolutionSource
    },
    date: todayKey,
    timezone: user.birthTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    context,
    today: todayDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }),
    fallback: fallbackReading
  };
}

function requestDailyReadingFromServer(user, todayKey, payload) {
  const requestKey = `${getSoulReadingUserKey(user)}.${todayKey}`;
  if (SOUL_READING_REQUESTS.has(requestKey)) {
    return SOUL_READING_REQUESTS.get(requestKey);
  }

  const request = authFetch(getApiUrl("/api/soul-wisdom"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(async (response) => {
      const data = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, data };
    })
    .finally(() => {
      SOUL_READING_REQUESTS.delete(requestKey);
    });

  SOUL_READING_REQUESTS.set(requestKey, request);
  return request;
}

async function openRazorpayCheckout({ order, user, description = "Soul Guru + Astro Solve", notes = {}, onSuccess, onFailure }) {
  await loadRazorpayCheckout();
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout could not be loaded.");
  }

  const checkout = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency || "INR",
    name: "SoulGuru",
    description,
    order_id: order.orderId,
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone
    },
    notes: {
      soulguru_plan: "more_guidance_3m",
      user_key: order.userKey,
      ...notes
    },
    theme: {
      color: "#176b73"
    },
    handler: onSuccess,
    modal: {
      ondismiss() {
        onFailure("Checkout closed before payment was completed.");
      }
    }
  });

  checkout.on("payment.failed", (response) => {
    onFailure(response?.error?.description || "Payment failed.");
  });
  checkout.open();
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay checkout failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Razorpay checkout failed to load."));
    document.head.appendChild(script);
  });
}

function getTodayKey(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function buildDateFromKey(dateKey, user = {}) {
  return buildTransitDateForUser(user, dateKey);
}

function getSoulReadingUserKey(user) {
  return stableHash([
    user.id,
    user.phone,
    user.email,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    user.birthLatitude,
    user.birthLongitude,
    user.birthTimezone,
    user.birthTimezoneOffsetMinutes,
    user.birthPlaceResolvedLabel,
    user.birthPlaceResolutionSource
  ].filter((value) => value !== undefined && value !== null && value !== "").join("|")).toString(36);
}

function getDailyReadingCacheKey(user, dateKey) {
  return `${SOUL_READING_CACHE_PREFIX}.${getSoulReadingUserKey(user)}.${dateKey}`;
}

function getReadingHistoryKey(user) {
  return `${SOUL_READING_HISTORY_PREFIX}.${getSoulReadingUserKey(user)}`;
}

function readDailyReadingCache(user, dateKey) {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(getDailyReadingCacheKey(user, dateKey)) || "null");
    if (cached?.dateKey !== dateKey || cached?.promptVersion !== SOUL_READING_CACHE_VERSION || !cached?.reading) {
      return null;
    }
    if (!LOCAL_READING_FALLBACK_ENABLED && (cached.stored === false || cached.source === "local-fallback")) {
      return null;
    }
    return {
      ...cached,
      reading: normalizeWisdomPayload(cached.reading, getDailyWisdom(user, dateKey))
    };
  } catch {
    return null;
  }
}

function writeDailyReadingCache(user, dateKey, reading, meta = {}) {
  if (typeof window === "undefined") return;
  const record = {
    id: `reading-${dateKey}`,
    dateKey,
    date: new Date().toISOString(),
    promptVersion: SOUL_READING_CACHE_VERSION,
    reading,
    ...meta
  };

  try {
    window.localStorage.setItem(getDailyReadingCacheKey(user, dateKey), JSON.stringify(record));
    const history = [
      record,
      ...readGuidanceHistoryRaw(user).filter((item) => item.dateKey !== dateKey)
    ].slice(0, 90);
    window.localStorage.setItem(getReadingHistoryKey(user), JSON.stringify(history));
  } catch {
    // Storage can fail in private browsing. The app still has the in-memory reading.
  }
}

async function saveGuidanceToServer(user, reading, sourceId) {
  const response = await authFetch(getApiUrl("/api/more-guidance"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save-guidance",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        birthDate: user.birthDate,
        birthTime: user.birthTime,
        birthPlace: user.birthPlace,
        birthLatitude: user.birthLatitude,
        birthLongitude: user.birthLongitude,
        birthTimezone: user.birthTimezone,
        birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
        birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
        birthPlaceResolutionSource: user.birthPlaceResolutionSource
      },
      sourceId,
      reading
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Unable to save guidance.");
  }
  if (!data.saved && !LOCAL_PAID_FALLBACK_ENABLED) {
    throw new Error("Guidance was not stored. Please try again.");
  }
  return data;
}

function readGuidanceHistoryRaw(user) {
  if (typeof window === "undefined") return [];
  try {
    const history = JSON.parse(window.localStorage.getItem(getReadingHistoryKey(user)) || "[]");
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function getCachedGuidanceHistory(user) {
  const cachedHistory = readGuidanceHistoryRaw(user).map((item) => ({
    ...item,
    date: item.date || item.dateKey || new Date().toISOString(),
    reading: normalizeWisdomPayload(item.reading, getDailyWisdom(user, item.dateKey || getTodayKey()))
  }));
  const legacyHistory = user.guidanceHistory || [];
  const seen = new Set(cachedHistory.map((item) => item.id || item.dateKey));
  return [
    ...cachedHistory,
    ...legacyHistory.filter((item) => !seen.has(item.id || item.date))
  ].slice(0, 90);
}

function mergeGuidanceItems(primary, fallback) {
  const seen = new Set();
  return [...primary, ...fallback].filter((item) => {
    const key = item.id || item.dateKey || item.date || item.reading?.wisdom || item.wisdom;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 90);
}

function buildLocalSubscriptionTracking(subscription) {
  if (!subscription?.active) return null;
  const start = subscription.startedAt ? new Date(subscription.startedAt) : new Date();
  const end = subscription.endsAt ? new Date(subscription.endsAt) : addMonths(start, 3);
  const now = new Date();
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000)));
  const daysLeft = Math.min(totalDays, Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)));
  const progress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  const monthIndex = Math.min(3, Math.max(1, Math.floor((elapsedDays / totalDays) * 3) + 1));

  return {
    status: now.getTime() >= end.getTime() ? "complete" : "active",
    startedAt: start.toISOString(),
    endsAt: end.toISOString(),
    totalDays,
    elapsedDays,
    daysLeft,
    weeksLeft: Math.max(0, Math.ceil(daysLeft / 7)),
    progress,
    monthIndex,
    checkpoints: buildTrackingCheckpoints(progress)
  };
}

function buildTrackingCheckpoints(progress) {
  return [
    { label: "Month 1", title: "Stabilize the pattern", status: getCheckpointStatus(progress, 0, 34) },
    { label: "Month 2", title: "Practice the new response", status: getCheckpointStatus(progress, 34, 67) },
    { label: "Month 3", title: "Carry it into decisions", status: getCheckpointStatus(progress, 67, 101) }
  ];
}

function getCheckpointStatus(progress, startsAt, endsBefore) {
  if (progress >= 100) return "complete";
  if (progress >= endsBefore) return "complete";
  if (progress >= startsAt) return "current";
  return "upcoming";
}

function buildLocalDeepGuidance(user) {
  const dateKey = getTodayKey(new Date(), user.birthTimezone || undefined);
  const context = buildAstrologyContext(user, buildDateFromKey(dateKey, user));
  return buildFallbackDeepGuidance(user, context);
}

function toCue(text) {
  const cue = String(text || "").replace(/[.!?]+$/g, "").trim();
  return cue ? capitalize(cue) : "";
}

function capitalize(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getAstroQuestionAllowance(user) {
  const baseAllowance = 3;
  const bonus = user.soulGuruSubscription?.active ? user.soulGuruSubscription.astroBonusQuestions || 15 : 0;
  return baseAllowance + bonus;
}

function buildAstroSolveUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    birthPlace: user.birthPlace,
    birthLatitude: user.birthLatitude,
    birthLongitude: user.birthLongitude,
    birthTimezone: user.birthTimezone,
    birthTimezoneOffsetMinutes: user.birthTimezoneOffsetMinutes,
    birthPlaceResolvedLabel: user.birthPlaceResolvedLabel,
    birthPlaceResolutionSource: user.birthPlaceResolutionSource,
    soulGuruSubscription: user.soulGuruSubscription
  };
}

function upsertHistory(history, reading) {
  const today = new Date().toISOString().slice(0, 10);
  const item = {
    id: `history-${today}`,
    date: new Date().toISOString(),
    reading
  };
  return [item, ...history.filter((entry) => !String(entry.id || "").endsWith(today))].slice(0, 90);
}

function normalizeAstroSolveInsight(data, fallback) {
  const answer = data.answer || data;
  return {
    id: data.id || fallback.id || `problem-${Date.now()}`,
    problem: data.problem || fallback.problem,
    root: cleanInsightText(answer.root || data.root, fallback.root),
    astrology: cleanInsightText(answer.astrology || data.astrology, fallback.astrology),
    solution: cleanInsightText(answer.solution || data.solution, fallback.solution),
    source: data.source || "api",
    createdAt: data.createdAt || new Date().toISOString(),
    allowance: data.allowance
  };
}

function cleanInsightText(text, fallback) {
  return String(text || fallback || "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateProblemInsight(problem, user, index, context = buildAstrologyContext(user)) {
  return buildFallbackAstroSolveInsight(problem, user, context, index, new Date().toISOString().slice(0, 10));
}

function getSaadeSatiReport(user, now) {
  const chartReport = getSaadeSatiFromChart(user, now);
  const moonSign = chartReport.moonSign;
  const currentTransit = chartReport.saturnTransit || {
    sign: chartReport.saturnSign,
    startDate: now,
    endDate: addYears(now, 2)
  };
  const saturnSign = currentTransit.sign || chartReport.saturnSign;
  const phaseIndex = chartReport.phaseIndex;
  const shaniInfluence = chartReport.shaniInfluence || { active: false };
  const moonDescription = chartReport.moonSignSource === "verified"
    ? `Using your verified Vedic Moon sign ${moonSign}`
    : `Your calculated Moon sign is ${moonSign}`;

  if (phaseIndex) {
    const endDate = parseDate(chartReport.activeEndDate || currentTransit.endDate || addYears(now, 2));
    const phaseTitles = ["", "Rising phase", "Peak phase", "Setting phase"];
    const experiences = [
      "",
      "old pressure starts becoming visible, especially around preparation and responsibility",
      "identity, patience, and emotional maturity may feel tested more directly",
      "lessons begin closing, but discipline still decides how gently the cycle ends"
    ];
    return {
      active: true,
      phaseIndex,
      phaseTitle: phaseTitles[phaseIndex],
      moonSign,
      moonSignSource: chartReport.moonSignSource,
      computedMoonSign: chartReport.computedMoonSign,
      saturnSign,
      saturnFromMoon: chartReport.saturnFromMoon,
      secondaryActive: false,
      secondaryTitle: "",
      endDate,
      endLabel: `Estimated completion: ${formatDate(endDate)}`,
      summary: `${moonDescription}, with Saturn currently in ${saturnSign}. In this ${phaseTitles[phaseIndex].toLowerCase()}, ${experiences[phaseIndex]}. There is nothing to fear about Saade Sati. With steady remedies, practical discipline, and timely guidance, this period can pass with fewer struggles and more inner strength.`
    };
  }

  const nextStart = parseDate(chartReport.nextStartDate || currentTransit.endDate || addYears(now, 1));
  const secondaryText = shaniInfluence.active
    ? ` Saturn is also ${formatOrdinal(shaniInfluence.houseFromMoon)} from your Moon, which many Vedic traditions read as ${shaniInfluence.title}; that can still feel like pressure around ${shaniInfluence.focus}.`
    : "";
  return {
    active: false,
    phaseIndex: 0,
    phaseTitle: "Outside Saade Sati",
    moonSign,
    moonSignSource: chartReport.moonSignSource,
    computedMoonSign: chartReport.computedMoonSign,
    saturnSign,
    saturnFromMoon: chartReport.saturnFromMoon,
    secondaryActive: Boolean(shaniInfluence.active),
    secondaryTitle: shaniInfluence.active ? shaniInfluence.title : "",
    endDate: nextStart,
    endLabel: chartReport.nextStartDate ? `Next watch begins around ${formatDate(nextStart)}` : `Current Saturn window changes around ${formatDate(nextStart)}`,
    summary: `${moonDescription}, and Saturn is currently in ${saturnSign}. Saade Sati does not appear active right now.${secondaryText} Keep your routine clean, repay obligations slowly, and treat discipline as protection rather than pressure.`
  };
}

function formatOrdinal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "unknown";
  const suffix = number === 1 ? "st" : number === 2 ? "nd" : number === 3 ? "rd" : "th";
  return `${number}${suffix}`;
}

function getCountdown(endDate, now) {
  const totalMs = Math.max(0, endDate.getTime() - now.getTime());
  const totalDays = Math.floor(totalMs / 86400000);
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = (totalDays % 365) % 30;
  return { years, months, days };
}

function buildPanditReply(text, user, report) {
  return formatPanditAnswer(buildFallbackPanditAnswer({
    user,
    question: text,
    report,
    membership: {
      active: true,
      planName: "Local Shani preview"
    }
  }));
}

function buildLocalShaniRemedyMap(report, membership = {}, now = new Date()) {
  const endDate = membership.endsAt ? parseDate(membership.endsAt) : addMonths(now, 3);
  const phaseLine = report.active
    ? `Saturn in ${report.saturnSign} is pressing the ${report.phaseTitle.toLowerCase()} toward cleaner responsibility.`
    : "Saade Sati is not active now, so the work is to strengthen discipline before pressure arrives.";

  return {
    planName: membership.planName || "Local Shani preview",
    generatedAt: now.toISOString(),
    phase: {
      title: report.phaseTitle,
      summary: report.active ? "Keep duties visible, speech measured, and promises smaller than your pride." : "Use this calmer window to prepare routine, repayment, and service.",
      pressure: phaseLine
    },
    nextSevenDays: {
      focus: report.active ? "Complete one delayed duty" : "Make Saturday a reset",
      action: report.active ? "Finish the practical task you keep postponing before taking on a new promise." : "Clean one space, serve quietly, and settle one small obligation.",
      caution: "Do not use fear as discipline; let steadiness become the remedy."
    },
    nextMonth: {
      focus: "Turn pressure into structure",
      action: "Track one repeating delay for four Saturdays and close it through action, not worry.",
      marker: `Review before ${formatDate(addDays(now, 30))}.`
    },
    dailyPractices: [
      { title: "Morning duty", text: "Finish one delayed responsibility before adding a new promise." },
      { title: "Speech restraint", text: "Keep replies slower, shorter, and free of punishment." },
      { title: "Saturday seva", text: "Offer quiet service, clean one neglected space, and avoid public display." }
    ],
    renewal: {
      daysLeft: Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000)),
      endsAt: endDate.toISOString()
    }
  };
}

function formatPanditAnswer(answer) {
  if (typeof answer === "string") return answer;
  return [
    answer?.text,
    answer?.practice ? `Practice: ${answer.practice}` : "",
    answer?.caution ? `Caution: ${answer.caution}` : ""
  ].filter(Boolean).join(" ");
}

function parseDate(value) {
  if (value instanceof Date) return value;
  const text = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T12:00:00`);
  }
  return new Date(text);
}

function formatDate(value) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "Today";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function mod(value, length) {
  return ((value % length) + length) % length;
}

createRoot(document.getElementById("root")).render(<App />);
