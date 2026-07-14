export const SHANI_HANUMAN_CHALISA_AUDIO = Object.freeze({
  id: "hanuman-chalisa-user-upload",
  title: "Hanuman Chalisa",
  audioUrl: "/assets/hanuman-chalisa-user-upload.mp3",
  imageUrl: "/assets/hanuman-meditating-symbol.jpeg",
  attribution: "User-provided audio; copyright clearance must be confirmed before production release.",
  copyrightStatus: "user-provided-unverified"
});

export const SHANI_PLAN_DEFINITIONS = Object.freeze({
  "3m": Object.freeze({
    id: "3m",
    name: "Shani Aarambh",
    duration: "3 month",
    shagunLabel: "Shagun ke Rs 251",
    priceRupees: 251,
    pricePaise: 25100,
    envKey: "SHANI_PLAN_3M_PRICE_PAISE",
    months: 3,
    saturdayCount: 12,
    cadence: "3 month guided rhythm",
    displayDuration: "3 month",
    promise: "Start Saade Sati upay properly with a simple weekly structure.",
    includes: Object.freeze([
      "Moon-sign tailored Shani remedy map",
      "Friday preview for tomorrow's Saturday upay",
      "Saturday implementation reminder",
      "Mantra, daan, seva, and speech-discipline tracker",
      "Member Pandit guidance access"
    ]),
    planFocus: Object.freeze([
      "Begin with one clean Saturday routine.",
      "Reduce fear by making the remedy small enough to repeat.",
      "Build a private discipline ledger for money, speech, sleep, and duty."
    ])
  }),
  "6m": Object.freeze({
    id: "6m",
    name: "Shani Dhairya",
    duration: "6 month",
    shagunLabel: "Shagun ke Rs 501",
    priceRupees: 501,
    pricePaise: 50100,
    envKey: "SHANI_PLAN_6M_PRICE_PAISE",
    months: 6,
    saturdayCount: 24,
    cadence: "6 month guided rhythm",
    displayDuration: "6 month",
    promise: "Stay steady through a longer Shani pressure window without changing remedies every week.",
    includes: Object.freeze([
      "Everything in Shani Aarambh",
      "Longer remedy rhythm with monthly review",
      "21-day or 40-day mantra sankalp options",
      "Budget-aware daan and seva rotation",
      "Monthly correction focus for the Moon sign"
    ]),
    planFocus: Object.freeze([
      "Turn Saturday upay into a habit, not an emergency response.",
      "Track one karmic correction: debt, duty, promise, speech, or routine.",
      "Use monthly review to adjust intensity without fear."
    ])
  }),
  "1y": Object.freeze({
    id: "1y",
    name: "Shani Niyam",
    duration: "1 year",
    shagunLabel: "Shagun ke Rs 1001",
    priceRupees: 1001,
    pricePaise: 100100,
    envKey: "SHANI_PLAN_1Y_PRICE_PAISE",
    months: 12,
    saturdayCount: 52,
    cadence: "1 year guided rhythm",
    displayDuration: "1 year",
    promise: "Make Shani discipline a year-long path of routine, repayment, seva, and restraint.",
    includes: Object.freeze([
      "Everything in Shani Dhairya",
      "Year-long guidance calendar",
      "Optional Shanivar vrat discipline",
      "Quarterly Saade Sati phase review",
      "Panchang-aware reminder hooks for major Shani windows"
    ]),
    planFocus: Object.freeze([
      "Keep one year of remedies calm and consistent.",
      "Build quarterly reviews around duty, money, health routine, and family conduct.",
      "Convert Saade Sati pressure into a visible rule of life."
    ])
  }),
  full: Object.freeze({
    id: "full",
    name: "Shani Sampoorna",
    duration: "Remaining period of Saade Sati",
    shagunLabel: "Shagun ke Rs 1111",
    priceRupees: 1111,
    pricePaise: 111100,
    envKey: "SHANI_PLAN_FULL_PRICE_PAISE",
    fullTimeline: true,
    saturdayCount: null,
    cadence: "Remaining period of Saade Sati",
    displayDuration: "Remaining period of Saade Sati",
    promise: "Stay guided through the remaining active Saade Sati or Shani watch period.",
    includes: Object.freeze([
      "Everything in Shani Niyam",
      "Timeline-aware phase transition guidance",
      "Long-term daan, seva, and discipline tracker",
      "Yearly remedy recalibration",
      "High-intensity Shani window alerts"
    ]),
    planFocus: Object.freeze([
      "Keep the remedy aligned until the current Shani window completes.",
      "Review discipline whenever Saturn changes the pressure pattern.",
      "Preserve the lesson after relief begins."
    ])
  })
});

const SHANI_MEMBER_GUIDE_POINTERS = Object.freeze({
  "3m": Object.freeze([
    ["Personal Shani map", "A Moon-sign based direction for the pressure points most active in your chart."],
    ["Weekly upay rhythm", "Friday and Saturday guidance so the remedy stays timely without feeling heavy."],
    ["Daan and seva direction", "Simple offering categories matched to your rashi and membership path."],
    ["Mantra support", "A calm devotional routine with Hanuman Chalisa available freely on the Shani tab."],
    ["Pandit clarity", "Member-only answers when one personal situation needs extra interpretation."]
  ]),
  "6m": Object.freeze([
    ["Personal Shani map", "A deeper Moon-sign route that keeps your remedies consistent for six months."],
    ["Monthly correction", "A guided monthly focus so habits, speech, money, and duty stay aligned."],
    ["Daan and seva direction", "Rotating offering categories designed around your rashi and budget comfort."],
    ["Sankalp support", "A longer devotional discipline path without changing remedies out of fear."],
    ["Pandit clarity", "Member-only guidance for recurring pressure points during the membership."]
  ]),
  "1y": Object.freeze([
    ["Full-year Shani map", "A structured yearly path for discipline, seva, daan, and personal correction."],
    ["Quarterly phase review", "A review rhythm that adjusts your guidance as the Shani pressure matures."],
    ["Vrat and sankalp support", "Optional devotional tracks for users who want a stronger spiritual routine."],
    ["Major Shani windows", "Reminders around important Shani periods so practice feels well timed."],
    ["Pandit clarity", "Member-only guidance when yearly patterns need a calmer interpretation."]
  ]),
  full: Object.freeze([
    ["Complete timeline map", "A long-term Shani path for the remaining period of Saade Sati."],
    ["Phase transition guidance", "Support when the pressure pattern changes and the remedy focus needs refinement."],
    ["Long-term daan and seva direction", "A steady offering path that grows with the user's discipline."],
    ["High-intensity alerts", "Additional guidance around sensitive Shani windows without creating fear."],
    ["Pandit clarity", "Member-only interpretation for personal situations across the remaining timeline."]
  ])
});

export const SHANI_SIGN_REMEDY_PROFILES = Object.freeze({
  Aries: Object.freeze({
    sign: "Aries",
    rashiName: "Mesh",
    theme: "anger, urgency, expenses, sleep, and impulsive decisions",
    fridayPrep: "Write tomorrow's one avoidable expense, one unfinished duty, and one reply that can wait.",
    saturdayRemedy: "Offer black til or footwear as per capacity, recite Hanuman Chalisa, and complete one physical duty before noon.",
    dailyNiyam: "Pause before sharp speech and finish one task before starting a new fight or promise.",
    daan: "Black sesame, footwear, or a simple meal for a worker.",
    seva: "Help someone doing physical labor without making it visible.",
    avoid: "Do not take sudden decisions from anger, pride, or lack of sleep.",
    mantraFocus: "Use Hanuman courage with Shani patience."
  }),
  Taurus: Object.freeze({
    sign: "Taurus",
    rashiName: "Vrishabh",
    theme: "comfort attachment, spending, food discipline, and stubborn emotional holding",
    fridayPrep: "Review one comfort expense and choose one simple food or spending restraint for Saturday.",
    saturdayRemedy: "Donate food, black urad, or daily-use essentials; keep meals simple and do one household duty quietly.",
    dailyNiyam: "Keep money, food, and promises clean instead of using comfort to delay responsibility.",
    daan: "Food grains, black urad, or practical household essentials.",
    seva: "Feed or support someone who works hard for daily needs.",
    avoid: "Do not buy peace through luxury spending or stubborn silence.",
    mantraFocus: "Use steadiness as the remedy."
  }),
  Gemini: Object.freeze({
    sign: "Gemini",
    rashiName: "Mithun",
    theme: "scattered mind, over-talking, messages, study, paperwork, and nervous delay",
    fridayPrep: "Pick one pending document, message, or study task and make it Saturday's first clean action.",
    saturdayRemedy: "Recite 108 Shani mantras, donate stationery or food, and keep one hour free from unnecessary messages.",
    dailyNiyam: "Speak less, document more, and finish one small proof before explaining your intention.",
    daan: "Stationery, books, food packets, or black sesame.",
    seva: "Help a student, younger person, or service worker with a practical task.",
    avoid: "Do not turn anxiety into ten unfinished conversations.",
    mantraFocus: "Use mantra to collect the mind before speech."
  }),
  Cancer: Object.freeze({
    sign: "Cancer",
    rashiName: "Kark",
    theme: "emotional safety, home duty, mother-family sensitivity, and mood-led decisions",
    fridayPrep: "Name one home duty and one emotional trigger that should not control Saturday.",
    saturdayRemedy: "Light a sesame-oil lamp, listen to Hanuman Chalisa, and serve an elder or family need without complaint.",
    dailyNiyam: "Care without emotional debt; make help measurable and repeatable.",
    daan: "Food, milk, blankets, or basic supplies for elders or families in need.",
    seva: "Support an elder, parent figure, or someone emotionally burdened.",
    avoid: "Do not use hurt feelings to postpone practical duty.",
    mantraFocus: "Use prayer to steady the heart before response."
  }),
  Leo: Object.freeze({
    sign: "Leo",
    rashiName: "Singh",
    theme: "ego, authority, father-boss pressure, recognition, and pride in service",
    fridayPrep: "Choose one place where being right can be replaced by being responsible tomorrow.",
    saturdayRemedy: "Serve quietly, donate black til or mustard oil as per capacity, and avoid public display of charity.",
    dailyNiyam: "Let completed work speak before pride, status, or dramatic announcements.",
    daan: "Mustard oil, black sesame, or food for people doing difficult work.",
    seva: "Do one invisible service for a senior, worker, or authority-facing duty.",
    avoid: "Do not make respect the price of doing your duty.",
    mantraFocus: "Use humility as Shani's offering."
  }),
  Virgo: Object.freeze({
    sign: "Virgo",
    rashiName: "Kanya",
    theme: "worry, perfectionism, health routine, service fatigue, and over-analysis",
    fridayPrep: "Write one health routine, one pending cleanup, and one worry that needs a fixed time slot.",
    saturdayRemedy: "Donate medicines only through qualified channels or give food/black urad; clean one neglected space.",
    dailyNiyam: "Make the routine small, exact, and repeatable instead of perfect.",
    daan: "Food, hygiene items, black urad, or practical support for caregivers.",
    seva: "Help in cleaning, organizing, or supporting someone doing service work.",
    avoid: "Do not punish yourself with perfection when consistency is enough.",
    mantraFocus: "Use discipline to calm the body and mind."
  }),
  Libra: Object.freeze({
    sign: "Libra",
    rashiName: "Tula",
    theme: "relationships, contracts, balance, fairness, delayed decisions, and speech diplomacy",
    fridayPrep: "Review one promise, agreement, or relationship boundary that needs fair wording tomorrow.",
    saturdayRemedy: "Donate clothing or footwear, keep speech truthful and soft, and repair one delayed agreement.",
    dailyNiyam: "Choose fairness over pleasing; write the agreement before expecting peace.",
    daan: "Clothing, footwear, black til, or food for someone under social pressure.",
    seva: "Help someone with a practical negotiation, form, queue, or official task.",
    avoid: "Do not hide resentment behind politeness.",
    mantraFocus: "Use balance as discipline."
  }),
  Scorpio: Object.freeze({
    sign: "Scorpio",
    rashiName: "Vrishchik",
    theme: "resentment, control, secrecy, fear, intensity, and emotional extremes",
    fridayPrep: "Name one resentment to release and one private action that would reduce control tomorrow.",
    saturdayRemedy: "Recite Hanuman Chalisa, donate black sesame or food, and avoid revenge speech for the day.",
    dailyNiyam: "Protect depth without turning it into suspicion, control, or punishment.",
    daan: "Black sesame, food, or support for someone in crisis.",
    seva: "Help quietly where pain is real and privacy matters.",
    avoid: "Do not use silence, investigation, or anger as punishment.",
    mantraFocus: "Use Hanuman devotion to convert intensity into courage."
  }),
  Sagittarius: Object.freeze({
    sign: "Sagittarius",
    rashiName: "Dhanu",
    theme: "belief, teachers, travel, law, optimism, and delayed discipline",
    fridayPrep: "Pick one dharmic promise, study, legal document, or travel duty that needs grounded action.",
    saturdayRemedy: "Read a small sacred passage, offer black til or food, and complete one responsibility before advising others.",
    dailyNiyam: "Let dharma show as punctuality, repayment, and truthful conduct.",
    daan: "Books, food, black til, or support for students and teachers.",
    seva: "Serve a teacher, student, temple, or community duty without preaching.",
    avoid: "Do not use philosophy to escape the next practical step.",
    mantraFocus: "Use wisdom only after duty is visible."
  }),
  Capricorn: Object.freeze({
    sign: "Capricorn",
    rashiName: "Makar",
    theme: "overwork, duty burden, harsh self-control, career pressure, and fatigue",
    fridayPrep: "List the oldest duty, one realistic work block, and one rest boundary for Saturday.",
    saturdayRemedy: "Donate black urad or work essentials, respect workers, and finish one duty without adding three more.",
    dailyNiyam: "Do the duty with limits; Shani discipline is not self-punishment.",
    daan: "Black urad, blankets, work tools, or simple food for workers.",
    seva: "Support laborers, guards, cleaners, drivers, or elders with respect.",
    avoid: "Do not confuse exhaustion with devotion.",
    mantraFocus: "Use steady work with humane limits."
  }),
  Aquarius: Object.freeze({
    sign: "Aquarius",
    rashiName: "Kumbh",
    theme: "community duty, isolation, family speech, money structure, and social responsibility",
    fridayPrep: "Choose one community service and one family or money conversation that needs cleaner timing tomorrow.",
    saturdayRemedy: "Serve poor, elderly, disabled, or isolated people; donate black til, food, or warm essentials.",
    dailyNiyam: "Make ideals practical through service, savings, and kinder speech at home.",
    daan: "Food, blankets, assistive essentials, or black sesame.",
    seva: "Support elderly, disabled, poor, or isolated people directly.",
    avoid: "Do not use detachment as an excuse to avoid family duty.",
    mantraFocus: "Use seva as the main Shani remedy."
  }),
  Pisces: Object.freeze({
    sign: "Pisces",
    rashiName: "Meen",
    theme: "emotional fog, sleep, escapism, faith, boundaries, and spiritual confusion",
    fridayPrep: "Set one sleep boundary, one simple prayer, and one avoided duty for Saturday morning.",
    saturdayRemedy: "Listen to Hanuman Chalisa, recite Shani mantra, donate food or black til, and avoid escapist habits.",
    dailyNiyam: "Keep faith practical: sleep, food, one duty, and one clean boundary.",
    daan: "Food, black sesame, blankets, or support for someone emotionally vulnerable.",
    seva: "Help quietly where compassion is needed but boundaries must stay clean.",
    avoid: "Do not replace responsibility with worry, fantasy, or spiritual overthinking.",
    mantraFocus: "Use devotion to create routine, not escape."
  })
});

const PHASE_REMEDIES = Object.freeze({
  1: Object.freeze({
    title: "Rising phase",
    focus: "Simplify obligations before pressure becomes heavier.",
    saturdayAction: "Close one old promise and keep Saturday quieter than usual.",
    caution: "Do not multiply remedies from fear; repeat the simple one cleanly."
  }),
  2: Object.freeze({
    title: "Peak phase",
    focus: "Let maturity show through fewer reactions and more completed duty.",
    saturdayAction: "Before hard speech, finish one practical task and settle the body.",
    caution: "Avoid sudden exits, dramatic vows, and pride-led decisions."
  }),
  3: Object.freeze({
    title: "Setting phase",
    focus: "Close lessons carefully and keep discipline after relief begins.",
    saturdayAction: "Complete one next honest step without reopening old emotional accounts.",
    caution: "Do not drop routine just because pressure feels lighter."
  }),
  0: Object.freeze({
    title: "Outside Saade Sati",
    focus: "Use this window to build protection through order, repayment, and service.",
    saturdayAction: "Make Saturday a reset: clean one space, serve quietly, and finish one small duty.",
    caution: "Do not wait for crisis before becoming organized."
  })
});

export function getShaniPlanDefinition(planId = "3m") {
  return SHANI_PLAN_DEFINITIONS[normalizeShaniPlanId(planId)] || SHANI_PLAN_DEFINITIONS["3m"];
}

export function getShaniPaymentPlanDefinitions() {
  return SHANI_PLAN_DEFINITIONS;
}

export function normalizeShaniPlanId(planId) {
  const value = String(planId || "").toLowerCase().trim();
  if (value === "three-months" || value === "3-months" || value === "3months") return "3m";
  if (value === "six-months" || value === "6-months" || value === "6months") return "6m";
  if (value === "year" || value === "one-year" || value === "1-year" || value === "12m" || value === "12-months") return "1y";
  if (value === "remaining" || value === "timeline" || value === "sampoorna") return "full";
  return value || "3m";
}

export function getShaniSignRemedyProfile(moonSign) {
  return SHANI_SIGN_REMEDY_PROFILES[String(moonSign || "").trim()] || SHANI_SIGN_REMEDY_PROFILES.Pisces;
}

export function getShaniPhaseRemedy(phaseIndex) {
  const index = Number(phaseIndex) || 0;
  return PHASE_REMEDIES[index] || PHASE_REMEDIES[0];
}

export function buildShaniMembershipPlanCatalog() {
  return Object.values(SHANI_PLAN_DEFINITIONS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    duration: plan.duration,
    shagunLabel: plan.shagunLabel,
    priceRupees: plan.priceRupees,
    pricePaise: plan.pricePaise,
    cadence: plan.cadence,
    displayDuration: plan.displayDuration,
    promise: plan.promise,
    includes: [...plan.includes],
    planFocus: [...plan.planFocus]
  }));
}

export function buildShaniRemedyPlanForMembership({ report = {}, membership = {}, now = new Date() } = {}) {
  const plan = getShaniPlanDefinition(membership.planId || membership.plan_id);
  const profile = getShaniSignRemedyProfile(report.moonSign);
  const phase = getShaniPhaseRemedy(report.phaseIndex);
  const generatedAt = parseDate(now).toISOString();
  const saturday = buildSaturdayInstruction({ plan, profile, phase, report, now });

  return {
    generatedAt,
    plan: {
      id: plan.id,
      name: plan.name,
      duration: plan.duration,
      shagunLabel: plan.shagunLabel,
      priceRupees: plan.priceRupees,
      pricePaise: plan.pricePaise,
      cadence: plan.cadence,
      displayDuration: plan.displayDuration,
      promise: plan.promise,
      includes: [...plan.includes],
      focus: [...plan.planFocus]
    },
    memberGuide: buildMemberGuide({ plan, profile }),
    rashi: {
      sign: profile.sign,
      rashiName: profile.rashiName,
      theme: profile.theme,
      fridayPrep: profile.fridayPrep,
      saturdayRemedy: profile.saturdayRemedy,
      dailyNiyam: profile.dailyNiyam,
      daan: profile.daan,
      seva: profile.seva,
      avoid: profile.avoid,
      mantraFocus: profile.mantraFocus
    },
    phaseRemedy: {
      title: report.phaseTitle || phase.title,
      focus: phase.focus,
      saturdayAction: phase.saturdayAction,
      caution: phase.caution
    },
    saturday
  };
}

export function buildSaturdayInstruction({ plan, profile, phase, report = {}, now = new Date() }) {
  const saturdayDate = nextSaturdayDate(now);
  const activeLine = report.active
    ? `${report.phaseTitle || phase.title} asks for ${phase.focus.toLowerCase()}`
    : `${report.phaseTitle || phase.title} is a preparation window for order and service.`;

  return {
    date: saturdayDate.toISOString(),
    dateLabel: formatDate(saturdayDate),
    focus: `${profile.rashiName} Moon: ${profile.theme}`,
    preparation: profile.fridayPrep,
    remedy: profile.saturdayRemedy,
    daan: profile.daan,
    seva: profile.seva,
    niyam: profile.dailyNiyam,
    mantra: "Om Sham Shanaishcharaya Namah, 108 times if possible.",
    audio: "Hanuman Chalisa audio remains free on the Shani tab.",
    planIntensity: `${plan.name} uses ${plan.cadence}.`,
    phaseReason: activeLine,
    caution: `${phase.caution} ${profile.avoid}`
  };
}

export function buildShaniNotificationContent({
  notificationType,
  remedyDate,
  report = {},
  membership = {},
  now = new Date()
} = {}) {
  const plan = getShaniPlanDefinition(membership.planId || membership.plan_id);
  const profile = getShaniSignRemedyProfile(report.moonSign);
  const phase = getShaniPhaseRemedy(report.phaseIndex);
  const targetDate = remedyDate ? parseDate(`${remedyDate}T00:00:00.000Z`) : nextSaturdayDate(now);
  const saturday = buildSaturdayInstruction({ plan, profile, phase, report, now: targetDate });
  const isFriday = notificationType === "friday_preview";
  const title = isFriday
    ? `Tomorrow's Shani upay for ${profile.rashiName} Moon`
    : `Today's Shani upay for ${profile.rashiName} Moon`;
  const intro = isFriday
    ? `Tomorrow is Saturday. Prepare this ${plan.name} remedy calmly tonight.`
    : `Today is Saturday. Keep the ${plan.name} remedy simple and complete.`;

  return {
    type: isFriday ? "friday_preview" : "saturday_reminder",
    title,
    intro,
    body: [
      intro,
      `Focus: ${saturday.focus}.`,
      `Remedy: ${saturday.remedy}`,
      `Daan/seva: ${saturday.daan}; ${saturday.seva}`,
      `Niyam: ${saturday.niyam}`,
      `Mantra: ${saturday.mantra}`,
      `Caution: ${saturday.caution}`
    ].join("\n"),
    remedyDate: formatDateKey(targetDate),
    dateLabel: saturday.dateLabel,
    plan: {
      id: plan.id,
      name: plan.name,
      shagunLabel: plan.shagunLabel
    },
    rashi: {
      sign: profile.sign,
      rashiName: profile.rashiName,
      theme: profile.theme
    },
    saturday
  };
}

function buildMemberGuide({ plan, profile }) {
  const pointers = SHANI_MEMBER_GUIDE_POINTERS[plan.id] || SHANI_MEMBER_GUIDE_POINTERS["3m"];
  return {
    intro: `${plan.name} gives a ${plan.displayDuration || plan.duration} Shani support map shaped for ${profile.rashiName} Moon guidance.`,
    pointers: pointers.map(([title, text]) => ({ title, text }))
  };
}

export function formatShaniPlanPriceLabel(planId) {
  return getShaniPlanDefinition(planId).shagunLabel;
}

function nextSaturdayDate(date) {
  const start = parseDate(date);
  const day = start.getDay();
  const diff = day === 6 ? 0 : (6 - day + 7) % 7;
  return addDays(start, diff);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function formatDate(date) {
  return parseDate(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatDateKey(date) {
  return parseDate(date).toISOString().slice(0, 10);
}
