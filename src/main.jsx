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
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X
} from "lucide-react";
import "./styles.css";
import { authFetch } from "./authClient.js";
import { buildAstrologyContext, buildTransitDateForUser, getSaadeSatiFromChart } from "./astrologyEngine.js";
import { generateCompatibility } from "./compatibility.js";
import { getDailyFocus, getDailyWisdom } from "./localSoulWisdom.js";
import { clearObservedUser, identifyUser, initializeObservability, trackEvent } from "./observability.js";
import { enrichUserWithPlace } from "./placeResolver.js";
import { firstName, normalizeWisdomPayload } from "./soulGuruPrompt.js";

const ACCOUNT_DB_KEY = "soulguru.accounts.v1";
const SESSION_KEY = "soulguru.session.v1";
const SOUL_READING_CACHE_VERSION = "soul-wisdom-v6";
const SOUL_READING_CACHE_PREFIX = "soulguru.dailySoulReading.v6";
const SOUL_READING_HISTORY_PREFIX = "soulguru.dailySoulReadingHistory.v6";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const LOCAL_AUTH_FALLBACK_ENABLED = import.meta.env.VITE_LOCAL_AUTH_FALLBACK === "true" || import.meta.env.MODE !== "production";
const LOCAL_PAID_FALLBACK_ENABLED = import.meta.env.VITE_LOCAL_PAID_FALLBACK === "true" || import.meta.env.MODE !== "production";
const DEMO_PAYMENTS_ENABLED = import.meta.env.VITE_DEMO_PAYMENTS === "true" || import.meta.env.MODE !== "production";

initializeObservability();

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
    if (splashDone && user) {
      trackEvent("tab_viewed", { tab: activeTab });
    }
  }, [activeTab, splashDone, user]);

  function handleLogin(account) {
    const enrichedAccount = saveAccount(account);
    window.localStorage.setItem(SESSION_KEY, enrichedAccount.phone);
    setUser(enrichedAccount);
    setActiveTab("soul");
    syncUserProfileToServer(enrichedAccount).then((profile) => {
      if (!profile) return;
      const syncedAccount = mergeAccountProfile(enrichedAccount, profile);
      saveAccount(syncedAccount);
      setUser((current) => current?.phone === syncedAccount.phone ? mergeAccountProfile(current, profile) : current);
    });
    trackEvent("login_completed", { mode: "otp_demo" });
  }

  function updateUser(updater) {
    setUser((current) => {
      const nextRaw = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      const next = saveAccount(nextRaw);
      window.localStorage.setItem(SESSION_KEY, next.phone);
      if (hasProfileChanged(current, next)) {
        syncUserProfileToServer(next);
      }
      return next;
    });
  }

  function handleLogout() {
    window.localStorage.removeItem(SESSION_KEY);
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
      <div className="splash-water" aria-hidden="true" />
      <div className="splash-content">
        <p className="splash-kicker">welcome to</p>
        <h1>Soul Guru</h1>
        <p className="splash-subtitle">guardian angel for you</p>
      </div>
      <button className="icon-text splash-skip" type="button" onClick={onSkip}>
        Enter
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
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
        onLogin(account);
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
        onLogin(mergeAccountProfile(account, profile));
        return;
      }

      onLogin(account);
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
            <button className="primary-action" type="button" onClick={verifyOtp} disabled={isVerifyingOtp}>
              <ShieldCheck size={18} aria-hidden="true" />
              {isVerifyingOtp ? "Verifying" : "Verify and enter"}
            </button>
          </div>
        ) : (
          <button className="primary-action" type="button" onClick={sendOtp} disabled={isSendingOtp}>
            <Send size={18} aria-hidden="true" />
            {isSendingOtp ? "Checking account" : "Send OTP"}
          </button>
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
  const CurrentIcon = TABS.find((tab) => tab.id === activeTab)?.Icon || Sparkles;
  const activeLabel = activeTab === "subscription" ? "More Guidance" : TABS.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="app-page">
      <div className="phone-shell">
        <header className="app-header">
          <div className="header-title">
            <CurrentIcon size={18} aria-hidden="true" />
            <span>{activeLabel}</span>
          </div>
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
  const [reading, setReading] = useState(fallbackReading);
  const [isSavingAdvice, setIsSavingAdvice] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const focus = useMemo(() => getDailyFocus(user), [user]);

  useEffect(() => {
    let cancelled = false;
    const todayDate = buildDateFromKey(todayKey, user);
    const context = buildAstrologyContext(user, todayDate);
    const cached = readDailyReadingCache(user, todayKey);

    if (cached?.reading) {
      setReading(cached.reading);
      return () => {
        cancelled = true;
      };
    }

    setReading(fallbackReading);

    authFetch(getApiUrl("/api/soul-wisdom"), {
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
      })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && (data?.reading || data?.wisdom)) {
          const nextReading = normalizeWisdomPayload(data.reading || data.wisdom, fallbackReading);
          setReading(nextReading);
          writeDailyReadingCache(user, todayKey, nextReading, {
            cached: Boolean(data.cached),
            model: data.model,
            source: data.source || "api"
          });
        }
      })
      .catch(() => {
        if (!cancelled) setReading(fallbackReading);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackReading, todayKey, user]);

  async function saveAdvice() {
    if (isSavingAdvice) return;

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

  return (
    <section className="tab-section soul-section">
      <p className="eyebrow">Soul Guru</p>
      <h2>Words of Wisdom</h2>
      <article className="wisdom-panel">
        <p>{reading.wisdom}</p>
      </article>
      <div className="wisdom-cues" aria-label="Today's guidance cues">
        <div>
          <span>Inner weather</span>
          <strong>{reading.innerWeather}</strong>
        </div>
        <div>
          <span>Move</span>
          <strong>{reading.todayMove}</strong>
        </div>
        <div>
          <span>Release</span>
          <strong>{reading.release}</strong>
        </div>
      </div>
      <div className="daily-focus">
        {focus.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="guidance-actions">
        <button className="secondary-action calm-action" type="button" onClick={saveAdvice} disabled={isSavingAdvice}>
          <BadgeCheck size={18} aria-hidden="true" />
          {isSavingAdvice ? "Saving" : "Save Advice"}
        </button>
        <button className="primary-action guidance-action" type="button" onClick={onMoreGuidance}>
          <Crown size={18} aria-hidden="true" />
          More Guidance
        </button>
      </div>
      {saveStatus && <p className="checkout-note">{saveStatus}</p>}
    </section>
  );
}

function AstroSolvesTab({ user, updateUser }) {
  const [problem, setProblem] = useState("");
  const [selectedSections, setSelectedSections] = useState({});
  const [isSolving, setIsSolving] = useState(false);
  const [solveStatus, setSolveStatus] = useState("");
  const solvedProblems = user.solvedProblems || [];
  const allowance = getAstroQuestionAllowance(user);
  const remaining = Math.max(0, allowance - solvedProblems.length);

  async function submitProblem(event) {
    event.preventDefault();
    const question = problem.trim();
    if (!question || remaining <= 0 || isSolving) return;

    setIsSolving(true);
    setSolveStatus("Reading the chart pattern...");
    trackEvent("astro_solve_started", { has_more_guidance: Boolean(user.soulGuruSubscription?.active) });

    try {
      const context = buildAstrologyContext(user);
      const fallback = generateProblemInsight(question, user, solvedProblems.length);
      const response = await authFetch(getApiUrl("/api/astro-solve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          priorCount: solvedProblems.length,
          subscription: user.soulGuruSubscription,
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
            soulGuruSubscription: user.soulGuruSubscription
          },
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
      setSelectedSections((current) => ({ ...current, [insight.id]: "solution" }));
      setProblem("");
      setSolveStatus(response.ok ? "Analysis created." : "Using local fallback until the backend is connected.");
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
      setSelectedSections((current) => ({ ...current, [fallback.id]: "solution" }));
      setProblem("");
      setSolveStatus("Using local fallback until the backend is connected.");
      trackEvent("astro_solve_completed", { source: "local-fallback" });
    } finally {
      setIsSolving(false);
    }
  }

  return (
    <section className="tab-section">
      <p className="eyebrow">Astro Solves</p>
      <h2>Solution for everything</h2>

      <form className="problem-form" onSubmit={submitProblem}>
        <label className="problem-input">
          <span>Share your problem</span>
          <textarea
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
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
      {solveStatus && <p className="checkout-note">{solveStatus}</p>}

      {remaining === 0 && (
        <div className="locked-note">
          <LockKeyhole size={18} aria-hidden="true" />
          <span>Your current detailed analysis allowance is complete. More Guidance can continue from here.</span>
        </div>
      )}

      <div className="solution-list">
        {solvedProblems.map((item) => {
          const selected = selectedSections[item.id] || "root";
          return (
            <article className="solution-card" key={item.id}>
              <p className="problem-quote">{item.problem}</p>
              {item.source && <span className="solution-source">{item.source === "local-fallback" ? "Local fallback" : "AI analysis"}</span>}
              <div className="mini-tabs" role="tablist" aria-label="Analysis sections">
                {[
                  ["root", "Root"],
                  ["astrology", "Astrology"],
                  ["solution", "Solution"]
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={selected === id ? "active" : ""}
                    onClick={() => setSelectedSections((current) => ({ ...current, [item.id]: id }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="solution-copy">{item[selected]}</p>
            </article>
          );
        })}
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
  const [isActivating, setIsActivating] = useState(false);
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
    const dateKey = getTodayKey(new Date(), user.birthTimezone || undefined);
    const context = buildAstrologyContext(user, buildDateFromKey(dateKey, user));
    setDeepGuidanceStatus("Preparing deeper guidance...");

    authFetch(getApiUrl("/api/more-guidance"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      })
    })
      .then((response) => response.json().then((data) => ({ ok: response.ok, status: response.status, data })).catch(() => ({ ok: false, status: response.status, data: null })))
      .then(({ ok, status, data }) => {
        if (cancelled) return;
        if (ok && data?.guidance && (data.stored !== false || LOCAL_PAID_FALLBACK_ENABLED)) {
          setDeepGuidance(data.guidance);
          setDeepGuidanceStatus(data.cached ? "Deeper guidance synced." : "Deeper guidance ready.");
          return;
        }
        if (ok && data?.guidance && data.stored === false) {
          setDeepGuidance(null);
          setDeepGuidanceStatus("Deeper guidance could not be saved. Please try again shortly.");
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

    return () => {
      cancelled = true;
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
      {checkoutStatus && <p className="checkout-note">{checkoutStatus}</p>}
      {dashboardStatus && <p className="checkout-note">{dashboardStatus}</p>}

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
            {deepGuidanceStatus && <p className="deep-guidance-status">{deepGuidanceStatus}</p>}
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
              </>
            ) : (
              <p>Your deeper guidance will appear here after the paid backend sync completes.</p>
            )}
            <p><strong>Astro Solves:</strong> your plan includes 15 extra detailed questions for specific life situations.</p>
          </article>

          <div className="guidance-lists">
            <GuidanceList title="Reading history" items={guidanceHistory} empty="Your daily readings will collect here." />
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
              <p>{item.reading?.wisdom || item.wisdom}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ShaniTab({ user, updateUser }) {
  const [now, setNow] = useState(() => new Date());
  const [chatOpen, setChatOpen] = useState(false);
  const [planStatus, setPlanStatus] = useState("");
  const report = useMemo(() => getSaadeSatiReport(user, now), [user, now]);
  const countdown = useMemo(() => getCountdown(report.endDate, now), [report.endDate, now]);
  const effectiveMemberPlanId = LOCAL_PAID_FALLBACK_ENABLED ? user.memberPlan : "";
  const memberPlan = MEMBERSHIP_PLANS.find((plan) => plan.id === effectiveMemberPlanId);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  function selectPlan(planId) {
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

      <div className="status-panel">
        <div>
          <span className={report.active ? "status-pill active" : "status-pill"}>{report.active ? "Active" : "Not active"}</span>
          <h3>{report.phaseTitle}</h3>
          <p>{report.summary}</p>
        </div>
      </div>

      <div className="countdown-panel">
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

      <div className="phase-rail" aria-label="Saade Sati phases">
        {["Rising", "Peak", "Setting"].map((phase, index) => (
          <div key={phase} className={report.phaseIndex === index + 1 ? "active" : ""}>
            <span>{phase}</span>
          </div>
        ))}
      </div>

      <div className="membership-block">
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
              onClick={() => selectPlan(plan.id)}
            >
              <strong>{plan.name}</strong>
              <span>{plan.price}</span>
            </button>
          ))}
        </div>
        {planStatus && <p className="checkout-note">{planStatus}</p>}
      </div>

      {memberPlan && (
        <button className="pandit-fab" type="button" onClick={() => setChatOpen(true)} aria-label="Open Pandit chat">
          <MessageCircle size={22} aria-hidden="true" />
        </button>
      )}

      {chatOpen && <PanditChat user={user} report={report} onClose={() => setChatOpen(false)} />}
    </section>
  );
}

function PanditChat({ user, report, onClose }) {
  const [messages, setMessages] = useState([
    {
      from: "pandit",
      text: `Namaste ${firstName(user.name)}. Your ${report.phaseTitle.toLowerCase()} needs patience, clean routine, and steady remedies. Ask what is weighing on you.`
    }
  ]);
  const [draft, setDraft] = useState("");

  function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { from: "user", text },
      { from: "pandit", text: buildPanditReply(text, user, report) }
    ]);
    setDraft("");
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
      </div>
      <form className="chat-form" onSubmit={sendMessage}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about your remedy" />
        <button className="icon-button filled" type="submit" aria-label="Send message">
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function NumbersTab({ user }) {
  const numbers = useMemo(() => getNumbers(user), [user]);

  return (
    <section className="tab-section numbers-section">
      <p className="eyebrow">#Numbers</p>
      <h2>Numbers that Build Life</h2>
      <div className="number-grid">
        {numbers.map((item) => (
          <article key={item.label} className="number-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HarmonyTab({ user }) {
  const [partner, setPartner] = useState({ name: "", birthDate: "" });
  const [result, setResult] = useState(null);

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

      <form className="compat-form" onSubmit={runCompatibility}>
        <InputField label="Partner name" value={partner.name} onChange={(value) => updateField("name", value)} />
        <InputField label="Partner birth date" type="date" value={partner.birthDate} onChange={(value) => updateField("birthDate", value)} />
        <button className="primary-action" type="submit" disabled={!partner.name.trim() || !partner.birthDate}>
          <Heart size={18} aria-hidden="true" />
          Check harmony
        </button>
      </form>

      {result && (
        <article className="compat-result">
          <div className="score-ring" style={{ "--score": `${result.score}%` }}>
            <strong>{result.score}%</strong>
            <span>match</span>
          </div>
          <div>
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
        <button className="secondary-action" type="button" onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </aside>
    </div>
  );
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
    if (error.message && error.message !== "Failed to fetch") {
      throw error;
    }

    if (!LOCAL_AUTH_FALLBACK_ENABLED) {
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
    birthPlaceResolutionSource: account.birthPlaceResolutionSource
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
    syncedAt: profile.updatedAt || new Date().toISOString()
  };
}

function hasProfileChanged(previous, next) {
  if (!previous) return true;
  return ["id", "authUserId", "name", "phone", "email", "birthDate", "birthTime", "birthPlace", "birthLatitude", "birthLongitude", "birthTimezone", "birthTimezoneOffsetMinutes"]
    .some((field) => previous?.[field] !== next?.[field]);
}

function getSessionUser() {
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

async function openRazorpayCheckout({ order, user, onSuccess, onFailure }) {
  await loadRazorpayCheckout();
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout could not be loaded.");
  }

  const checkout = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency || "INR",
    name: "SoulGuru",
    description: "Soul Guru + Astro Solve",
    order_id: order.orderId,
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone
    },
    notes: {
      soulguru_plan: "more_guidance_3m",
      user_key: order.userKey
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
  const name = firstName(user.name);
  return {
    overview: `${name}, the deeper pattern right now is about giving ${context.dailyArea} a cleaner shape before it turns into pressure. ${capitalize(context.attentionAnchor || context.dailyScene)} deserves a direct action, not another private debate. Let ${context.mentorMove || context.stabilizer} become the rule for the next few days. In relationships, ${context.relationalCaution || context.relationshipMirror}; in work, ${context.workSignal}. This is how guidance becomes real: one repeatable rhythm, one honest limit, and one task finished before the mood gets to rename the whole day.`,
    thisWeek: `This week, start with ${context.bodySignal}, then protect the practical task that has enough information already. Keep replies shorter than the worry around them, and let one completed action restore trust in your timing.`,
    thisMonth: `This month, save the readings that repeat a theme. If the same pressure appears through different people or duties, treat it as a pattern asking for structure instead of a problem asking for panic.`,
    practice: `For seven days, write one evening line: what became lighter because I handled it directly? Let that record become proof you can return to yourself.`,
    focus: toCue(context.mentorMove || context.stabilizer),
    watch: toCue(context.avoid)
  };
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

function generateProblemInsight(problem, user, index) {
  const text = problem.trim();
  const type = detectProblemType(text);
  const sign = getWesternZodiac(user.birthDate);
  const lifePath = reduceDigits(user.birthDate);
  const id = `problem-${Date.now()}-${index}`;

  return {
    id,
    problem: text,
    root: `${type.root} Your ${sign.sign} nature wants ${sign.need}, while life path ${lifePath} asks you to build steadier habits before expecting relief.`,
    astrology: `${type.astro} In your chart reading, this points to pressure around ${type.house}. Treat it as a timing pattern: the lesson is not punishment, it is refinement through better choices.`,
    solution: `${type.solution} Keep the remedy practical for seven days: one clear intention at sunrise, one disciplined action before noon, and one honest reflection at night. If the situation involves another person, speak after your body has settled.`
  };
}

function detectProblemType(problem) {
  const lower = problem.toLowerCase();
  if (/love|partner|marriage|relationship|breakup|trust/.test(lower)) {
    return {
      root: "The root looks emotional: expectation, fear of rejection, and unclear boundaries are mixing together.",
      astro: "The relationship houses show a need for balance between attachment and self-respect.",
      house: "partnership, trust, and emotional security",
      solution: "Do not force closeness through repeated explanations. Ask for one honest conversation, then watch actions more than promises."
    };
  }
  if (/job|career|work|boss|money|business|study|exam/.test(lower)) {
    return {
      root: "The root looks practical: pressure is building because effort, recognition, and timing are not moving together yet.",
      astro: "The career and discipline zones are asking for structure before reward.",
      house: "work, responsibility, and public progress",
      solution: "Choose one measurable target, reduce distractions, and document your effort daily so confidence is based on evidence."
    };
  }
  if (/family|parent|home|mother|father|sibling/.test(lower)) {
    return {
      root: "The root looks ancestral and emotional: old roles may be making you responsible for more than your share.",
      astro: "The home and roots zone is asking you to heal without carrying every burden alone.",
      house: "family duty, belonging, and emotional memory",
      solution: "Respect the bond, but separate love from over-functioning. Offer help that has a clear limit."
    };
  }
  if (/health|sleep|anxiety|stress|tired|fear/.test(lower)) {
    return {
      root: "The root looks energetic: your body may be reacting to pressure that your mind keeps postponing.",
      astro: "The wellness zone asks for rhythm, food, rest, and less emotional leakage.",
      house: "daily routine, nerves, and recovery",
      solution: "Return to basics first. Eat on time, sleep earlier, walk daily, and get professional care if symptoms feel intense or persistent."
    };
  }
  return {
    root: "The root looks like a conflict between what your heart knows and what your routine keeps repeating.",
    astro: "The present pattern highlights decision-making, discipline, and emotional truth.",
    house: "clarity, courage, and personal direction",
    solution: "Write the problem in one sentence, name the next right action, and take that action before asking for more signs."
  };
}

function getWesternZodiac(dateString) {
  const date = parseDate(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const signs = [
    ["Capricorn", 1, 19, "stability", "earth"],
    ["Aquarius", 2, 18, "freedom", "air"],
    ["Pisces", 3, 20, "emotional safety", "water"],
    ["Aries", 4, 19, "direct movement", "fire"],
    ["Taurus", 5, 20, "security", "earth"],
    ["Gemini", 6, 20, "mental variety", "air"],
    ["Cancer", 7, 22, "care", "water"],
    ["Leo", 8, 22, "recognition", "fire"],
    ["Virgo", 9, 22, "order", "earth"],
    ["Libra", 10, 22, "harmony", "air"],
    ["Scorpio", 11, 21, "depth", "water"],
    ["Sagittarius", 12, 21, "meaning", "fire"]
  ];
  const found = signs.find(([, endMonth, endDay]) => month < endMonth || (month === endMonth && day <= endDay));
  const [sign, , , need, element] = found || signs[0];
  return { sign, need, element };
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
      endDate,
      endLabel: `Estimated completion: ${formatDate(endDate)}`,
      summary: `Your calculated Moon sign is ${moonSign}, with Saturn currently in ${saturnSign}. In this ${phaseTitles[phaseIndex].toLowerCase()}, ${experiences[phaseIndex]}. There is nothing to fear about Saade Sati. With steady remedies, practical discipline, and timely guidance, this period can pass with fewer struggles and more inner strength.`
    };
  }

  const nextStart = parseDate(chartReport.nextStartDate || currentTransit.endDate || addYears(now, 1));
  return {
    active: false,
    phaseIndex: 0,
    phaseTitle: "Outside Saade Sati",
    endDate: nextStart,
    endLabel: chartReport.nextStartDate ? `Next watch begins around ${formatDate(nextStart)}` : `Current Saturn window changes around ${formatDate(nextStart)}`,
    summary: `Your calculated Moon sign is ${moonSign}, and Saturn is currently in ${saturnSign}. Saade Sati does not appear active right now. Keep your routine clean, repay obligations slowly, and treat discipline as protection rather than pressure.`
  };
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
  const lower = text.toLowerCase();
  if (/remedy|upay|what should|do/.test(lower)) {
    return `For ${firstName(user.name)}, begin with consistency: light a clean lamp on Saturday, serve someone quietly, avoid harsh speech, and finish one delayed duty. Remedies work best when your conduct becomes lighter.`;
  }
  if (/fear|scared|bad|problem/.test(lower)) {
    return `Do not fear this ${report.phaseTitle.toLowerCase()}. Shani tests truth, patience, and responsibility. Make your routine honest, reduce ego reactions, and ask for help before pressure becomes isolation.`;
  }
  return `Keep the question simple and the action sincere. For the next seven days, protect your sleep, speak less in anger, and complete one pending responsibility. Then watch what starts becoming lighter.`;
}

function getNumbers(user) {
  const birthNumber = reduceDigits(user.birthDate.split("-")[2] || "");
  const lifePath = reduceDigits(user.birthDate);
  const nameNumber = reduceName(user.name);
  const lucky = reduceDigits(`${birthNumber}${lifePath}${nameNumber}`);
  const avoid = ((lucky + 4) % 9) || 9;
  return [
    { label: "Birth number", value: birthNumber, note: "Your instinctive style when life asks for a quick choice." },
    { label: "Life path", value: lifePath, note: "The rhythm that keeps repeating until it becomes your strength." },
    { label: "Name number", value: nameNumber, note: "The way your presence tends to land on people." },
    { label: "Lucky number", value: lucky, note: "Use it for gentle alignment in dates, goals, and small starts." },
    { label: "Avoid", value: avoid, note: "Do not overuse this number when a choice already feels tense." }
  ];
}

function reduceDigits(value) {
  let sum = String(value || "").replace(/\D/g, "").split("").reduce((total, digit) => total + Number(digit), 0);
  while (sum > 9) {
    sum = String(sum).split("").reduce((total, digit) => total + Number(digit), 0);
  }
  return sum || 1;
}

function reduceName(name) {
  const total = String(name || "").toUpperCase().replace(/[^A-Z]/g, "").split("").reduce((sum, letter) => {
    return sum + ((letter.charCodeAt(0) - 64 - 1) % 9) + 1;
  }, 0);
  return reduceDigits(total);
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

function mod(value, length) {
  return ((value % length) + length) % length;
}

createRoot(document.getElementById("root")).render(<App />);
