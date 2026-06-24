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
import { buildAstrologyContext, getSaadeSatiFromChart } from "./astrologyEngine.js";
import { clearObservedUser, identifyUser, initializeObservability, trackEvent } from "./observability.js";
import { cleanWisdomText, firstName, isLowQualityWisdom, normalizeWisdomPayload } from "./soulGuruPrompt.js";

const ACCOUNT_DB_KEY = "soulguru.accounts.v1";
const SESSION_KEY = "soulguru.session.v1";
const SOUL_READING_CACHE_VERSION = "soul-wisdom-v3";
const SOUL_READING_CACHE_PREFIX = "soulguru.dailySoulReading.v3";
const SOUL_READING_HISTORY_PREFIX = "soulguru.dailySoulReadingHistory.v3";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const DEMO_PAYMENTS_ENABLED = import.meta.env.VITE_DEMO_PAYMENTS === "true" || import.meta.env.MODE !== "production";

initializeObservability();

const TABS = [
  { id: "soul", label: "Soul Guru", Icon: Sparkles },
  { id: "astro", label: "Astro Solves", Icon: ShieldCheck },
  { id: "shani", label: "Shani", Icon: Clock3 },
  { id: "numbers", label: "#Numbers", Icon: Hash },
  { id: "harmony", label: "Harmony", Icon: Heart }
];

const VEDIC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

const SATURN_PERIODS = [
  { sign: "Sagittarius", start: "2017-10-26", end: "2020-01-24" },
  { sign: "Capricorn", start: "2020-01-24", end: "2023-01-17" },
  { sign: "Aquarius", start: "2023-01-17", end: "2025-03-29" },
  { sign: "Pisces", start: "2025-03-29", end: "2027-06-03" },
  { sign: "Aries", start: "2027-06-03", end: "2029-08-08" },
  { sign: "Taurus", start: "2029-08-08", end: "2032-05-31" },
  { sign: "Gemini", start: "2032-05-31", end: "2034-07-13" },
  { sign: "Cancer", start: "2034-07-13", end: "2036-08-27" }
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
    saveAccount(account);
    window.localStorage.setItem(SESSION_KEY, account.phone);
    setUser(account);
    setActiveTab("soul");
    trackEvent("login_completed", { mode: "otp_demo" });
  }

  function updateUser(updater) {
    setUser((current) => {
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      saveAccount(next);
      window.localStorage.setItem(SESSION_KEY, next.phone);
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

  useEffect(() => {
    setPendingOtp(null);
    setOtpValue("");
    setError("");
  }, [mode]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function sendOtp() {
    const phone = normalizePhone(form.phone);
    const accounts = readAccounts();
    setError("");

    if (!isValidPhone(phone)) {
      setError("Enter a valid phone number.");
      return;
    }

    if (mode === "existing") {
      if (!accounts[phone]) {
        setError("No account found for this number.");
        return;
      }
    } else {
      const requiredFields = ["name", "birthDate", "birthPlace", "birthTime", "email"];
      const missingField = requiredFields.find((field) => !String(form[field]).trim());
      if (missingField) {
        setError("Complete all details before verification.");
        return;
      }
      if (accounts[phone]) {
        setError("This number already has an account.");
        return;
      }
    }

    setPendingOtp({
      phone,
      code: createOtp(),
      payload: { ...form, phone }
    });
    setOtpValue("");
  }

  function verifyOtp() {
    if (!pendingOtp) return;
    if (otpValue.trim() !== pendingOtp.code) {
      setError("OTP did not match.");
      return;
    }

    if (mode === "existing") {
      const account = readAccounts()[pendingOtp.phone];
      onLogin(account);
      return;
    }

    const account = {
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
    };
    onLogin(account);
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
            <span className="otp-demo">Demo OTP {pendingOtp.code}</span>
            <InputField label="Enter OTP" inputMode="numeric" value={otpValue} onChange={setOtpValue} />
            <button className="primary-action" type="button" onClick={verifyOtp}>
              <ShieldCheck size={18} aria-hidden="true" />
              Verify and enter
            </button>
          </div>
        ) : (
          <button className="primary-action" type="button" onClick={sendOtp}>
            <Send size={18} aria-hidden="true" />
            Send OTP
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
  const todayKey = useMemo(() => getTodayKey(), []);
  const fallbackReading = useMemo(() => getDailyWisdom(user, todayKey), [user, todayKey]);
  const [reading, setReading] = useState(fallbackReading);
  const focus = useMemo(() => getDailyFocus(user), [user]);

  useEffect(() => {
    let cancelled = false;
    const context = buildAstrologyContext(user, buildDateFromKey(todayKey));
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
          birthPlace: user.birthPlace
        },
        date: todayKey,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        context,
        today: buildDateFromKey(todayKey).toLocaleDateString(undefined, {
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

  function saveAdvice() {
    const savedItem = {
      id: `saved-${Date.now()}`,
      date: new Date().toISOString(),
      reading
    };
    updateUser((current) => ({
      ...current,
      savedGuidance: [savedItem, ...(current.savedGuidance || [])].slice(0, 30),
      guidanceHistory: upsertHistory(current.guidanceHistory || [], reading)
    }));
    saveGuidanceToServer(user, reading, savedItem.id);
    trackEvent("guidance_saved");
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
        <button className="secondary-action calm-action" type="button" onClick={saveAdvice}>
          <BadgeCheck size={18} aria-hidden="true" />
          Save Advice
        </button>
        <button className="primary-action guidance-action" type="button" onClick={onMoreGuidance}>
          <Crown size={18} aria-hidden="true" />
          More Guidance
        </button>
      </div>
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
  const [dashboardStatus, setDashboardStatus] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const serverSubscription = serverDashboard?.subscription?.active ? serverDashboard.subscription : null;
  const subscription = serverSubscription || user.soulGuruSubscription;
  const isActive = Boolean(subscription?.active);
  const startsAt = subscription?.startedAt ? new Date(subscription.startedAt) : new Date();
  const endsAt = subscription?.endsAt ? new Date(subscription.endsAt) : addMonths(startsAt, 3);
  const daysTotal = Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / 86400000));
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000));
  const progress = Math.min(100, Math.max(0, Math.round(((daysTotal - daysLeft) / daysTotal) * 100)));
  const guidanceHistory = mergeGuidanceItems(serverDashboard?.guidanceHistory || [], getCachedGuidanceHistory(user));
  const savedGuidance = mergeGuidanceItems(serverDashboard?.savedGuidance || [], user.savedGuidance || []);

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
          birthPlace: user.birthPlace
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
  }, [updateUser, user.birthDate, user.birthPlace, user.birthTime, user.email, user.id, user.name, user.phone, user.soulGuruSubscription?.active]);

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
        onSuccess(payment) {
          activatePlan({
            provider: "razorpay",
            paymentStatus: "paid",
            razorpayOrderId: order.orderId,
            razorpayPaymentId: payment.razorpay_payment_id
          });
          setCheckoutStatus("Payment received. More Guidance is active.");
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
              <span className="member-badge">{daysLeft} days left</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>Started {formatDate(startsAt)}. Ends {formatDate(endsAt)}.</p>
          </article>

          <article className="deep-guidance-panel">
            <h3>Deeper guidance map</h3>
            <p><strong>This week:</strong> revisit the daily Move cue and finish it before opening a new emotional loop.</p>
            <p><strong>This month:</strong> save readings that repeat a theme. Repeated advice is where the growth work is hiding.</p>
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
  const report = useMemo(() => getSaadeSatiReport(user, now), [user, now]);
  const countdown = useMemo(() => getCountdown(report.endDate, now), [report.endDate, now]);
  const memberPlan = MEMBERSHIP_PLANS.find((plan) => plan.id === user.memberPlan);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function selectPlan(planId) {
    updateUser({ memberPlan: planId });
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
              className={user.memberPlan === plan.id ? "plan-card active" : "plan-card"}
              onClick={() => selectPlan(plan.id)}
            >
              <strong>{plan.name}</strong>
              <span>{plan.price}</span>
            </button>
          ))}
        </div>
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
  const accounts = readAccounts();
  accounts[account.phone] = account;
  window.localStorage.setItem(ACCOUNT_DB_KEY, JSON.stringify(accounts));
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

function buildDateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00+05:30`);
}

function getSoulReadingUserKey(user) {
  return stableHash([
    user.id,
    user.phone,
    user.email,
    user.birthDate,
    user.birthTime,
    user.birthPlace
  ].filter(Boolean).join("|")).toString(36);
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

function saveGuidanceToServer(user, reading, sourceId) {
  authFetch(getApiUrl("/api/more-guidance"), {
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
        birthPlace: user.birthPlace
      },
      sourceId,
      reading
    })
  }).catch(() => {});
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

function getDailyWisdom(user, dateKey = getTodayKey()) {
  const context = buildAstrologyContext(user, buildDateFromKey(dateKey));
  const seed = stableHash(`${getSoulReadingUserKey(user)}-${dateKey}-${context.dailyArea}-${context.timingTone}`);
  const builders = [
    buildTaskFirstWisdom,
    buildBodyFirstWisdom,
    buildRelationshipFirstWisdom,
    buildQuietAuthorityWisdom,
    buildPressureReleaseWisdom,
    buildSceneFirstWisdom,
    buildCoreNeedWisdom,
    buildPersonalEdgeWisdom
  ];
  let wisdom = builders[seed % builders.length](user, context);
  if (isLowQualityWisdom(wisdom)) {
    wisdom = builders[(seed + 1) % builders.length](user, context);
  }

  return {
    wisdom: normalizeLocalWisdom(wisdom),
    innerWeather: toCue(context.innerWeather),
    todayMove: toCue(context.decisionGate),
    release: toCue(context.avoid)
  };
}

function buildTaskFirstWisdom(user, context) {
  return `${areaOpening(context.dailyArea)} ${firstName(user.name)}, put ${context.workSignal} where it can be seen, then stop asking the mood to approve it. ${capitalize(context.emotionalKnot)} can turn a simple duty into a private test. Use ${context.stabilizer}, keep ${context.avoid} away from the next decision, and let one finished detail make the day feel less negotiable.`;
}

function buildBodyFirstWisdom(user, context) {
  return `${capitalize(context.bodySignal)} before the day asks for explanations. ${firstName(user.name)}, ${context.innerWeather} becomes easier to trust when ${context.coreNeed} is treated as a real need, not a luxury. ${areaOpening(context.dailyArea)} Give one practical task a clean finish, keep the conversation shorter than the worry around it, and let ${context.relationshipMirror} guide your pace without taking over your worth.`;
}

function buildRelationshipFirstWisdom(user, context) {
  return `${capitalize(context.relationshipMirror)}, and that detail matters more than another long explanation. ${firstName(user.name)}, ${context.innerWeather} is not a weakness, but it does need direction. ${areaOpening(context.dailyArea)} Do not spend the best part of the day managing ${context.avoid}; ${context.decisionGate} instead. By tonight, the choice that felt plain may be the one you respect most.`;
}

function buildQuietAuthorityWisdom(user, context) {
  return `${firstName(user.name)}, protect the part of the day that still belongs to you. ${areaOpening(context.dailyArea)} ${capitalize(context.timingTone)}, especially if ${context.emotionalKnot} starts making everything urgent. ${capitalize(context.workSignal)}. Then step back from ${context.avoid}; the cleaner choice is not the loudest one, it is the one you can stand behind after the mood passes.`;
}

function buildPressureReleaseWisdom(user, context) {
  return `${areaOpening(context.dailyArea)} ${capitalize(context.avoid)} will make the day heavier than it needs to be. ${firstName(user.name)}, use ${context.stabilizer} as your private rule. If a conversation starts pulling you into defense, remember that ${context.relationshipMirror}. Finish the visible task, care for the body before the difficult moment, and let one completed action answer the doubt that words keep reopening.`;
}

function buildSceneFirstWisdom(user, context) {
  return `${capitalize(context.dailyScene)} can show you exactly where attention is leaking. ${firstName(user.name)}, do not turn ${context.emotionalKnot} into the manager of the whole day. ${capitalize(context.personalEdge)} by making the next step physical: write it, send it, clean it, close it. When ${context.relationshipMirror}, respond with proportion. Your peace gets stronger when it has a shape.`;
}

function buildCoreNeedWisdom(user, context) {
  return `${capitalize(context.coreNeed)} is not too much to ask from this day. ${firstName(user.name)}, the risk is not sensitivity; it is letting ${context.avoid} decide how much of yourself to spend. Start with ${context.bodySignal}, then ${context.decisionGate}. A small, well-kept limit will protect more progress than another round of proving your intention.`;
}

function buildPersonalEdgeWisdom(user, context) {
  return `${capitalize(context.personalEdge)} before the old rhythm collects more evidence. ${firstName(user.name)}, ${context.innerWeather} needs a practical container: ${context.stabilizer}. ${areaOpening(context.dailyArea)} If ${context.relationshipMirror}, let that soften your reaction without erasing your position. The day does not need a dramatic breakthrough; it needs one choice you can repeat without betraying yourself.`;
}

function areaOpening(area) {
  const lower = String(area || "").toLowerCase();
  if (lower.includes("money")) {
    return "Money and self-worth need separate seats today; do not let a price, delay, or promise measure your value.";
  }
  if (lower.includes("relationship")) {
    return "A relationship tone can reveal more through timing than through long explanations today.";
  }
  if (lower.includes("family")) {
    return "Family duty needs a cleaner shape today, especially where care has started turning into silent fatigue.";
  }
  if (lower.includes("health")) {
    return "Your body is giving practical feedback today, not a problem to ignore until it becomes louder.";
  }
  if (lower.includes("public") || lower.includes("ambition")) {
    return "Recognition is moving slower than your effort, but the work still needs a visible next step.";
  }
  if (lower.includes("creative") || lower.includes("visibility")) {
    return "Your voice needs use today, even if the first version comes out imperfect.";
  }
  if (lower.includes("friendship") || lower.includes("belonging")) {
    return "Belonging should not ask you to abandon the quieter truth you already know.";
  }
  if (lower.includes("sleep") || lower.includes("closure")) {
    return "Closure begins with removing one mental tab that has been left open too long.";
  }
  if (lower.includes("learning") || lower.includes("discipline")) {
    return "Scattered attention will ask for ten exits today; give it one clean assignment.";
  }
  if (lower.includes("home")) {
    return "Home rhythm matters today because private disorder can leak into every decision.";
  }
  return "One unfinished responsibility deserves a plain finish today, without turning it into a story about your worth.";
}

function normalizeLocalWisdom(text) {
  return cleanWisdomText(text, text, 100);
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

function getDailyFocus(user) {
  const dateKey = getTodayKey();
  const context = buildAstrologyContext(user, buildDateFromKey(dateKey));
  const seed = stableHash(`${getSoulReadingUserKey(user)}-${dateKey}`);
  const focus = [
    context.dailyArea,
    context.innerWeather,
    context.timingTone,
    context.stabilizer
  ];
  return [
    { label: "Focus", value: toCue(focus[seed % focus.length]) },
    { label: "Anchor", value: toCue(context.stabilizer) },
    { label: "Avoid", value: toCue(context.avoid) }
  ];
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
  const moonIndex = VEDIC_SIGNS.indexOf(moonSign);
  const currentTransit = getCurrentSaturnTransit(now, chartReport.saturnSign);
  const saturnIndex = VEDIC_SIGNS.indexOf(currentTransit.sign);
  const previousSignIndex = mod(moonIndex - 1, 12);
  const nextSignIndex = mod(moonIndex + 1, 12);
  const phaseIndex = chartReport.phaseIndex;

  if (phaseIndex) {
    const endPeriod = findTransitForSign(VEDIC_SIGNS[nextSignIndex], now) || currentTransit;
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
      endDate: parseDate(endPeriod.end),
      endLabel: `Estimated completion: ${formatDate(endPeriod.end)}`,
      summary: `Your calculated Moon sign is ${moonSign}, with Saturn currently in ${currentTransit.sign}. In this ${phaseTitles[phaseIndex].toLowerCase()}, ${experiences[phaseIndex]}. There is nothing to fear about Saade Sati. With steady remedies, practical discipline, and timely guidance, this period can pass with fewer struggles and more inner strength.`
    };
  }

  const nextStartPeriod = findTransitForSign(VEDIC_SIGNS[previousSignIndex], now);
  const nextStart = nextStartPeriod ? parseDate(nextStartPeriod.start) : addYears(now, 1);
  return {
    active: false,
    phaseIndex: 0,
    phaseTitle: "Outside Saade Sati",
    endDate: nextStart,
    endLabel: nextStartPeriod ? `Next watch begins around ${formatDate(nextStartPeriod.start)}` : "No near-term Saade Sati window found",
    summary: `Your calculated Moon sign is ${moonSign}, and Saturn is currently in ${currentTransit.sign}. Saade Sati does not appear active right now. Keep your routine clean, repay obligations slowly, and treat discipline as protection rather than pressure.`
  };
}

function getCurrentSaturnTransit(now, computedSign) {
  return SATURN_PERIODS.find((period) => now >= parseDate(period.start) && now < parseDate(period.end))
    || SATURN_PERIODS.find((period) => period.sign === computedSign && parseDate(period.end) > now)
    || { sign: computedSign, start: now.toISOString().slice(0, 10), end: addYears(now, 2).toISOString().slice(0, 10) };
}

function findTransitForSign(sign, now) {
  return SATURN_PERIODS.find((period) => period.sign === sign && parseDate(period.end) > now);
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

function generateCompatibility(user, partner) {
  const userSign = getWesternZodiac(user.birthDate);
  const partnerSign = getWesternZodiac(partner.birthDate);
  const userLife = reduceDigits(user.birthDate);
  const partnerLife = reduceDigits(partner.birthDate);
  const elementScore = userSign.element === partnerSign.element ? 22 : compatibleElements(userSign.element, partnerSign.element) ? 15 : 7;
  const numberScore = 24 - Math.min(18, Math.abs(userLife - partnerLife) * 3);
  const nameScore = stableHash(`${user.name}-${partner.name}`) % 25;
  const score = Math.min(96, Math.max(42, 45 + elementScore + numberScore + nameScore));

  return {
    score,
    title: `${userSign.sign} and ${partnerSign.sign}`,
    summary: `${firstName(user.name)} and ${firstName(partner.name)} have a ${score >= 78 ? "warm and naturally supportive" : score >= 62 ? "promising but effort-based" : "karmic and growth-heavy"} bond. The match improves when affection is steady and expectations are spoken before they become tests.`,
    details: [
      { label: "Emotional rhythm:", text: `${userSign.element} and ${partnerSign.element} energy needs regular reassurance without losing personal space.` },
      { label: "Strength:", text: `Life paths ${userLife} and ${partnerLife} can build loyalty when both partners respect each other's pace.` },
      { label: "Growth edge:", text: "Avoid silent scorekeeping. One honest weekly check-in will protect the connection." }
    ]
  };
}

function compatibleElements(first, second) {
  const pair = [first, second].sort().join("-");
  return ["air-fire", "earth-water"].includes(pair);
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
