export function buildFallbackAstroSolveInsight(question = "", user = {}, context = {}, index = 0, date = "") {
  const problem = String(question || "").trim() || "the situation you brought";
  const category = detectAstroSolveProblemType(problem);
  const seed = stableSeed([
    problem,
    user.id,
    user.phone,
    user.email,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    context.birthChart?.ascendant?.sign,
    context.birthChart?.sun?.sign,
    context.birthChart?.moon?.sign,
    context.birthChart?.mercury?.sign,
    context.birthChart?.venus?.sign,
    context.birthChart?.mars?.sign,
    context.birthChart?.jupiter?.sign,
    context.birthMoonMansion?.name,
    context.birthMoonMansion?.pada,
    context.transits?.moon?.sign,
    context.dailyLunarMansion?.name,
    context.dailyLunarMansion?.pada,
    context.dailyLunarDay?.name,
    context.dailyLunarDay?.paksha,
    context.transits?.saturn?.sign,
    context.dailyArea,
    date,
    index
  ].join("|"));
  const parts = buildAstroSolveParts({ problem, user, context, category, seed });

  return {
    id: `problem-${Date.now()}-${index}`,
    problem,
    root: limitWords(pickRoot(parts, seed), 125),
    astrology: limitWords(pickAstrology(parts, seed), 125),
    solution: limitWords(pickSolution(parts, seed), 125)
  };
}

export function buildAstroSolveFingerprint({ user = {}, question = "", context = {}, today = "" } = {}) {
  const category = detectAstroSolveProblemType(question);
  const cue = problemCue(question, category);
  return [
    `problem=${category.label}`,
    `cue=${cue}`,
    `ascendant=${context.birthChart?.ascendant?.sign || "unknown"}`,
    `birthSun=${context.birthChart?.sun?.sign || context.sign || "unknown"}`,
    `birthMoon=${context.birthChart?.moon?.sign || context.moonSign || "unknown"}`,
    `birthNakshatra=${context.birthMoonMansion?.name || context.birthChart?.moon?.lunarMansion?.name || "unknown"}-${context.birthMoonMansion?.pada || context.birthChart?.moon?.lunarMansion?.pada || "unknown"}`,
    `birthMercury=${context.birthChart?.mercury?.sign || "unknown"}`,
    `birthVenus=${context.birthChart?.venus?.sign || "unknown"}`,
    `birthMars=${context.birthChart?.mars?.sign || "unknown"}`,
    `birthJupiter=${context.birthChart?.jupiter?.sign || "unknown"}`,
    `birthSaturn=${context.birthChart?.saturn?.sign || "unknown"}`,
    `transitMoon=${context.transits?.moon?.sign || "unknown"}`,
    `transitNakshatra=${context.dailyLunarMansion?.name || context.transits?.moon?.lunarMansion?.name || "unknown"}-${context.dailyLunarMansion?.pada || context.transits?.moon?.lunarMansion?.pada || "unknown"}`,
    `tithi=${context.dailyLunarDay?.paksha || context.transits?.lunarDay?.paksha || "unknown"} ${context.dailyLunarDay?.name || context.transits?.lunarDay?.name || "unknown"}`,
    `transitSaturn=${context.transits?.saturn?.sign || "unknown"}`,
    `saturnFromNatalMoon=${context.transits?.saturnFromNatalMoon || "unknown"}`,
    `dailyArea=${context.dailyArea || "unknown"}`,
    `emotionalKnot=${context.emotionalKnot || "unknown"}`,
    `decisionGate=${context.decisionGate || "unknown"}`,
    `bodySignal=${context.bodySignal || "unknown"}`,
    `workSignal=${context.workSignal || "unknown"}`,
    `today=${today}`,
    `user=${firstName(user.name)}`
  ].join("; ");
}

export function getAstroSolveContractIssues(answer = {}, { user = {}, question = "", context = {} } = {}) {
  const issues = [];
  const fields = ["root", "astrology", "solution"];
  const fullText = fields.map((field) => answer[field]).filter(Boolean).join("\n");

  for (const field of fields) {
    const count = words(answer[field]).length;
    if (count < 55 || count > 125) {
      issues.push(`${field} expected 55-125 words, got ${count}.`);
    }
  }

  if (isLowQualityAstroSolveText(fullText)) {
    issues.push("matched low-quality or generic Astro Solves phrasing.");
  }
  if (!hasAstrologyCue(answer.astrology)) {
    issues.push("astrology section does not include concrete chart/transit/life-path cues.");
  }
  if (!hasQuestionSpecificCue(fullText, question)) {
    issues.push("answer does not reflect a specific word or concern from the user's question.");
  }
  if (!hasPracticalPlan(answer.solution)) {
    issues.push("solution section needs a clear seven-day practical plan.");
  }
  if (!hasSpiritualPractice(answer.solution)) {
    issues.push("solution section needs one grounded spiritual or remedy-style practice.");
  }
  if (needsProfessionalHelp(question) && !mentionsProfessionalHelp(fullText)) {
    issues.push("safety-sensitive question needs concise professional-help guidance.");
  }
  if (jaccard(answer.root, answer.astrology) > 0.52 || jaccard(answer.root, answer.solution) > 0.52 || jaccard(answer.astrology, answer.solution) > 0.52) {
    issues.push("sections are too similar to each other.");
  }
  if (countWord(fullText, firstName(user.name)) > 2) {
    issues.push("overused the user's first name.");
  }

  if (!context.birthChart && !context.transits) {
    issues.push("missing astrology context for quality validation.");
  }

  return issues;
}

export function isLowQualityAstroSolveText(text) {
  const normalized = String(text || "").toLowerCase();
  if (!normalized.trim()) return true;

  return [
    /\byou may\b/,
    /\byou might\b/,
    /\byou could\b/,
    /\bmay feel\b/,
    /\bmight feel\b/,
    /\bcould feel\b/,
    /\btrust the process\b/,
    /\bthe universe\b/,
    /\bdivine timing\b/,
    /\bcalm energy\b/,
    /\bpositive energy\b/,
    /\beverything happens\b/,
    /\bstay positive\b/,
    /\bthis phase\b/,
    /\bthis is a time\b/,
    /\bthe root looks\b/,
    /\bthe present pattern\b/,
    /\bin your chart reading\b/,
    /\bjust be patient\b/,
    /\bthings will work out\b/,
    /\blet go and flow\b/
  ].some((pattern) => pattern.test(normalized));
}

function buildAstroSolveParts({ problem, user, context, category, seed }) {
  const ascendant = context.birthChart?.ascendant?.sign || "unknown";
  const sun = context.birthChart?.sun?.sign || context.sign || "unknown";
  const moon = context.birthChart?.moon?.sign || context.moonSign || "unknown";
  const mercury = context.birthChart?.mercury?.sign || "unknown";
  const venus = context.birthChart?.venus?.sign || "unknown";
  const mars = context.birthChart?.mars?.sign || "unknown";
  const jupiter = context.birthChart?.jupiter?.sign || "unknown";
  const saturn = context.birthChart?.saturn?.sign || "unknown";
  const transitMoon = context.transits?.moon?.sign || "unknown";
  const transitMercury = context.transits?.mercury?.sign || "unknown";
  const transitVenus = context.transits?.venus?.sign || "unknown";
  const transitMars = context.transits?.mars?.sign || "unknown";
  const transitJupiter = context.transits?.jupiter?.sign || "unknown";
  const transitSaturn = context.transits?.saturn?.sign || "unknown";
  const saturnDistance = context.transits?.saturnFromNatalMoon || "unknown";
  const moonDistance = context.transits?.moonFromNatalMoon || "unknown";
  const area = readableArea(context.dailyArea);
  const cue = problemCue(problem, category);
  const name = firstName(user.name);
  const decision = lowerFirst(safePhrase(context.decisionGate || category.decision));
  const body = lowerFirst(safePhrase(context.bodySignal || category.body));
  const work = lowerFirst(safePhrase(context.workSignal || category.work));
  const knot = lowerFirst(safePhrase(context.emotionalKnot || category.rootPattern));
  const stabilizer = lowerFirst(safePhrase(context.stabilizer || category.stabilizer));
  const avoid = lowerFirst(safePhrase(context.avoid || category.avoid));
  const remedy = remedyFor(category, seed);

  return {
    problem,
    category,
    seed,
    name,
    ascendant,
    sun,
    moon,
    mercury,
    venus,
    mars,
    jupiter,
    saturn,
    transitMoon,
    transitMercury,
    transitVenus,
    transitMars,
    transitJupiter,
    transitSaturn,
    saturnDistance,
    moonDistance,
    area,
    cue,
    decision,
    body,
    work,
    knot,
    stabilizer,
    avoid,
    remedy
  };
}

function pickRoot(parts, seed) {
  const routedRoot = pickCategoryRoot(parts, seed);
  if (routedRoot) return routedRoot;

  const { category, cue, knot, stabilizer, avoid, name } = parts;
  const templates = [
    `The root is not a lack of strength; it is ${category.rootPattern}, now showing up through ${cue}. ${name} is trying to solve the emotional cost before taking the practical step, so the situation keeps demanding more thought than action. When ${knot}, every delay starts carrying extra meaning. Bring the problem back to what can be named, requested, refused, or completed. The discomfort is information about ${category.boundary}, not proof that the entire path is wrong.`,
    `Under this problem sits ${category.rootPattern}. The visible issue is ${cue}, but the heavier layer is the way ${avoid} has been protecting short-term comfort while increasing long-term pressure. The mind keeps searching for a perfect feeling before making a clean move. That keeps the pattern alive. Treat the situation as a boundary and timing problem first: reduce the emotional load, choose the next visible action, and use this stabilizer as proof: ${stabilizer}.`,
    `The root pattern is ${category.rootPattern}, especially around ${cue}. This is why the problem feels larger after silence, delay, or another round of private analysis. A part of you is trying to prevent regret by holding every option open, but the cost is growing confusion. The real work is to separate responsibility from self-punishment. Once the actual request, limit, or next step is named, the emotional pressure loses some authority.`,
    `${capitalize(category.label)} is the surface; the root is ${category.rootPattern}. The question points to ${cue}, which has become a place where attention, fear, and duty are mixing together. That blend makes ordinary next steps feel like final verdicts. Do not treat the strongest emotion as the whole truth. Treat it as a signal to slow the reaction, clarify the cost, and choose the action that protects self-respect after the mood changes.`
  ];
  return templates[mod(seed + templateBias(category), templates.length)];
}

function pickAstrology(parts, seed) {
  const routedAstrology = pickCategoryAstrology(parts, seed);
  if (routedAstrology) return routedAstrology;

  const { category, ascendant, sun, moon, mercury, venus, mars, jupiter, saturn, transitMoon, transitMercury, transitMars, transitJupiter, transitSaturn, saturnDistance, moonDistance, area, cue, decision, work } = parts;
  const templates = [
    `Ascendant in ${ascendant} shows the surface response, Moon in ${moon} shows where the nervous system seeks safety, and Sun in ${sun} describes how confidence returns through action. Mercury in ${mercury} and Mars in ${mars} add the speech/action style behind ${cue}. Today, transit Moon in ${transitMoon} is ${moonDistance} signs from the natal Moon; transit Saturn in ${transitSaturn} is ${saturnDistance} signs away. With Jupiter in ${jupiter}, the chart points toward this decision gate: ${decision}, not another spiral.`,
    `The chart links this question to ${area}. Natal Moon in ${moon} reacts strongly to ${category.sensitivity}, while ascendant ${ascendant} shows the first visible defense. Venus in ${venus} shows the relational cost; Saturn in ${saturn}, with transit Saturn now ${saturnDistance} signs from the Moon, presses for maturity rather than speed. Transit Mercury in ${transitMercury} makes wording matter. This does not decide the outcome for you; it shows why ${cue} needs structure, fewer assumptions, and this work signal: ${work}.`,
    `Astrologically, this is a timing problem more than a simple mood. Natal Moon in ${moon} describes the emotional reflex; transit Moon in ${transitMoon}, ${moonDistance} signs away, brings the reflex into the day. Mars in ${mars} shows how pressure moves, while transit Jupiter in ${transitJupiter} points to the wiser frame. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the natal Moon, asks for accountability around ${category.saturnLesson}. With the daily area focused on ${area}, ${cue} becomes the doorway.`,
    `The strongest chart signal is the relationship between natal Moon in ${moon}, natal Saturn in ${saturn}, and today's Moon in ${transitMoon}. The Moon shows the felt need, Saturn shows discipline, Mercury in ${mercury} shows the wording pattern, and Sun in ${sun} shows how confidence returns through action. Transit Mars in ${transitMars} adds urgency, so ${cue} is not random; it is where the pattern is visible today. Use the astrology as a map for timing: act after the body settles, then keep the next step concrete.`
  ];
  return templates[mod(seed + 5 + templateBias(category), templates.length)];
}

function pickSolution(parts, seed) {
  const routedSolution = pickCategorySolution(parts, seed);
  if (routedSolution) return routedSolution;

  const { category, cue, decision, body, work, remedy } = parts;
  const safety = needsProfessionalHelp(parts.problem)
    ? " If harm, severe distress, health symptoms, abuse, or legal risk is involved, contact a qualified professional or trusted local support alongside this guidance."
    : "";
  const templates = [
    `For seven days, make the issue measurable. Days 1 and 2: write the exact question behind ${cue}, then remove one assumption from it. Days 3 to 5: take one action before noon connected to this work signal: ${work}. Days 6 and 7: review what changed when the response stayed shorter and cleaner. Keep the remedy simple: ${remedy}. Let discipline come before reassurance, then decide from evidence instead of pressure.${safety}`,
    `Use a 7-day repair plan. First, use this body cue before any reply, payment, promise, or decision connected to ${cue}: ${body}. Second, choose one visible commitment and finish it before asking for more certainty. Third, use this rule: ${decision}. The spiritual practice is modest: ${remedy}. If another person is involved, speak once with clarity, then watch behavior. If work is involved, let the completed task carry the argument.${safety}`,
    `For the next week, do not try to solve the whole story. Day 1: name the cost of ${cue}. Day 2: choose the smallest clean action. Days 3 to 5: repeat that action at the same time so the mind stops bargaining. Days 6 and 7: record what became lighter. Add one remedy-style anchor: ${remedy}. The solution is steady containment, not dramatic proof, and it works only when the boundary is visible.${safety}`,
    `Start with a practical container for seven days: one written boundary, one scheduled action, and one evening review. Tie the boundary to ${cue}; tie the action to this work signal: ${work}; tie the review to whether your body felt cleaner after the choice. Use this body cue before reacting: ${body}. For a spiritual anchor, ${remedy}. This gives the chart's Saturn lesson a place to land: responsibility without self-abandonment, patience without passive waiting.${safety}`
  ];
  return templates[mod(seed + 11 + templateBias(category), templates.length)];
}

function pickCategoryRoot(parts) {
  const { category, cue, knot, avoid, name } = parts;
  const routes = {
    relationship: `The root is the way silence has become a measuring stick for safety. ${name} is not only deciding whether to wait; the deeper question is whether love is being proven through steady behavior or through repeated reassurance. Around ${cue}, the mind keeps trying to prevent loss by becoming more available. That slowly weakens self-respect. The clean work is to separate patience from self-abandonment, then ask for a pattern that can be observed, not just promised.`,
    career: `The portfolio delay is not only procrastination; it is effort waiting for recognition before it becomes visible. Around ${cue}, the private standard has grown so large that starting feels like exposing the unfinished version of yourself. When ${knot}, the work becomes a referendum instead of a task. The root is to make progress observable again: a draft, a deadline, a proof of effort, and less comparison before the first version exists.`,
    "money-family": `Financial support has lost its edges, so care is beginning to feel like pressure. Around ${cue}, the problem is not love; it is love without a number, date, or limit. Resentment appears when generosity has no container and fear has to manage the budget alone. The root work is to stop treating every family need as an emergency. Help can stay respectful while becoming more specific, and guilt does not need to manage the account.`,
    "study-health": `Broken sleep is the body refusing to carry exam pressure without structure. Around ${cue}, anxiety is not the enemy; it is the alarm that routine has become too negotiable. The mind is trying to study, predict, recover, and judge itself at the same time. That overload turns rest into another performance. The root is to rebuild rhythm before demanding confidence: food, sleep, timed revision, and fewer late-night interpretations of fear.`,
    "business-boundary": `The business question is not whether your friend is good; it is whether the terms are clean enough to protect the friendship and the work. Around ${cue}, instinct is reacting to a missing contract, role, number, or exit rule. The root is pressure to be agreeable before the risk is named. Do not turn discomfort into suspicion, but do not turn loyalty into blind consent either. Fairness needs written shape before trust carries it.`
  };
  return routes[category.id] || "";
}

function pickCategoryAstrology(parts) {
  const { category, ascendant, sun, moon, mercury, venus, mars, jupiter, saturn, transitMoon, transitVenus, transitMars, transitJupiter, transitSaturn, saturnDistance, moonDistance, area, cue } = parts;
  const routes = {
    relationship: `Birth Moon in ${moon} shows how emotional safety is registered, Venus in ${venus} shows how affection seeks proof, and ascendant ${ascendant} shows the first visible defense. With transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, ${cue} becomes louder today. Natal Saturn in ${saturn}, with transit Venus in ${transitVenus} and transit Saturn in ${transitSaturn} ${saturnDistance} signs from the Moon, presses for patient truth rather than chasing closeness. The daily area of ${area} says the useful move is timing, evidence, and a boundary that stays warm.`,
    career: `For work, the chart points to visibility being rebuilt through discipline. Sun in ${sun} wants the work to carry identity; Mercury in ${mercury} shows the planning voice, and Mars in ${mars} shows how effort moves under pressure. Saturn in ${saturn}, with transit Saturn ${saturnDistance} signs from the natal Moon, makes unfinished craft feel heavy until it has a schedule. Transit Mars in ${transitMars} activates the need for action under ${area}, so ${cue} is the practical doorway. Astrology is pointing to visible output, not another private confidence test.`,
    "money-family": `This money-family pattern is strongly Saturnian, but Jupiter in ${jupiter} shows the wisdom available when duty has proportion. Natal Moon in ${moon} shows the emotional bond, while Saturn in ${saturn} describes the responsibility that has to become measurable. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the natal Moon, presses for boundaries; transit Jupiter in ${transitJupiter} shows where support can become wiser. Because the daily area highlights ${area}, ${cue} is the chart's teaching point: generosity needs structure before it can stay loving.`,
    "study-health": `The chart ties this to Moon rhythm, Mercury habits, and Saturn discipline. Natal Moon in ${moon} shows how quickly the nervous system responds to pressure, while Mercury in ${mercury} shows how attention organizes itself. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, agitates the daily routine; transit Saturn in ${transitSaturn}, ${saturnDistance} signs away, asks for repeatable effort. With the daily area focused on ${area}, ${cue} is a body-timing signal, not a verdict on ability.`,
    "business-boundary": `The business signal comes through Saturn, Mercury, and Mars together. Natal Saturn in ${saturn} describes responsibility, Mercury in ${mercury} describes terms, and Mars in ${mars} shows how quickly action wants to move. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the natal Moon, demands due diligence. Moon in ${moon} senses the relational cost, while Sun in ${sun} wants agency. Transit Moon in ${transitMoon} brings ${cue} into focus under ${area}. The chart does not say reject the deal; it says write the terms before trust does the work.`
  };
  return routes[category.id] || "";
}

function pickCategorySolution(parts) {
  const { category, cue, body, work, remedy, problem } = parts;
  const safety = needsProfessionalHelp(problem)
    ? " If harm, severe distress, health symptoms, abuse, or legal risk is involved, contact a qualified professional or trusted local support alongside this guidance."
    : "";
  const routes = {
    relationship: `For seven days, stop measuring love through response speed. Day 1: write the boundary you need around ${cue}. Day 2: send one calm question, not a long defense. Days 3 to 5: watch whether behavior becomes steadier without chasing. Days 6 and 7: decide from the pattern, not the apology. Use this body cue before replying: ${body}. For the remedy, ${remedy}.${safety}`,
    career: `For seven days, make the portfolio impossible to keep invisible. Day 1: choose one piece and define finished in writing. Day 2: create a rough version before checking reactions. Days 3 to 5: spend one protected block improving it, guided by this work signal: ${work}. Days 6 and 7: share or archive the result as evidence. Keep the remedy practical: ${remedy}.${safety}`,
    "money-family": `Use a seven-day money boundary plan. Day 1: write the amount, date, and limit connected to ${cue}. Day 2: separate emergency help from regular support. Days 3 to 5: communicate the number once without apologizing for clarity. Days 6 and 7: review whether resentment lowered when the boundary stayed visible. Use this body cue first: ${body}. For the remedy, ${remedy}.${safety}`,
    "study-health": `For seven days, protect the body before asking the mind to perform. Day 1: fix the sleep and wake window. Day 2: make a small exam map. Days 3 to 5: repeat one timed study block before messages. Days 6 and 7: review sleep, food, and revision honestly. Use this body cue: ${body}. The remedy is simple: ${remedy}. Confidence returns through rhythm, not late-night pressure.${safety}`,
    "business-boundary": `For seven days, move the deal from emotion into terms. Day 1: write role, money, time, ownership, and exit rules. Day 2: ask your friend for the same in writing. Days 3 to 5: compare gaps without defending your instinct. Days 6 and 7: decide only after one neutral review. Use this work signal: ${work}. For the remedy, ${remedy}.${safety}`
  };
  return routes[category.id] || "";
}

function detectAstroSolveProblemType(problem) {
  const lower = String(problem || "").toLowerCase();
  const match = PROBLEM_TYPES.find((type) => type.pattern.test(lower));
  return match || PROBLEM_TYPES[PROBLEM_TYPES.length - 1];
}

const PROBLEM_TYPES = [
  {
    id: "business-boundary",
    label: "business partnership",
    pattern: /\b(business partner|partnership|deal|contract|equity|startup|client deal|unfair|terms|investment)\b/i,
    rootPattern: "ambition looking for agreement before the terms are clean",
    boundary: "fair terms, written responsibility, and visible risk",
    sensitivity: "mixed incentives, unclear promises, and pressure to trust too quickly",
    saturnLesson: "contracts, accountability, and patient due diligence",
    decision: "name the cost before accepting the request",
    body: "walk before deciding",
    work: "document progress before judging it",
    stabilizer: "one written term sheet reviewed slowly",
    avoid: "rushing trust to protect the relationship"
  },
  {
    id: "relationship",
    label: "relationship pain",
    pattern: /\b(love|partner|marriage|relationship|breakup|trust|silent|silence|ex|dating|husband|wife)\b/i,
    rootPattern: "attachment turning another person's response into proof of safety",
    boundary: "access, timing, and emotional respect",
    sensitivity: "mixed signals, silence, and the fear of being replaced",
    saturnLesson: "commitment, boundaries, and patient truth",
    decision: "send the message only after simplifying it",
    body: "eat before the difficult conversation",
    work: "answer the practical question first",
    stabilizer: "a shorter, clearer conversation",
    avoid: "repeated explanations"
  },
  {
    id: "career",
    label: "career pressure",
    pattern: /\b(job|career|work|boss|office|business|portfolio|recognition|promotion|client|startup)\b/i,
    rootPattern: "effort being tied to recognition before the work has a visible container",
    boundary: "time, output, and fair accountability",
    sensitivity: "delayed credit, comparison, and unfinished proof",
    saturnLesson: "craft, consistency, and earned authority",
    decision: "complete the visible task before the emotional debate",
    body: "step away from the screen before choosing words",
    work: "document progress before judging it",
    stabilizer: "one finished draft or metric",
    avoid: "scattered effort"
  },
  {
    id: "money-family",
    label: "money and family duty",
    pattern: /\b(money|loan|debt|salary|family|parent|mother|father|sibling|home|support|expense|rent)\b/i,
    rootPattern: "care becoming financially shapeless until love starts feeling like pressure",
    boundary: "help that has a number, a date, and a limit",
    sensitivity: "guilt, obligation, and fear of disappointing family",
    saturnLesson: "resource boundaries and responsible generosity",
    decision: "name the cost before accepting the request",
    body: "drink water before calling it intuition",
    work: "turn the vague plan into a visible appointment",
    stabilizer: "a written amount and repayment rule",
    avoid: "over-functioning"
  },
  {
    id: "study-health",
    label: "study, anxiety, and body rhythm",
    pattern: /\b(study|exam|sleep|anxiety|stress|tired|health|panic|fear|body|food|ill|doctor)\b/i,
    rootPattern: "the body carrying pressure that the mind keeps postponing",
    boundary: "routine, recovery, and realistic effort",
    sensitivity: "uncertainty, tiredness, and mental overload",
    saturnLesson: "daily rhythm and sustainable discipline",
    decision: "take care of the body before naming the problem",
    body: "walk before deciding",
    work: "make the action plain enough to complete",
    stabilizer: "food, sleep, and one timed study block",
    avoid: "negotiating with exhaustion"
  },
  {
    id: "decision",
    label: "decision confusion",
    pattern: /\b(should|choice|choose|decision|confused|move|relocate|leave|stay|start|stop|risk)\b/i,
    rootPattern: "waiting for certainty to remove the responsibility of choosing",
    boundary: "truth, timing, and the cost of delay",
    sensitivity: "regret, judgment, and imagined accusation",
    saturnLesson: "discernment and consequence",
    decision: "let one answer be enough for the day",
    body: "let the body get neutral before you call it a sign",
    work: "close the loop that already has enough information",
    stabilizer: "one reversible step tested honestly",
    avoid: "asking for more signs"
  }
];

function readableArea(area) {
  const lower = String(area || "").toLowerCase();
  if (lower.includes("money")) return "money, restraint, and self-worth";
  if (lower.includes("relationship")) return "relationship timing and unspoken expectation";
  if (lower.includes("family")) return "family duty and private fatigue";
  if (lower.includes("health")) return "health rhythm, food, and nervous-system recovery";
  if (lower.includes("public") || lower.includes("ambition")) return "public work, ambition, and delayed recognition";
  if (lower.includes("creative") || lower.includes("visibility")) return "creative voice, visibility, and first attempts";
  if (lower.includes("friendship") || lower.includes("belonging")) return "belonging pressure and social access";
  if (lower.includes("sleep") || lower.includes("closure")) return "closure, forgiveness, and sleep";
  if (lower.includes("learning") || lower.includes("discipline")) return "learning, discipline, and scattered attention";
  if (lower.includes("home")) return "home rhythm, rest, and emotional privacy";
  return safePhrase(area || "responsibility, timing, and emotional steadiness");
}

function problemCue(problem, category) {
  const lower = String(problem || "").toLowerCase();
  const cues = {
    relationship: [
      ["silent", "the silence after conflict"],
      ["trust", "trust becoming a test"],
      ["breakup", "the breakup question"],
      ["partner", "your partner's mixed signals"],
      ["marriage", "the marriage pressure"]
    ],
    career: [
      ["portfolio", "the delayed portfolio"],
      ["recognition", "the need for visible recognition"],
      ["boss", "the pressure from authority"],
      ["client", "the client commitment"],
      ["business", "the business decision"],
      ["work", "the unfinished work"]
    ],
    "money-family": [
      ["parent", "the responsibility toward parents"],
      ["family", "the family obligation"],
      ["money", "the money pressure"],
      ["debt", "the debt pressure"],
      ["support", "the support you provide"]
    ],
    "study-health": [
      ["exam", "the exam pressure"],
      ["sleep", "the broken sleep"],
      ["anxiety", "the anxiety before performance"],
      ["health", "the health concern"],
      ["study", "the study rhythm"]
    ],
    "business-boundary": [
      ["business", "the business decision"],
      ["partner", "the partnership terms"],
      ["deal", "the deal terms"],
      ["unfair", "the unfair exchange"],
      ["terms", "the unclear terms"],
      ["friend", "the friendship inside the business choice"]
    ],
    decision: [
      ["move", "the move you keep weighing"],
      ["leave", "the question of leaving"],
      ["stay", "the question of staying"],
      ["start", "the beginning you keep delaying"],
      ["risk", "the risk you keep measuring"]
    ]
  };
  const match = (cues[category.id] || []).find(([needle]) => lower.includes(needle));
  if (match) return match[1];
  const tokens = significantQuestionTokens(problem).slice(0, 3);
  return tokens.length ? `the concern around ${tokens.join(", ")}` : category.label;
}

function templateBias(category) {
  return {
    relationship: 0,
    career: 1,
    "money-family": 2,
    "study-health": 3,
    "business-boundary": 1,
    decision: 2
  }[category.id] || 0;
}

function remedyFor(category, seed) {
  const base = {
    relationship: [
      "light a lamp after sunset, take nine slow breaths, and ask to speak with respect instead of fear",
      "sit silently for five minutes before replying, then write the sentence you can stand by tomorrow"
    ],
    career: [
      "begin the work block with nine steady breaths, then keep the phone away until the first draft exists",
      "place a small lamp or clean notebook near the desk and start with one measurable task before checking reactions"
    ],
    "money-family": [
      "write the amount, date, and limit by hand, then offer a quiet prayer for generous but disciplined care",
      "give a small act of charity within your means, then return to the written budget without guilt"
    ],
    "study-health": [
      "keep a morning water ritual, nine slow breaths, and a fixed sleep alarm before judging your capacity",
      "walk for ten minutes, sit quietly for five, and begin the first study block before opening messages"
    ],
    decision: [
      "light a lamp, write the honest cost of each option, and sleep once before making the final call",
      "sit for nine breaths with both feet on the floor, then choose the reversible next step rather than the whole future"
    ],
    "business-boundary": [
      "light a lamp beside the written terms, take nine breaths, and ask for clean judgment before agreement",
      "write the risk, money, role, and exit rule by hand, then sit quietly for five minutes before replying"
    ]
  };
  const options = base[category.id] || base.decision;
  return options[mod(seed, options.length)];
}

function hasAstrologyCue(text) {
  return /\b(Moon|Saturn|Sun|transit|natal|birth|life path|chart|daily area|sign|house)\b/i.test(String(text || ""));
}

function hasQuestionSpecificCue(text, question) {
  const tokens = significantQuestionTokens(question);
  if (!tokens.length) return true;
  const normalized = String(text || "").toLowerCase();
  return tokens.some((token) => normalized.includes(token) || (token.endsWith("s") && normalized.includes(token.slice(0, -1))));
}

function hasPracticalPlan(text) {
  return /\b(seven days|7 days|7-day|next week|days 1|day 1|days 3|day 2|day 6)\b/i.test(String(text || ""));
}

function hasSpiritualPractice(text) {
  return /\b(lamp|breath|prayer|quiet|silently|charity|ritual|remedy|spiritual|gratitude|mantra|offering)\b/i.test(String(text || ""));
}

function needsProfessionalHelp(text) {
  return /\b(suicide|self-harm|abuse|violence|threat|unsafe|legal|court|police|health|doctor|panic|severe|harm|assault)\b/i.test(String(text || ""));
}

function mentionsProfessionalHelp(text) {
  return /\b(qualified professional|professional|doctor|therapist|lawyer|police|trusted local support|emergency)\b/i.test(String(text || ""));
}

function significantQuestionTokens(text) {
  const stop = new Set([
    "the", "and", "for", "with", "that", "this", "from", "about", "should", "what", "when", "where",
    "why", "how", "keep", "feel", "feels", "feeling", "because", "before", "after", "really", "right",
    "left", "have", "has", "into", "more", "less", "they", "them", "their", "there", "been", "being",
    "will", "would", "can", "cannot", "could", "might", "just", "very", "again", "every", "even", "over"
  ]);
  return words(String(text || "").toLowerCase())
    .map((word) => word.replace(/[^a-z0-9-]/g, ""))
    .filter((word) => word.length > 3 && !stop.has(word))
    .slice(0, 12);
}

function isLowValueSimilarityToken(word) {
  return new Set([
    "the", "and", "for", "with", "that", "this", "your", "you", "one", "into", "from", "than", "then",
    "when", "what", "where", "while", "before", "after", "through", "around", "because", "problem"
  ]).has(word);
}

function jaccard(first, second) {
  const firstSet = new Set(words(String(first || "").toLowerCase()).map(cleanToken).filter((word) => word && !isLowValueSimilarityToken(word)));
  const secondSet = new Set(words(String(second || "").toLowerCase()).map(cleanToken).filter((word) => word && !isLowValueSimilarityToken(word)));
  const intersection = [...firstSet].filter((word) => secondSet.has(word)).length;
  const union = new Set([...firstSet, ...secondSet]).size || 1;
  return intersection / union;
}

function countWord(text, word) {
  if (!word) return 0;
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}

function limitWords(text, maxWords) {
  const list = words(text);
  if (list.length <= maxWords) return String(text || "");
  return `${list.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function cleanToken(text) {
  return String(text || "").replace(/[^a-z0-9-]/g, "");
}

function safePhrase(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function capitalize(text) {
  const value = safePhrase(text);
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";
}

function lowerFirst(text) {
  const value = safePhrase(text);
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : "";
}

function stableSeed(text) {
  let hash = 2166136261;
  for (const char of String(text || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function mod(value, length) {
  return ((Number(value) || 0) % length + length) % length;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
