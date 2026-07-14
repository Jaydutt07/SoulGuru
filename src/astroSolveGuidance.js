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
  const topic = specificProblemTopic(problem);
  const cue = problemCue(problem, category, topic);
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
    topic,
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
  const specificRoot = pickSpecificRoot(parts, seed);
  if (specificRoot) return specificRoot;

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
  const specificAstrology = pickSpecificAstrology(parts, seed);
  if (specificAstrology) return specificAstrology;

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
  const specificSolution = pickSpecificSolution(parts, seed);
  if (specificSolution) return specificSolution;

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

function pickSpecificRoot(parts, seed = 0) {
  const { topic, cue, name } = parts;
  const routes = {
    "partner-silence": [
      `The root is not whether ${name} has enough patience; it is that a partner going silent after arguments has turned love into waiting for proof. The nervous place is counting pauses because the agreement after conflict is unclear. Stay or step back should not be decided from panic. First name what respectful repair looks like after a fight: how soon contact returns, what apology means, and what behavior repeats.`,
      `Under the silence after arguments is a missing repair rule. ${name} is being asked to believe loving words while the conflict pattern keeps removing contact. That makes patience feel noble one day and self-abandoning the next. The deeper issue is rhythm after hurt: who returns, who explains, who changes behavior, and how long the gap lasts. The choice becomes clearer when silence is measured as behavior, not interpreted as destiny.`
    ],
    "inlaws-husband": [
      `Divided authority is sitting inside the marriage. The in-laws are loud, but the heavier pain is a husband avoiding a clear stand, which leaves ${name} negotiating with the family system alone. That makes every small interference feel like a vote on loyalty. The repair is not another emotional appeal; it is a marital agreement about privacy, decisions, and who speaks when outside pressure enters the home.`,
      `This is not simply family interference; it is a boundary gap between marriage and extended family. ${name} is carrying the emotional cost because the husband is staying vague where a shared stand is needed. The root is a home rule that has not been named out loud. Without it, every comment from in-laws becomes larger than the actual issue. Start with what the couple must decide privately before anyone else is answered.`
    ],
    "ex-message": [
      `An ex's message is testing unfinished access. It can look like closure, but the body notices whether the message brings peace or pulls ${name} back into monitoring tone, timing, and hidden meaning. The emotional trap is not the text itself; it is answering before the purpose is named. Closure requires a clean frame: what is being asked, whether accountability exists, and whether contact respects the life built after the ending.`,
      `Under the messages from the ex is a test of whether old access still has authority. ${name} is not confused because feelings are weak; the signal is mixed because closure and repetition often use similar words. The root work is to separate nostalgia from evidence. If the message does not name responsibility, timing, or a respectful purpose, the old pattern is trying to reopen without paying its debt.`
    ],
    "friend-cancelling": [
      `Uneven availability is the friendship wound. A closest friend cancelling plans but expecting emotional access has made ${name}'s care easy to call on and easy to postpone. That creates hurt because the friendship has warmth without balanced effort. The issue is not one cancelled plan; it is the repeated rule underneath it. Care needs reciprocity: who makes time, who repairs absence, and whether support is still mutual when someone is upset.`,
      `Under the cancelled plans is a friendship pattern where urgency gets rewarded and ordinary commitment gets ignored. ${name} is being asked to stay available for upset feelings while scheduled time keeps losing value. That makes kindness start to feel used. The root is to stop treating flexibility as proof of loyalty. A friendship can stay loving only when disappointment is named and repair is expected from both sides.`
    ],
    "job-offer": [
      `A salary offer has put written value beside a verbal promise. Better pay is concrete; a current boss promising future growth is only useful if it has date, role, money, and review terms. ${name} is not choosing between loyalty and ambition. The real question is which path respects evidence. If staying requires faith while leaving offers clear terms, the pressure belongs on the promise, not on guilt.`,
      `Under the job offer is a negotiation with proof. ${name} has received a salary signal from the outside, while the current boss is offering growth that still needs shape. The root is fear of disappointing authority before checking whether authority has been fair. Do not let appreciation become a substitute for terms. Compare written salary, role, timeline, learning, and future review before emotion decides the stay-or-leave question.`
    ],
    portfolio: [
      `Visibility is being delayed until confidence feels safe. The portfolio is not only a work sample; it has become the place where ${name} tests whether effort will finally be seen. That makes every unfinished section carry too much emotional weight. The repair is to stop asking the portfolio to prove worth. It only has to prove work: three pieces, one deadline, and one reviewer who can respond to reality.`,
      `Under the delayed portfolio is fear of being visible before the work feels protected. ${name} already does the hard parts, but private effort cannot create public recognition by itself. The root is a missing bridge between effort and evidence. This is not laziness. It is over-identification with the first version. The next step is to make the portfolio inspectable before the inner judge gets another chance to widen the task.`
    ],
    "client-scope": [
      `Scope is changing without a matching payment rule. The client is not only delaying money; they are teaching the project to absorb extra work without consequence. ${name}'s fear of losing the project is understandable, but fear cannot manage a contract. The deeper problem is value leaking through vague approval. The repair is to separate goodwill from deliverables: what changed, what costs extra, and what pauses until payment clears.`,
      `Under the client delays is a professional boundary that has been left verbal for too long. ${name} is trying to protect the project by absorbing scope changes, but that quietly teaches the client that payment can trail behind effort. The root is not lack of talent; it is missing commercial friction. A clean written revision, milestone, and payment checkpoint will protect the work better than another flexible yes.`
    ],
    promotion: [
      `The missed promotion hurts because recognition arrived without a review trail. ${name} is choosing between confrontation and disappearance, but neither is strong without evidence. The pain is real because effort has not been translated into a documented case. The repair is to ask for specifics before deciding. What was missing, what would qualify next time, who owns the timeline, and whether the manager can name measurable growth.`,
      `Under the promotion hurt is a visibility contract that was never made explicit. ${name} is reading the decision as a verdict, yet the practical issue is whether the manager can give clear criteria and a future checkpoint. Leaving quietly protects pride for a moment; confronting without structure can scatter the point. The root work is to turn disappointment into a documented conversation with dates, examples, and a decision deadline.`
    ],
    "family-loan": [
      `A family loan becomes heavy when repayment is treated like an insult to love. ${name} feels ashamed asking for the money back because the relationship is being treated as if it should erase the number. That is where pressure grows. A loan needs dignity on both sides: amount, date, installments, and what happens if payment is delayed. The discomfort is not greed; it is the cost of keeping money invisible.`,
      `Under the heavy family loan is a confusion between kindness and silence. ${name} helped when expenses were real, but now shame is blocking the repayment conversation. The root is fear that asking for money back will make love look conditional. It will not, if the request is clean. Write the exact amount, a realistic date, and one respectful sentence before resentment starts managing the relationship for you.`
    ],
    "parent-support": [
      `Monthly support is being decided by emotion instead of a visible budget. ${name} wants to help parents, but fear and resentment grow when support has no ceiling, review date, or emergency category. The problem is not love. It is duty without accounting. A loving plan must show what is regular, what is temporary, and what cannot be carried alone without damaging the future you are also responsible for.`,
      `Under the support for parents is an old rule that care should be quiet. ${name} is paying with money and emotional tension every month, then feeling guilty for noticing the strain. The root is not selfishness; it is unmeasured responsibility. Put the help into numbers before the next request arrives. Support can remain respectful only when the account, the calendar, and the family expectation are all visible.`
    ],
    "sibling-criticism": [
      `Family responsibility has lost shared ownership. A sibling expecting ${name} to handle every family problem and then criticizing the result creates a double burden: labor first, judgment after. The issue is not only criticism; it is that authority and effort are separated. The repair is to divide tasks before opinions arrive. Whoever wants a voice in the outcome must also take a named part of the work.`,
      `Under the sibling conflict is a family role that has become too convenient for everyone else. ${name} is being made manager of the problem and target of the review. That creates anger because the system rewards criticism more than participation. The root work is to stop accepting vague responsibility. Name the next family issue, assign who does what, and refuse post-task judgment from someone who did not share the load.`
    ],
    "mother-health": [
      `The root is care work becoming invisible because it is constant. Mother's health appointments and household expenses are not small errands; they are logistics, money, time, and emotional vigilance landing on ${name}. Anger is rising because the load has no witness and no rotation. The repair is to turn care into a schedule other people can see: appointments, costs, transport, medicine, and who takes which week.`,
      `Under the anger around mother's appointments is exhaustion from being the default person. ${name} is handling health details and household expenses while everyone else benefits from the order created in the background. The root is not a bad temper; it is an unfair operating system. Make the invisible visible. Put the appointments, bills, calls, and transport into a shared list before another week turns care into resentment.`
    ],
    "sleep-exam": [
      `Broken sleep has become part of the exam itself. ${name} is waking inside the test before the day has started, so the body keeps rehearsing danger even when the mind knows the material. The problem is not ability. It is a routine that lets pressure enter the bed. Preparation must now include a cut-off hour, a morning review slot, and a body signal that says study has ended.`,
      `Under the exam anxiety is a night routine that has lost authority. ${name} knows the material, but broken sleep makes the nervous system act as if every morning is already an emergency. The root is not weak discipline; it is pressure crossing into recovery time. The repair is to protect sleep like part of the syllabus: fixed lights-out, one short morning review, and no late-night proof hunting.`
    ],
    "panic-presentation": [
      `The body is reading presentation pressure as danger before the mind can use what it knows. Chest tightness is not random; it is the physical alarm arriving before ${name} has a reliable pre-speaking sequence. The problem is not lack of preparation. It is that the body has not been given a repeatable opening ritual. Confidence will follow sequence: breath, first slide, first sentence, and one grounded pause.`,
      `Under the panic before presentations is a timing gap between knowledge and embodiment. ${name} knows the material, but the chest tightens because the body has not been shown how the beginning will go. The root is anticipatory pressure, not incompetence. Build a predictable first two minutes: where to stand, what to breathe, which sentence opens, and where the eyes rest before the room is answered.`
    ],
    "burnout-meals": [
      `Burnout is rising because other people's dependence has outranked the body's basic needs. Skipping meals has become proof that ${name} is still useful, but burnout is the bill arriving for that arrangement. The problem is not poor motivation; it is a day that has no protected fuel point. People depending on you does not make hunger negotiable. Care has to start with food, water, and one refusal of false urgency.`,
      `Under the burnout is a loyalty rule that says the body can wait. ${name} keeps pushing because everyone depends on the output, yet skipped meals are turning service into depletion. The root is not laziness or weakness; it is a missing pause that no one else will grant unless it is claimed. Put one meal on the calendar before answering demand, then watch which tasks actually deserved emergency status.`
    ],
    "exam-comparison": [
      `Comparison has turned prepared effort into a public scoreboard. Parents comparing marks with cousins makes ${name}'s body freeze because the exam stops being about learning and becomes about family ranking. The problem is not preparation; it is the meaning being attached to results. The repair is to separate study evidence from comparison noise: what was revised, what improved, and which conversation about marks needs a clear limit.`,
      `Under the freezing around exam marks is pressure to perform for relatives who are not sitting the paper. ${name} prepared, but comparison with cousins turns memory into threat. The root is shame entering the study rhythm. Do not let the family scoreboard become the study plan. The next repair is private and measurable: one topic, one timed mock answer, one review, and one sentence limiting mark comparisons.`
    ],
    "move-abroad": [
      `Moving abroad has become a decision where family guilt and personal growth are sitting in the same chair. Studies are not only distance; for ${name}, they have become a question of whether ambition means abandonment. The parents' need is real, but it still needs a plan rather than a sacrifice made in silence. The repair is to compare options with dates, money, caregiving backup, and the cost of postponing study.`,
      `Under the move-abroad question is loyalty trying to decide logistics by itself. ${name} is weighing studies against staying near parents, but love cannot answer visas, fees, caregiving coverage, and future regret without a written map. The root is not selfishness; it is an unplanned transition. Build two honest scenarios: abroad with support systems, and staying with a deadline for when the study plan reopens.`
    ],
    "cofounder-equity": [
      `Equity is being discussed without matching responsibility. A cofounder asking for more ownership while avoiding more work puts ${name} in the role of protecting fairness before the company hardens around a bad agreement. The discomfort is not pettiness; it is governance speaking early. Equity must follow contribution, risk, decision power, and exit rules. Avoiding the contract talk only lets resentment become part of the cap table.`,
      `Under the cofounder equity issue is a fear that clear terms will damage trust. ${name} is delaying the contract conversation because ambition and friendship are sharing the same room. The root is not mistrust; it is missing accountability. A startup cannot run on implied fairness. Name the responsibilities, vesting, decision rights, and what changes if effort does not match ownership before the company pays for vagueness.`
    ],
    "property-legal": [
      `Family loyalty is colliding with legal paperwork. A property issue with a relative feels heavier because fighting or settling both carry emotional cost, but ${name} cannot decide cleanly while facts and feelings are mixed together. The problem is not courage; it is evidence needing order. Separate documents, timelines, money, and relationship impact before choosing a path. Legal risk deserves professional advice, not only family pressure.`,
      `Under the property paperwork issue is a boundary that arrived late. ${name} is weighing fight versus settlement with a relative, so the decision is carrying both legal exposure and family fallout. The root is incomplete clarity: what papers exist, what is contested, what settlement costs, and what a formal fight requires. Once those are visible, the choice can be made from risk and dignity rather than fear.`
    ],
    "business-partner": [
      `Loyalty is being asked to do the work of terms. A friend becoming a business partner can be good, but ${name}'s sense that the deal is unfair is pointing to missing numbers, roles, risk, or exit rules. The problem is not suspicion. It is the absence of a fair operating agreement. Friendship should make the conversation respectful, not make the contract unnecessary.`,
      `Under the business-partner question is a pressure to protect the friendship by accepting unclear terms. ${name} is sensing unfairness because some part of responsibility, money, control, or risk has not been named. The root is not distrust; it is incomplete design. A fair deal can survive being written down. If writing the terms damages the bond, the bond was already being asked to carry too much.`
    ]
  };

  return pickVariant(routes[topic?.id], seed);
}

function pickSpecificAstrology(parts, seed = 0) {
  const { topic, cue, ascendant, sun, moon, mercury, venus, mars, jupiter, saturn, transitMoon, transitMercury, transitMars, transitJupiter, transitSaturn, saturnDistance, moonDistance, area } = parts;
  const safety = "";
  const topicRoutes = {
    "partner-silence": `Astrologically, the partner's silence after arguments is read through Moon in ${moon}, Venus in ${venus}, and Mars in ${mars}. Moon shows the need for emotional return, Venus shows how affection seeks proof, and Mars shows what happens after conflict. Transit Mercury in ${transitMercury} makes repair language important today. With Saturn in ${saturn} and transit Saturn ${saturnDistance} signs from the Moon, loving words need a repeatable after-argument rule.`,
    "ex-message": `Astrologically, the ex messaging again activates Moon in ${moon}, Venus in ${venus}, and Saturn in ${saturn}. Moon explains why old contact still lands in the body, Venus shows the attachment memory, and Saturn asks whether the past has earned new access. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, brings the old thread into today. Mercury in ${mercury} says the purpose of contact must be named before any emotional door reopens.`,
    portfolio: `Astrologically, the delayed portfolio belongs to Sun in ${sun}, Mercury in ${mercury}, and Saturn in ${saturn}. Sun wants visible authorship, Mercury organizes the examples, and Saturn asks for evidence that can be reviewed. Transit Jupiter in ${transitJupiter} supports public growth when the work leaves private perfection. With transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, invisibility feels personal today, but the chart points to a shareable page, not another internal verdict.`,
    "client-scope": `Astrologically, the changing scope and delayed payment are Mercury-Saturn matters. Mercury in ${mercury} rules wording, invoices, and revisions; Saturn in ${saturn} rules terms, checkpoints, and consequences. Mars in ${mars} shows the pressure to act quickly, while transit Jupiter in ${transitJupiter} supports a wiser commercial frame. Transit Moon in ${transitMoon} makes the project emotionally charged today, but the chart says payment language must lead before more work is absorbed.`,
    "job-offer": `Astrologically, the salary offer and boss promise are weighed through Sun in ${sun}, Jupiter in ${jupiter}, and Saturn in ${saturn}. Sun wants authority, Jupiter measures growth, and Saturn asks whether the promise has dates and responsibility attached. Transit Mars in ${transitMars} adds urgency, while transit Saturn in ${transitSaturn} tests the maturity of the current workplace. With daily area ${area}, the chart favors written terms over loyalty pressure.`,
    promotion: `Astrologically, the missed promotion is shown by Sun in ${sun}, Saturn in ${saturn}, and Mercury in ${mercury}. Sun carries recognition, Saturn names hierarchy, and Mercury asks for criteria rather than guessing. Transit Mars in ${transitMars} can push confrontation, but transit Saturn ${saturnDistance} signs from the Moon asks for a documented review trail. The daily area of ${area} says the manager conversation should produce dates, examples, and next-step conditions.`,
    "parent-support": `Astrologically, monthly support for parents is held by Moon in ${moon}, Jupiter in ${jupiter}, and Saturn in ${saturn}. Moon shows family attachment, Jupiter shows generosity, and Saturn asks for a budget that protects the future. Transit Mercury in ${transitMercury} supports a direct money conversation, while transit Saturn ${saturnDistance} signs from the Moon turns duty into accounting. The chart does not reject care; it asks care to have a ceiling and review date.`,
    "mother-health": `Astrologically, mother's appointments and household expenses sit in the Moon-Saturn field. Moon in ${moon} shows the caregiving reflex, Saturn in ${saturn} shows the labor that becomes invisible, and Jupiter in ${jupiter} shows the wish to keep helping. Transit Mercury in ${transitMercury} favors lists, calls, and shared instructions. With transit Saturn ${saturnDistance} signs from the natal Moon, the chart asks for a rota, not private endurance.`,
    "sleep-exam": `Astrologically, broken sleep before exams is a Moon-Mercury-Saturn problem. Moon in ${moon} shows the body's alarm, Mercury in ${mercury} shows revision loops, and Saturn in ${saturn} asks for a fixed closing ritual. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes the morning alarm louder today. The chart says study must end at a real hour so sleep can become preparation, not a second exam room.`,
    "exam-comparison": `Astrologically, marks being compared with cousins is shown through Moon in ${moon}, Mercury in ${mercury}, and Saturn in ${saturn}. Moon registers family pressure, Mercury rules recall and study method, and Saturn asks for discipline that is not built on shame. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes comparison feel sharper today. The chart points to private revision evidence and one limit around family scorekeeping.`,
    "panic-presentation": `Astrologically, panic before presentations sits in Moon in ${moon}, Mercury in ${mercury}, Mars in ${mars}, and Saturn in ${saturn}. Moon shows the body alarm, Mercury rules the script, Mars rules adrenaline, and Saturn asks for a repeated opening sequence. Transit Jupiter in ${transitJupiter} supports confidence after structure, not before it. The chart points to rehearsing the first two minutes until the body recognizes the room.`,
    "burnout-meals": `Astrologically, burnout and skipped meals are read through Moon in ${moon}, Saturn in ${saturn}, and Mars in ${mars}. Moon shows the body's need, Saturn shows duty, and Mars shows the habit of pushing past fuel. Transit Moon in ${transitMoon} makes hunger and irritation louder today, while transit Jupiter in ${transitJupiter} supports a wiser service rhythm. The chart says food is not a reward after usefulness; it is the base of usefulness.`,
    "business-partner": `Astrologically, a friend becoming a business partner is a Mercury-Saturn test with Venus undertones. Mercury in ${mercury} rules the agreement, Saturn in ${saturn} rules accountability, and Venus in ${venus} shows why friendship makes direct terms feel delicate. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes the unfairness signal hard to ignore today. The chart says affection can remain intact only when capital, labor, voting power, and exit terms are written.`,
    "property-legal": `Astrologically, property paperwork turning legal is carried by Mercury in ${mercury}, Saturn in ${saturn}, and Mars in ${mars}. Mercury governs documents, Saturn governs land, duty, and delay, while Mars shows the fight impulse. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the Moon, demands patience with procedure. Transit Jupiter in ${transitJupiter} supports wise counsel, so the chart favors document review, legal advice, and settlement math before family emotion decides.`
  };
  if (topicRoutes[topic?.id]) return topicRoutes[topic.id];

  const routes = {
    relationship: [
      `Astrologically, ${cue} sits between Moon in ${moon}, Venus in ${venus}, and Saturn in ${saturn}. Moon shows the emotional alarm, Venus shows the need for reciprocal affection, and Saturn demands behavior that can be trusted after the feeling settles. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes the issue louder today. With transit Saturn in ${transitSaturn} ${saturnDistance} signs away, the chart favors measured access, not chasing reassurance.${safety}`,
      `The relationship chart emphasis is Moon in ${moon}, Venus in ${venus}, Mars in ${mars}, and Saturn in ${saturn}. Moon shows sensitivity, Venus shows attachment style, Mars shows conflict response, and Saturn shows where commitment must become visible. Transit Mercury in ${transitMercury} makes wording important, while transit Moon in ${transitMoon} brings ${cue} into today's emotional field. The daily area of ${area} asks for timing, proof, and a request that can be observed.`
    ],
    career: [
      `Astrologically, ${cue} is carried through Sun in ${sun}, Mercury in ${mercury}, Mars in ${mars}, and Saturn in ${saturn}. Sun wants authority, Mercury wants a clear plan, Mars wants movement, and Saturn demands evidence. Transit Mars in ${transitMars} adds urgency, while transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the Moon, asks for mature terms. The daily area of ${area} says this decision needs documents, dates, and reviewable proof.`,
      `The work signal comes through Sun in ${sun}, Mercury in ${mercury}, and Saturn in ${saturn}. Sun describes confidence, Mercury describes negotiation and documents, while Saturn asks for measurable responsibility. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes ${cue} emotionally immediate. Transit Jupiter in ${transitJupiter} supports the wiser frame when ambition is paired with evidence, not only a promise or private resentment.`
    ],
    family: [
      `The chart ties ${cue} to Moon in ${moon}, Jupiter in ${jupiter}, and Saturn in ${saturn}. Moon keeps family duty emotionally alive, Jupiter shows generosity, and Saturn asks that support become structured. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the natal Moon, presses for limits that adults can respect. Transit Moon in ${transitMoon} brings the matter close today, while the daily area of ${area} asks care to become visible, scheduled, and sustainable.`,
      `Astrologically, this family-duty pattern is not only emotional; it is Saturn and Jupiter asking for proportion. Natal Moon in ${moon} shows the bond, Jupiter in ${jupiter} shows the wish to help, and Saturn in ${saturn} shows the cost of carrying too much without rules. Transit Mercury in ${transitMercury} supports a clear conversation about ${cue}. With transit Saturn ${saturnDistance} signs from the Moon, duty needs a number, date, or shared rota.`
    ],
    body: [
      `Astrologically, ${cue} is connected to Moon in ${moon}, Mercury in ${mercury}, Mars in ${mars}, and Saturn in ${saturn}. Moon shows the body's alarm, Mercury shows thought loops, Mars shows adrenaline, and Saturn shows the routine that must become reliable. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes the body louder today. The daily area of ${area} says recovery is not separate from performance; it is part of the remedy.`,
      `The body signal is shown through natal Moon in ${moon}, Mercury in ${mercury}, and transit Saturn in ${transitSaturn}. Moon describes the nervous rhythm, Mercury describes preparation and mental replay, while Saturn demands repeatable structure. Transit Mars in ${transitMars} can push effort too hard, and transit Jupiter in ${transitJupiter} offers steadier judgment once recovery is protected. For ${cue}, the astrology points to sequence: body first, then performance, then review.`
    ],
    business: [
      `Astrologically, ${cue} is a Saturn-Mercury matter. Saturn in ${saturn} rules responsibility and consequences, Mercury in ${mercury} rules wording, documents, and negotiation, while Mars in ${mars} shows how pressure pushes action. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the natal Moon, asks for due diligence before trust carries the agreement. With transit Moon in ${transitMoon} and daily area ${area}, the chart favors written terms over emotional guessing.`,
      `The business signal comes through Mercury in ${mercury}, Saturn in ${saturn}, Mars in ${mars}, and Sun in ${sun}. Mercury handles contracts, Saturn handles accountability, Mars handles urgency, and Sun protects agency. Transit Jupiter in ${transitJupiter} can support a wise agreement, but only when ${cue} is made reviewable. Transit Moon in ${transitMoon}, ${moonDistance} signs from the Moon, makes the discomfort noticeable today so the missing term can be named.`
    ],
    decision: [
      `Astrologically, ${cue} is a decision-timing matter. Moon in ${moon} shows the emotional bond, Mercury in ${mercury} shows the planning voice, Jupiter in ${jupiter} shows the larger opportunity, and Saturn in ${saturn} names the duty that must be respected. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes the question close today. Transit Saturn in ${transitSaturn} asks for a written comparison instead of a guilt-led answer.`,
      `The chart shows ${cue} through Jupiter in ${jupiter}, Saturn in ${saturn}, and Mercury in ${mercury}. Jupiter expands the future path, Saturn insists on duty and consequence, and Mercury requires a concrete plan. Transit Jupiter in ${transitJupiter} supports wise growth, while transit Saturn ${saturnDistance} signs from the natal Moon keeps responsibilities visible. The daily area of ${area} says the answer needs dates, costs, support systems, and one reversible test.`
    ]
  };
  return pickVariant(routes[specificTopicAstrologyLane(topic?.id)], seed);
}

function pickSpecificSolution(parts, seed = 0) {
  const { topic, cue, body, work, remedy, problem } = parts;
  const safety = needsProfessionalHelp(problem)
    ? " If health, legal, safety, abuse, or severe distress is involved, also contact a qualified professional or trusted local support."
    : "";
  const routes = {
    "partner-silence": `For seven days, stop guessing from silence. Day 1: write what repair after arguments must include. Day 2: ask your partner one direct question about contact after conflict. Days 3 to 5: do not chase; note whether behavior changes. Days 6 and 7: decide if patience still protects dignity. Before replying, use ${body}. Remedy: ${remedy}.${safety}`,
    "inlaws-husband": `Use a 7-day marriage-boundary plan. Day 1: write the private couple rule about in-laws. Day 2: ask your husband for one specific stand he will take. Days 3 to 5: keep the conversation about the marriage agreement, not every family comment. Days 6 and 7: review action, not reassurance. Before the talk, use ${body}. Remedy: ${remedy}.${safety}`,
    "ex-message": `For seven days, give the ex's message a gate. Day 1: write the purpose of any reply. Day 2: ask for one clear reason for contact if needed. Days 3 to 5: avoid emotional back-and-forth without accountability. Days 6 and 7: keep or close access based on behavior. Use ${body} before answering. Remedy: ${remedy}.${safety}`,
    "friend-cancelling": `Use a 7-day friendship reset. Day 1: list the last two cancelled plans and the support expected from you. Day 2: state one availability rule kindly. Days 3 to 5: stop rescuing every upset moment immediately. Days 6 and 7: watch whether effort becomes mutual. Use ${body} before agreeing to new access. Remedy: ${remedy}.${safety}`,
    "job-offer": `For the next week, compare proof, not emotion. Day 1: write salary, role, title, and joining terms from the offer. Day 2: ask your boss for growth terms in writing with dates. Days 3 to 5: compare learning, money, and credibility. Days 6 and 7: choose the path with clearer evidence. Use ${body} before work messages. Remedy: ${remedy}.${safety}`,
    portfolio: `Use a 7-day visibility plan. Day 1: pick three portfolio pieces. Day 2: make one rough page public or reviewable. Days 3 to 5: improve one section each day before checking reactions. Day 6: ask one person for specific feedback. Day 7: submit or share the link. Let ${work} guide the action. Remedy: ${remedy}.${safety}`,
    "client-scope": `For seven days, protect the project with terms. Day 1: list every scope change. Day 2: write the payment and revision checkpoint. Days 3 to 5: send one clear update: new scope needs new approval or payment. Days 6 and 7: continue only where terms are honored. Use ${body} before replying from fear. Remedy: ${remedy}.${safety}`,
    promotion: `Use a 7-day promotion clarity plan. Day 1: write examples of delivered work. Day 2: request feedback with criteria. Days 3 to 5: document achievements and gaps. Day 6: ask for a review date or growth path. Day 7: decide whether the manager can offer evidence or only delay. Use ${body} before confronting. Remedy: ${remedy}.${safety}`,
    "family-loan": `For seven days, make repayment respectful and concrete. Day 1: write the exact loan amount. Day 2: choose a repayment date or installment plan. Days 3 to 5: send one calm request without apology. Days 6 and 7: record the response and adjust future help accordingly. Use ${body} before calling. Remedy: ${remedy}.${safety}`,
    "parent-support": `Use a 7-day family-budget plan. Day 1: write the regular support amount. Day 2: separate emergency help from monthly help. Days 3 to 5: share the number and review date once. Days 6 and 7: stop adding unplanned expenses without a pause. Use ${body} before promising. Remedy: ${remedy}.${safety}`,
    "sibling-criticism": `For seven days, divide family work before doing it. Day 1: name the next problem clearly. Day 2: assign one task to your sibling in writing. Days 3 to 5: do only your part. Days 6 and 7: refuse criticism that arrives without shared labor. Use ${body} before reacting. Remedy: ${remedy}.${safety}`,
    "mother-health": `Use a 7-day care rota. Day 1: list appointments, medicines, bills, and transport. Day 2: ask one family member to own a named task. Days 3 to 5: move costs into a shared note. Days 6 and 7: review what stopped falling only on you. Use ${body} before the next call. Remedy: ${remedy}.${safety}`,
    "sleep-exam": `For seven days, make sleep part of exam preparation. Day 1: set a fixed cut-off hour. Day 2: move revision to a morning slot. Days 3 to 5: repeat one timed study block and one wind-down routine. Days 6 and 7: track sleep before judging performance. Use ${body} before late study. Remedy: ${remedy}.${safety}`,
    "panic-presentation": `Use a 7-day presentation sequence. Day 1: write the first sentence. Day 2: rehearse the first two minutes standing. Days 3 to 5: practice breath, first slide, and pause at the same time daily. Days 6 and 7: record what lowers chest tightness. Use ${body} before rehearsal. Remedy: ${remedy}.${safety}`,
    "burnout-meals": `For seven days, protect one meal before service. Day 1: set a non-negotiable food time. Day 2: name one demand that can wait twenty minutes. Days 3 to 5: eat before answering the largest request. Days 6 and 7: review energy, anger, and output. Use ${body} before saying yes. Remedy: ${remedy}.${safety}`,
    "exam-comparison": `Use a 7-day comparison shield. Day 1: write one topic you improved. Day 2: do one timed mock answer. Days 3 to 5: track revision evidence, not cousins' marks. Days 6 and 7: prepare one sentence limiting comparison talk. Use ${body} before studying. Remedy: ${remedy}.${safety}`,
    "move-abroad": `For seven days, compare two real plans. Day 1: write the abroad study cost, dates, and support options. Day 2: write the staying-near-home plan with a reopening date. Days 3 to 5: speak to one practical helper. Days 6 and 7: choose from the plan that protects growth and duty. Use ${body} before family talks. Remedy: ${remedy}.${safety}`,
    "cofounder-equity": `Use a 7-day founder-terms map. Day 1: list current and requested equity. Day 2: write responsibilities, vesting, and decision rights. Days 3 to 5: ask for written acceptance of added duties. Days 6 and 7: review with a neutral advisor if possible. Let ${work} guide the next move. Remedy: ${remedy}.${safety}`,
    "property-legal": `For seven days, separate facts from family pressure. Day 1: gather property papers. Day 2: list disputed points, legal cost, and settlement number. Days 3 to 5: speak with a qualified lawyer before threatening or agreeing. Days 6 and 7: compare fight, settle, and delay risks on paper. Use ${body} before any reply. Remedy: sit quietly for five minutes after arranging the documents, then make no legal move from anger.${safety}`,
    "business-partner": `Use a 7-day fairness check. Day 1: write capital, labor, decision rights, and withdrawal terms. Day 2: ask your friend to mark the same items. Days 3 to 5: name what feels unequal without softening the numbers. Days 6 and 7: decide only after both sides accept written duties. Let ${work} guide the action. Remedy: light a lamp beside the draft agreement, take nine breaths, and ask for clean judgment before consent.${safety}`
  };

  return routes[topic?.id] || "";
}

function pickCategoryRoot(parts, seed = 0) {
  const { category, cue, knot, avoid, name } = parts;
  const routes = {
    relationship: [
      `Response timing has become a test of safety. ${name} is not only deciding what to do about ${cue}; the deeper question is whether affection is being proven through steady behavior or through repeated reassurance. When closeness has to be chased, self-respect starts paying the cost. The clean work is to separate patience from self-abandonment, then ask for a pattern that can be observed, not just promised.`,
      `Under ${cue} sits a fear that silence, distance, or delay is already an answer. ${name} is trying to prevent loss by staying emotionally available before the other person has shown consistency. That turns care into monitoring. The root is not lack of love; it is access without rhythm. This problem becomes clearer when the request is made specific: what behavior will change, by when, and what will you stop carrying alone?`,
      `This relationship pressure is less about one argument and more about proof. Around ${cue}, reassurance has started replacing evidence, so every pause feels larger than it is. The root pattern is attachment looking for safety before a clear agreement exists. ${name} needs to move the question from feeling to behavior: what is being promised, what is being repeated, and whether patience is still protecting dignity.`
    ],
    career: [
      `The career root is effort waiting for recognition before it becomes visible. Around ${cue}, the private standard has grown so large that action feels like exposure. When ${knot}, work becomes a referendum instead of a task. The repair is to make progress observable again: a draft, a deadline, a proof of effort, and less comparison before the first version exists.`,
      `Under ${cue} is a visibility problem, not a talent problem. ${name} is carrying the hard part privately, then wondering why the outside world has not responded. That creates resentment and delay together. The root is to stop making confidence the entry ticket. Work needs a container: one output, one audience or reviewer, and one date where the next version becomes real.`,
      `${capitalize(category.label)} is the surface; the deeper pattern is authority being outsourced to someone else's reaction. Around ${cue}, ${avoid} has made effort feel scattered and under-witnessed. The answer is not louder ambition. It is a cleaner proof trail: what was finished, what was shown, what was asked for, and what changed after the evidence was visible.`
    ],
    "money-family": [
      `The money-family root is care without a ledger. Around ${cue}, love has been asked to function without a number, date, or limit, so fear now has to manage the budget alone. Resentment is not proof of selfishness; it is a signal that generosity has become shapeless. ${name} needs to turn duty into terms, because help can stay respectful only when the cost is visible.`,
      `Under ${cue} sits a confusion between responsibility and rescue. ${name} is trying to protect the relationship while the practical burden keeps growing in silence. That makes every request feel urgent, even when it needs a plan. The root is to stop letting guilt manage money. A clear amount, repayment expectation, and review date will protect love better than quiet over-functioning.`,
      `Family duty is becoming heavy because the boundary is emotional instead of practical. Around ${cue}, the heart says yes before the account, schedule, or capacity has been checked. That creates fear first and resentment later. The root work is not to withdraw care; it is to make care adult. Name the real number, the real date, and the part that no longer belongs only to you.`
    ],
    "study-health": [
      `The body is carrying pressure that the mind keeps postponing. Around ${cue}, discipline has become mixed with fear, so rest, food, or preparation starts feeling like another performance. Anxiety is not the enemy; it is an alarm that rhythm has become too negotiable. ${name} needs to rebuild sequence before demanding confidence: body first, then timed effort, then review.`,
      `Under ${cue} is a nervous-system timing problem. ${name} is trying to perform, recover, predict, and judge at the same time, which makes the body speak louder. The root is not weakness. It is overload without a reliable routine. The next repair has to be physical and scheduled: sleep, food, breath, movement, and one study or work block that ends before exhaustion takes over.`,
      `This pressure is showing up through the body because the plan has too many open loops. Around ${cue}, the mind keeps asking for certainty while the body asks for rhythm. The root is to stop treating recovery as a reward after success. ${name} needs recovery inside the plan itself, so performance is not built on skipped meals, broken sleep, or panic-level urgency.`
    ],
    "business-boundary": [
      `The business root is not distrust; it is unclear risk. Around ${cue}, instinct is reacting to a missing contract, role, number, responsibility, or exit rule. ${name} is being asked to let loyalty carry what paperwork should carry. That is why the discomfort keeps returning. The clean move is to make fairness visible before agreement continues, because trust becomes safer when terms are written.`,
      `Under ${cue} sits pressure to be agreeable before the risk has been priced. The relationship may matter, but the work still needs roles, money, timelines, ownership, and consequences. ${name} should not turn discomfort into suspicion, and should not turn loyalty into blind consent. The root is due diligence: slow the yes until the written shape can protect both the work and the bond.`,
      `${capitalize(category.label)} is showing where ambition has outrun documentation. Around ${cue}, the missing piece is not motivation; it is accountability that can be inspected. The root is a fear that naming terms will damage trust. In reality, clean terms protect trust. ${name} needs to move the conversation from intention to evidence, responsibility, and a fair exit path.`
    ]
  };
  return pickVariant(routes[category.id], seed);
}

function pickCategoryAstrology(parts, seed = 0) {
  const { category, ascendant, sun, moon, mercury, venus, mars, jupiter, saturn, transitMoon, transitVenus, transitMars, transitJupiter, transitSaturn, saturnDistance, moonDistance, area, cue } = parts;
  const routes = {
    relationship: [
      `Birth Moon in ${moon} shows how emotional safety is registered, Venus in ${venus} shows how affection seeks proof, and ascendant ${ascendant} shows the first visible defense. With transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, ${cue} becomes louder today. Natal Saturn in ${saturn}, with transit Venus in ${transitVenus} and transit Saturn in ${transitSaturn} ${saturnDistance} signs from the Moon, presses for patient truth rather than chasing closeness. The daily area of ${area} says the useful move is timing, evidence, and a boundary that stays warm.`,
      `The relationship pattern is held between Moon in ${moon}, Venus in ${venus}, and Saturn in ${saturn}. Moon names the emotional reflex, Venus names the affection style, and Saturn asks for behavior that can be trusted over time. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes ${cue} feel immediate, while transit Saturn in ${transitSaturn} tests commitment through ${area}. The chart points to a clear request and patient observation, not emotional chasing.`,
      `Astrologically, ${cue} is activated through natal Moon in ${moon} and today's Moon in ${transitMoon}. That makes the felt need louder than usual. Venus in ${venus} shows how closeness seeks proof, while Saturn in ${saturn} and transit Saturn ${saturnDistance} signs from the Moon ask for maturity, timing, and limits. With ascendant ${ascendant}, the first defense can look composed even when the inner need is strong.`
    ],
    career: [
      `For work, the chart points to visibility being rebuilt through discipline. Sun in ${sun} wants the work to carry identity; Mercury in ${mercury} shows the planning voice, and Mars in ${mars} shows how effort moves under pressure. Saturn in ${saturn}, with transit Saturn ${saturnDistance} signs from the natal Moon, makes unfinished craft feel heavy until it has a schedule. Transit Mars in ${transitMars} activates the need for action under ${area}, so ${cue} is the practical doorway.`,
      `Career pressure is shown by Sun in ${sun}, Mercury in ${mercury}, and Saturn in ${saturn}. Sun wants visible authority, Mercury shows how the plan is organized, and Saturn demands proof that can be reviewed. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, brings emotion into the workday, while transit Mars in ${transitMars} pushes urgency. Because the daily area is ${area}, ${cue} needs output and evidence, not private comparison.`,
      `The chart connects ${cue} to Mars in ${mars}, Saturn in ${saturn}, and transit Saturn in ${transitSaturn}. Mars shows effort under pressure; Saturn shows the standard that must become measurable. Transit Jupiter in ${transitJupiter} offers the wiser frame, but only after the work has a visible container. Moon in ${moon} explains why recognition affects confidence so strongly. The useful astrological instruction is to make progress inspectable.`
    ],
    "money-family": [
      `This money-family pattern is strongly Saturnian, but Jupiter in ${jupiter} shows the wisdom available when duty has proportion. Natal Moon in ${moon} shows the emotional bond, while Saturn in ${saturn} describes the responsibility that has to become measurable. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the natal Moon, presses for boundaries; transit Jupiter in ${transitJupiter} shows where support can become wiser. Because the daily area highlights ${area}, ${cue} is the chart's teaching point: generosity needs structure before it can stay loving.`,
      `The chart ties ${cue} to Moon in ${moon}, Saturn in ${saturn}, and Jupiter in ${jupiter}. Moon keeps family duty emotionally alive; Saturn asks for rules; Jupiter shows where generosity becomes wiser when it has proportion. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, makes the need feel close today, while transit Saturn in ${transitSaturn} asks for a number, date, and limit. The daily area of ${area} confirms this is about sustainable care.`,
      `Astrologically, the financial pressure is not separate from the emotional bond. Natal Moon in ${moon} describes the attachment, while Saturn in ${saturn} shows the duty pattern and Jupiter in ${jupiter} shows how help can become principled. Transit Saturn ${saturnDistance} signs from the Moon is a demand for mature accounting. With transit Jupiter in ${transitJupiter} and daily area ${area}, ${cue} needs a written agreement more than another private sacrifice.`
    ],
    "study-health": [
      `The chart ties this to Moon rhythm, Mercury habits, and Saturn discipline. Natal Moon in ${moon} shows how quickly the nervous system responds to pressure, while Mercury in ${mercury} shows how attention organizes itself. Transit Moon in ${transitMoon}, ${moonDistance} signs from the natal Moon, agitates the daily routine; transit Saturn in ${transitSaturn}, ${saturnDistance} signs away, asks for repeatable effort. With the daily area focused on ${area}, ${cue} is a body-timing signal, not a verdict on ability.`,
      `Study and body pressure show through Moon in ${moon}, Mercury in ${mercury}, and Saturn in ${saturn}. Moon describes the emotional alarm; Mercury describes the study pattern; Saturn asks for discipline that can be repeated without collapse. Transit Moon in ${transitMoon} brings the pressure into the day, while transit Saturn in ${transitSaturn} turns ${cue} into a routine lesson. The daily area of ${area} says recovery belongs inside the plan.`,
      `Astrologically, ${cue} is carried by the Moon-Saturn rhythm. Natal Moon in ${moon} shows sensitivity to pressure, and transit Saturn ${saturnDistance} signs away asks for steadier structure. Mercury in ${mercury} wants a clear learning path, while Mars in ${mars} can push the body past its limit if the plan is too vague. Transit Moon in ${transitMoon} makes timing important today. This is a rhythm problem before it is a confidence problem.`
    ],
    "business-boundary": [
      `The business signal comes through Saturn, Mercury, and Mars together. Natal Saturn in ${saturn} describes responsibility, Mercury in ${mercury} describes terms, and Mars in ${mars} shows how quickly action wants to move. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the natal Moon, demands due diligence. Moon in ${moon} senses the relational cost, while Sun in ${sun} wants agency. Transit Moon in ${transitMoon} brings ${cue} into focus under ${area}. The chart says write the terms before trust does the work.`,
      `The chart treats ${cue} as a Saturn-Mercury issue. Saturn in ${saturn} asks for accountability, Mercury in ${mercury} asks for exact language, and Mars in ${mars} shows where pressure pushes action too quickly. Transit Saturn in ${transitSaturn}, ${saturnDistance} signs from the Moon, tests whether the agreement is mature enough. Sun in ${sun} wants agency, while Moon in ${moon} registers the relational risk. The astrology favors documentation over assumption.`,
      `Astrologically, this is not only business instinct; it is a timing and responsibility test. Natal Saturn in ${saturn} shows where duty must be named, Mercury in ${mercury} governs contracts and wording, and transit Moon in ${transitMoon} brings ${cue} into the emotional foreground. With transit Jupiter in ${transitJupiter} and the daily area of ${area}, the wiser path is slower agreement, clearer roles, and terms that survive pressure.`
    ]
  };
  return pickVariant(routes[category.id], seed + 5);
}

function pickCategorySolution(parts, seed = 0) {
  const { category, cue, body, work, remedy, problem } = parts;
  const safety = needsProfessionalHelp(problem)
    ? " If harm, severe distress, health symptoms, abuse, or legal risk is involved, contact a qualified professional or trusted local support alongside this guidance."
    : "";
  const routes = {
    relationship: [
      `For seven days, stop measuring love through response speed. Day 1: write the boundary you need around ${cue}. Day 2: send one calm question, not a long defense. Days 3 to 5: watch whether behavior becomes steadier without chasing. Days 6 and 7: decide from the pattern, not the apology. Use this body cue before replying: ${body}. For the remedy, ${remedy}.${safety}`,
      `Use a 7-day relationship test. First, name the behavior you need around ${cue}. Second, ask once in plain language and stop explaining after the request is clear. Days 3 to 5: observe action, not intensity. Days 6 and 7: decide what access is healthy if nothing changes. Keep ${body} before the hard conversation. Remedy: ${remedy}.${safety}`,
      `For the next week, make patience measurable. Day 1: write what consistency would look like. Day 2: speak one sentence about ${cue}. Days 3 to 5: do not chase; record what is actually repeated. Days 6 and 7: choose from evidence. Use ${body} before replying, and keep the spiritual anchor simple: ${remedy}.${safety}`
    ],
    career: [
      `For seven days, make the work impossible to keep invisible. Day 1: choose one piece and define finished in writing. Day 2: create a rough version before checking reactions. Days 3 to 5: spend one protected block improving it, guided by this work signal: ${work}. Days 6 and 7: share or archive the result as evidence. Keep the remedy practical: ${remedy}.${safety}`,
      `Use a 7-day proof plan. Day 1: choose the output connected to ${cue}. Day 2: set a review time or person. Days 3 to 5: finish one measurable improvement each day. Day 6: show the work or request clarity. Day 7: record what changed. Use ${body} before major work messages. Remedy: ${remedy}.${safety}`,
      `For the next week, separate confidence from visibility. Day 1: write the result you want inspected. Day 2: make the first imperfect draft. Days 3 to 5: document progress before judging it. Days 6 and 7: ask for one concrete response. Let ${work} guide the action. Keep the anchor modest: ${remedy}.${safety}`
    ],
    "money-family": [
      `Use a seven-day money boundary plan. Day 1: write the amount, date, and limit connected to ${cue}. Day 2: separate emergency help from regular support. Days 3 to 5: communicate the number once without apologizing for clarity. Days 6 and 7: review whether resentment lowered when the boundary stayed visible. Use this body cue first: ${body}. For the remedy, ${remedy}.${safety}`,
      `For seven days, put care into numbers. Day 1: list what you can give, what is owed, and what must stop. Day 2: choose one date for the next money conversation around ${cue}. Days 3 to 5: keep spending inside the written limit. Days 6 and 7: review the budget without shame. Use ${body} before calling anyone. Remedy: ${remedy}.${safety}`,
      `Use a 7-day family-duty reset. First, name the real monthly cost of ${cue}. Second, decide what help is regular, temporary, or no longer possible. Days 3 to 5: speak the rule once and do not renegotiate from guilt. Days 6 and 7: check whether your body feels less braced. Keep ${body} before any promise. Remedy: ${remedy}.${safety}`
    ],
    "study-health": [
      `For seven days, protect the body before asking the mind to perform. Day 1: fix the sleep and wake window. Day 2: make a small exam or performance map. Days 3 to 5: repeat one timed block before messages. Days 6 and 7: review sleep, food, and preparation honestly. Use this body cue: ${body}. The remedy is simple: ${remedy}. Confidence returns through rhythm, not late-night pressure.${safety}`,
      `Use a 7-day body-rhythm plan. Day 1: write the trigger around ${cue}. Day 2: set food, water, and sleep times before work. Days 3 to 5: practice one timed preparation block and one recovery block. Days 6 and 7: notice what lowers alarm. Use ${body} before judging performance. Remedy: ${remedy}.${safety}`,
      `For the next week, make recovery non-negotiable. Day 1: choose the earliest sleep repair. Day 2: prepare for ${cue} in one short block. Days 3 to 5: repeat the same start time so the body learns sequence. Days 6 and 7: record what improved. Use ${body} first. Keep the spiritual practice grounded: ${remedy}.${safety}`
    ],
    "business-boundary": [
      `For seven days, move the deal from emotion into terms. Day 1: write role, money, time, ownership, and exit rules. Day 2: ask the other side for the same in writing. Days 3 to 5: compare gaps without defending your instinct. Days 6 and 7: decide only after one neutral review. Use this work signal: ${work}. For the remedy, ${remedy}.${safety}`,
      `Use a 7-day due-diligence map. Day 1: list the missing term inside ${cue}. Day 2: write the money, role, and risk in plain language. Days 3 to 5: ask for written confirmation and do not accept verbal pressure. Days 6 and 7: review with a neutral person if possible. Let ${work} guide the next move. Remedy: ${remedy}.${safety}`,
      `For the next week, protect trust with paperwork. Day 1: write what each person owns, does, pays, and can exit. Day 2: mark the unclear part of ${cue}. Days 3 to 5: request one clean revision. Days 6 and 7: decide whether the terms protect both people. Use ${body} before agreeing. Remedy: ${remedy}.${safety}`
    ]
  };
  return pickVariant(routes[category.id], seed + 11);
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
    pattern: /\b(business partner|partnership|deal|contract|equity|startup|client deal|unfair|terms|investment|legal|lawyer|court|property|paperwork|settle)\b/i,
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
    pattern: /\b(study|exam|sleep|anxiety|stress|tired|health|panic|fear|body|food|meal|meals|burnout|burned|ill|doctor)\b/i,
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

function specificProblemTopic(problem) {
  const lower = String(problem || "").toLowerCase();
  const topics = [
    { id: "partner-silence", cue: "the partner going silent after arguments", lane: "relationship", pattern: /\b(partner|love)\b.*\b(silent|silence|arguments?|fight|conflict)\b|\b(silent|silence)\b.*\b(arguments?|partner|love)\b/i },
    { id: "inlaws-husband", cue: "in-laws interfering while the husband avoids a stand", lane: "relationship", pattern: /\b(in-?laws?|husband|marriage)\b.*\b(interfer|stand|avoid)\b|\b(interfer|stand|avoid)\b.*\b(in-?laws?|husband|marriage)\b/i },
    { id: "ex-message", cue: "the ex messaging again", lane: "relationship", pattern: /\bex\b.*\b(message|messaging|closure|trap)\b|\bmessage|messaging\b.*\bex\b/i },
    { id: "friend-cancelling", cue: "the closest friend cancelling plans", lane: "relationship", pattern: /\b(friend|plans?|available|upset)\b.*\b(cancel|cancelling|available|upset)\b/i },
    { id: "job-offer", cue: "the better salary offer versus the boss's growth promise", lane: "career", pattern: /\b(job offer|salary|boss|growth)\b/i },
    { id: "portfolio", cue: "the delayed portfolio and invisible work", lane: "career", pattern: /\b(portfolio|invisible at work|hard parts)\b/i },
    { id: "client-scope", cue: "the changing client scope and delayed payment", lane: "career", pattern: /\b(client|scope|delaying payment|payment|project)\b/i },
    { id: "promotion", cue: "being passed over for promotion", lane: "career", pattern: /\b(passed over|promotion|manager|leave quietly|confront)\b/i },
    { id: "family-loan", cue: "the family loan and repayment shame", lane: "family", pattern: /\b(loan|repay|repayment|ashamed|family expenses)\b/i },
    { id: "parent-support", cue: "monthly financial support for parents", lane: "family", pattern: /\b(support my parents|parents financially|money every month|resentful)\b/i },
    { id: "sibling-criticism", cue: "the sibling expecting help and criticizing the result", lane: "family", pattern: /\b(sibling|criticizes|family problem)\b/i },
    { id: "mother-health", cue: "mother's health appointments and household expenses", lane: "family", pattern: /\b(mother|health appointments|household expenses|angry all the time)\b/i },
    { id: "sleep-exam", cue: "broken sleep before important exams", lane: "body", pattern: /\b(sleep|wake up anxious|important exams?)\b/i },
    { id: "panic-presentation", cue: "panic and chest tightness before presentations", lane: "body", pattern: /\b(panic|presentations?|chest tight)\b/i },
    { id: "burnout-meals", cue: "burnout and skipped meals while everyone depends on them", lane: "body", pattern: /\b(burned out|burnout|skipping meals|depends on me)\b/i },
    { id: "exam-comparison", cue: "exam marks being compared with cousins", lane: "body", pattern: /\b(exam marks|cousins|prepared well|freeze)\b/i },
    { id: "move-abroad", cue: "moving abroad for studies while parents need support", lane: "decision", pattern: /\b(move abroad|studies|stay near home|parents need support)\b/i },
    { id: "cofounder-equity", cue: "cofounder equity without matching responsibility", lane: "business", pattern: /\b(cofounder|equity|responsibility|contract talk|startup)\b/i },
    { id: "property-legal", cue: "property paperwork turning legal with a relative", lane: "business", pattern: /\b(property|paperwork|legal|settle|relative)\b/i },
    { id: "business-partner", cue: "a friend becoming a business partner on unfair terms", lane: "business", pattern: /\b(friend wants to become my business partner|business partner|deal is unfair|unfair)\b/i }
  ];
  return topics.find((topic) => topic.pattern.test(lower)) || null;
}

function specificTopicAstrologyLane(topicId = "") {
  return ({
    "partner-silence": "relationship",
    "inlaws-husband": "relationship",
    "ex-message": "relationship",
    "friend-cancelling": "relationship",
    "job-offer": "career",
    portfolio: "career",
    "client-scope": "career",
    promotion: "career",
    "family-loan": "family",
    "parent-support": "family",
    "sibling-criticism": "family",
    "mother-health": "family",
    "sleep-exam": "body",
    "panic-presentation": "body",
    "burnout-meals": "body",
    "exam-comparison": "body",
    "move-abroad": "decision",
    "cofounder-equity": "business",
    "property-legal": "business",
    "business-partner": "business"
  })[topicId] || "";
}

function problemCue(problem, category, topic = null) {
  if (topic?.cue) return topic.cue;

  const lower = String(problem || "").toLowerCase();
  const cues = {
    relationship: [
      ["silent", "the silence after conflict"],
      ["in-laws", "in-laws interfering with the marriage"],
      ["husband", "the husband's unclear stand"],
      ["ex", "the ex messaging again"],
      ["friend", "the friendship availability problem"],
      ["trust", "trust becoming a test"],
      ["breakup", "the breakup question"],
      ["partner", "your partner's mixed signals"],
      ["marriage", "the marriage pressure"]
    ],
    career: [
      ["job offer", "the better salary offer"],
      ["salary", "the salary and growth decision"],
      ["portfolio", "the delayed portfolio"],
      ["recognition", "the need for visible recognition"],
      ["boss", "the pressure from authority"],
      ["promotion", "the missed promotion"],
      ["client", "the client commitment"],
      ["business", "the business decision"],
      ["work", "the unfinished work"]
    ],
    "money-family": [
      ["loan", "the family loan"],
      ["repay", "the repayment request"],
      ["mother", "the mother's care expenses"],
      ["sibling", "the sibling's shared responsibility"],
      ["parent", "the responsibility toward parents"],
      ["family", "the family obligation"],
      ["money", "the money pressure"],
      ["debt", "the debt pressure"],
      ["support", "the support you provide"]
    ],
    "study-health": [
      ["panic", "the panic before performance"],
      ["presentation", "the presentation pressure"],
      ["chest", "the chest tightness before presenting"],
      ["burned", "the burnout and skipped meals"],
      ["meal", "the skipped meals"],
      ["marks", "the exam-mark comparison"],
      ["cousins", "the comparison with cousins"],
      ["exam", "the exam pressure"],
      ["sleep", "the broken sleep"],
      ["anxiety", "the anxiety before performance"],
      ["health", "the health concern"],
      ["study", "the study rhythm"]
    ],
    "business-boundary": [
      ["cofounder", "the cofounder equity terms"],
      ["equity", "the equity responsibility gap"],
      ["property", "the property paperwork dispute"],
      ["legal", "the legal paperwork risk"],
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

function pickVariant(options, seed = 0) {
  if (!Array.isArray(options) || !options.length) return "";
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
