import {
  SHANI_HANUMAN_CHALISA_AUDIO,
  SHANI_SIGN_REMEDY_PROFILES,
  buildShaniMembershipPlanCatalog,
  buildShaniNotificationContent,
  buildShaniRemedyPlanForMembership
} from "../src/backend/shaniRemedyCatalog.js";
import {
  dispatchDueShaniNotifications,
  resolveShaniNotificationSchedule
} from "../src/backend/shaniNotificationService.js";

const checks = [];

function checkCatalogPlans() {
  const plans = buildShaniMembershipPlanCatalog();
  const byId = Object.fromEntries(plans.map((plan) => [plan.id, plan]));
  pushCheck("Shani Shagun plan catalog exposes the four paid plans", [
    plans.length === 4,
    byId["3m"]?.name === "Shani Aarambh",
    byId["3m"]?.shagunLabel === "Shagun ke Rs 251",
    byId["3m"]?.pricePaise === 25100,
    byId["6m"]?.name === "Shani Dhairya",
    byId["6m"]?.pricePaise === 50100,
    byId["1y"]?.name === "Shani Niyam",
    byId["1y"]?.pricePaise === 100100,
    byId.full?.name === "Shani Sampoorna",
    byId.full?.pricePaise === 111100
  ].every(Boolean));

  pushCheck("Free Hanuman Chalisa audio is backend-owned and public to the Shani tab", [
    SHANI_HANUMAN_CHALISA_AUDIO.audioUrl === "/assets/hanuman-chalisa-user-upload.mp3",
    SHANI_HANUMAN_CHALISA_AUDIO.imageUrl === "/assets/hanuman-meditating-symbol.jpeg",
    SHANI_HANUMAN_CHALISA_AUDIO.title === "Hanuman Chalisa",
    !SHANI_HANUMAN_CHALISA_AUDIO.subtitle,
    SHANI_HANUMAN_CHALISA_AUDIO.attribution.includes("User-provided")
  ].every(Boolean));
}

function checkRashiProfiles() {
  const profiles = Object.values(SHANI_SIGN_REMEDY_PROFILES);
  pushCheck("Shani remedy catalog covers all 12 Vedic Moon signs", [
    profiles.length === 12,
    profiles.every((profile) => [
      profile.sign,
      profile.rashiName,
      profile.theme,
      profile.fridayPrep,
      profile.saturdayRemedy,
      profile.dailyNiyam,
      profile.daan,
      profile.seva,
      profile.avoid,
      profile.mantraFocus
    ].every(Boolean)),
    new Set(profiles.map((profile) => profile.rashiName)).size === 12
  ].every(Boolean));
}

function checkEveryPlanEveryRashiBuilds() {
  const failures = [];
  for (const plan of buildShaniMembershipPlanCatalog()) {
    for (const profile of Object.values(SHANI_SIGN_REMEDY_PROFILES)) {
      const remedy = buildShaniRemedyPlanForMembership({
        report: shaniReport(profile.sign),
        membership: membership(plan.id),
        now: new Date("2026-07-17T02:30:00.000Z")
      });
      if (remedy.plan.id !== plan.id) failures.push(`${plan.id}/${profile.sign} plan mismatch`);
      if (remedy.rashi.sign !== profile.sign) failures.push(`${plan.id}/${profile.sign} rashi mismatch`);
      if ((remedy.memberGuide?.pointers || []).length < 4) failures.push(`${plan.id}/${profile.sign} missing guide pointers`);
      if (!remedy.saturday.remedy.includes(profile.saturdayRemedy.slice(0, 16))) failures.push(`${plan.id}/${profile.sign} missing Saturday remedy`);
      if (!remedy.saturday.mantra.includes("Om Sham")) failures.push(`${plan.id}/${profile.sign} missing mantra`);
    }
  }

  pushCheck("Every Shani membership plan builds a tailored remedy for every Moon sign", failures.length === 0, failures);
}

function checkNotificationContent() {
  const content = buildShaniNotificationContent({
    notificationType: "friday_preview",
    remedyDate: "2026-07-18",
    report: shaniReport("Aries"),
    membership: membership("3m"),
    now: new Date("2026-07-17T02:30:00.000Z")
  });

  pushCheck("Friday notification content uses stored rashi and plan remedies", [
    content.type === "friday_preview",
    content.title.includes("Mesh Moon"),
    content.body.includes("Tomorrow is Saturday"),
    content.body.includes("Shani Aarambh"),
    content.body.includes("Offer black til or footwear"),
    content.body.includes("Om Sham Shanaishcharaya Namah")
  ].every(Boolean));
}

function checkNotificationSchedule() {
  const friday = resolveShaniNotificationSchedule({
    now: new Date("2026-07-17T02:30:00.000Z"),
    timeZone: "Asia/Kolkata"
  });
  const saturday = resolveShaniNotificationSchedule({
    now: new Date("2026-07-18T02:30:00.000Z"),
    timeZone: "Asia/Kolkata"
  });
  const sunday = resolveShaniNotificationSchedule({
    now: new Date("2026-07-19T02:30:00.000Z"),
    timeZone: "Asia/Kolkata"
  });

  pushCheck("Shani notification schedule resolves Friday previews and Saturday reminders in IST", [
    friday.due === true,
    friday.notificationType === "friday_preview",
    friday.remedyDate === "2026-07-18",
    saturday.due === true,
    saturday.notificationType === "saturday_reminder",
    saturday.remedyDate === "2026-07-18",
    sunday.due === false
  ].every(Boolean));
}

async function checkNotificationDispatch() {
  const supabase = createFakeNotificationSupabase();
  const sendCalls = [];
  const payload = {
    forceType: "friday_preview",
    remedyDate: "2026-07-18"
  };
  const deps = {
    supabase,
    now: new Date("2026-07-17T02:30:00.000Z"),
    sendEmail: async (message) => {
      sendCalls.push(message);
      return { sent: true, id: `email-${sendCalls.length}` };
    }
  };

  const first = await dispatchDueShaniNotifications(payload, {}, deps);
  const duplicate = await dispatchDueShaniNotifications(payload, {}, deps);
  const stored = [...supabase.state.notifications.values()][0];

  pushCheck("Shani notification dispatch sends and stores one Friday preview per membership", [
    first.ok === true,
    first.sent === 1,
    first.failed === 0,
    sendCalls.length === 1,
    sendCalls[0].subject.includes("Mesh Moon"),
    stored.notification_type === "friday_preview",
    stored.remedy_date === "2026-07-18",
    stored.status === "sent",
    stored.payload?.rashi?.rashiName === "Mesh"
  ].every(Boolean));

  pushCheck("Shani notification dispatch skips duplicate Friday previews", [
    duplicate.ok === true,
    duplicate.sent === 0,
    duplicate.skipped === 1,
    sendCalls.length === 1,
    supabase.state.notifications.size === 1
  ].every(Boolean));
}

function shaniReport(moonSign) {
  return {
    active: true,
    phaseIndex: 2,
    phaseTitle: "Peak phase",
    moonSign,
    saturnSign: "Pisces",
    endDate: "2027-06-02T00:00:00.000Z",
    endLabel: "Estimated completion: 2 Jun 2027"
  };
}

function membership(planId) {
  return {
    id: `membership-${planId}`,
    active: true,
    planId,
    planName: planId,
    status: "active",
    startsAt: "2026-07-01T00:00:00.000Z",
    endsAt: "2026-10-01T00:00:00.000Z"
  };
}

function createFakeNotificationSupabase() {
  const state = {
    memberships: [
      {
        id: "membership-shani-1",
        user_key: "hashed-shani-user-1",
        plan_id: "3m",
        plan_name: "Shani Aarambh",
        status: "active",
        starts_at: "2026-07-01T00:00:00.000Z",
        ends_at: "2026-10-01T00:00:00.000Z",
        provider: "razorpay",
        provider_payment_id: "pay_shani_1",
        provider_subscription_id: null,
        metadata: {
          email: "mesh@soulguru.local",
          phone: "+919999999999",
          name: "Mesh Member",
          birth_date: "1995-02-11",
          birth_time: "10:15",
          birth_place: "Jaipur",
          vedic_moon_sign_override: "Aries"
        },
        created_at: "2026-07-01T00:00:00.000Z"
      }
    ],
    notifications: new Map()
  };

  return {
    state,
    from(table) {
      return new FakeQuery(state, table);
    }
  };
}

class FakeQuery {
  constructor(state, table) {
    this.state = state;
    this.table = table;
    this.filters = {};
    this.gtFilters = {};
    this.payload = null;
    this.limitCount = null;
  }

  select() {
    return this;
  }

  eq(key, value) {
    this.filters[key] = value;
    return this;
  }

  gt(key, value) {
    this.gtFilters[key] = value;
    return this;
  }

  order() {
    return this;
  }

  limit(value) {
    this.limitCount = Number(value);
    return this;
  }

  insert(payload) {
    this.payload = payload;
    return this;
  }

  async maybeSingle() {
    if (this.table !== "shani_remedy_notifications") {
      return { data: null, error: null };
    }
    return { data: this.findNotification() || null, error: null };
  }

  async single() {
    if (this.table !== "shani_remedy_notifications" || !this.payload) {
      return { data: null, error: null };
    }
    const key = notificationKey(this.payload);
    if (this.state.notifications.has(key)) {
      return { data: null, error: { code: "23505", message: "duplicate notification" } };
    }
    const row = {
      id: `notification-${this.state.notifications.size + 1}`,
      ...this.payload,
      created_at: "2026-07-17T02:30:00.000Z"
    };
    this.state.notifications.set(key, row);
    return { data: row, error: null };
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    if (this.table === "shani_remedy_memberships") {
      const rows = this.state.memberships
        .filter((row) => matchesFilters(row, this.filters))
        .filter((row) => Object.entries(this.gtFilters).every(([key, value]) => new Date(row[key]).getTime() > new Date(value).getTime()))
        .slice(0, this.limitCount || 200);
      return { data: rows, error: null };
    }

    return { data: [], error: null };
  }

  findNotification() {
    return [...this.state.notifications.values()].find((row) => matchesFilters(row, this.filters));
  }
}

function notificationKey(row) {
  return [
    row.membership_id,
    row.channel,
    row.notification_type,
    row.remedy_date
  ].join("|");
}

function matchesFilters(row, filters) {
  return Object.entries(filters).every(([key, value]) => row[key] === value);
}

function pushCheck(label, passed, details = []) {
  checks.push({ label, passed, details });
}

function printReport() {
  console.log(`Shani remedy contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
    for (const detail of check.details) {
      console.log(`  - ${detail}`);
    }
  }
}

checkCatalogPlans();
checkRashiProfiles();
checkEveryPlanEveryRashiBuilds();
checkNotificationContent();
checkNotificationSchedule();
await checkNotificationDispatch();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length) {
  process.exit(1);
}
