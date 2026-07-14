export function buildFallbackDeepGuidance(user = {}, context = {}) {
  const name = firstName(user.name);
  const seed = paidSeed(user, context);
  const scene = paidScene(context, seed, name);
  const area = readableArea(context.dailyArea, seed, name);
  const anchor = anchorPhrase(context.attentionAnchor || context.dailyScene || "one practical detail that keeps returning", seed, name);
  const move = mentorMovePhrase(context.mentorMove || context.stabilizer || "make the promise smaller and keep it completely", seed);
  const caution = relationPhrase(context.relationalCaution || context.relationshipMirror, seed, name);
  const avoid = avoidPressurePhrase(context.avoid || "over-explaining", seed, name);
  const weekAvoid = avoidPressurePhrase(context.avoid || "over-explaining", seed + 101, name);
  const monthAvoid = avoidPressurePhrase(context.avoid || "over-explaining", seed + 211, name);
  const bodyStart = bodyPractice(context.bodySignal, seed);
  const work = workSignalPhrase(context.workSignal || "make the action plain enough to complete", seed, name);
  const cost = paidCost(context, seed, name);
  const structure = monthStructure(context, seed);
  const review = reviewAnchor(context, seed);

  return polishFallbackDeepGuidance({
    overview: extendShortOverview(
      pickOverview({ name, scene, area, anchor, move, caution, avoid, work, cost }, seed),
      seed,
      { area, anchor, name }
    ),
    thisWeek: pickThisWeek({ bodyStart, move, caution, avoid: weekAvoid, work, name }, seed),
    thisMonth: pickThisMonth({ structure, area, anchor, avoid: monthAvoid, name }, seed),
    practice: pickPractice({ review, bodyStart, move, name }, seed),
    focus: focusCue(context, seed),
    watch: watchCue(context, seed, name)
  }, name, seed);
}

function polishFallbackDeepGuidance(guidance, name = "", seed = 0) {
  const overview = polishGuidanceText(guidance.overview);
  const thisWeek = removeSupportName(polishGuidanceText(guidance.thisWeek), name);
  const thisMonth = removeSupportName(polishGuidanceText(guidance.thisMonth), name);
  const practice = removeSupportName(polishGuidanceText(guidance.practice), name);
  return {
    overview: ensureMinimumWords(overview, 105, minimumOverviewExtension(seed)),
    thisWeek: ensureMinimumWords(thisWeek, 45, minimumWeekExtension(seed)),
    thisMonth: ensureMinimumWords(thisMonth, 45, minimumMonthExtension(seed)),
    practice: ensureMinimumWords(practice, 30, minimumPracticeExtension(seed, name)),
    focus: polishGuidanceText(guidance.focus),
    watch: polishGuidanceText(guidance.watch)
  };
}

function polishGuidanceText(text) {
  const seed = stableHash(text);
  return capitalizeSentenceStarts(softenRepeatedThemePhrases(capitalizeSentenceStarts(String(text || "")
    .replace(/\bpaid map\b/gi, "three-month map")
    .replace(/\bpaid cycle\b/gi, "three-month cycle")
    .replace(/\bpaid-cycle\b/gi, "three-month")
    .replace(/\bpaid guidance\b/gi, "guidance")
    .replace(/\bpaid value\b/gi, "real value")
    .replace(/\bpaid move\b/gi, "next move")
    .replace(/\bpaid work\b/gi, "three-month work")
    .replace(/\bthe deeper guidance is to\b/gi, "the useful sequence is to")
    .replace(/\bthe deeper reading begins\b/gi, "the deeper map begins")
    .replace(/\bbegins the deeper reading\b/gi, "begins the deeper map")
    .replace(/\blet let\b/gi, "let")
    .replace(/\bmake make\b/gi, "make")
    .replace(/\bgive give\b/gi, "give")
    .replace(/\bmake let\b/gi, "let")
    .replace(/\bgive reduce\b/gi, "reduce")
    .replace(/\bLet make\b/g, "Make")
    .replace(/\bLet relationships follow\s+/g, "In relationships, ")
    .replace(/\bLet people receive\s+/g, "With people, ")
    .replace(/\bLet closeness practice\s+/g, "In closeness, ")
    .replace(/\bLet work follow\s+/g, "For work, ")
    .replace(/\buse let access follow timing\b/gi, "let access follow timing")
    .replace(/\breturn closeness to use a kind no\b/gi, "return closeness to a kind no")
    .replace(/\bLet the practical side follow complete\b/g, "For the practical side, complete")
    .replace(/\blet one useful draft gets a visible boundary set\b/gi, "let one useful draft set")
    .replace(/\blet give uncertain plan a practical container set\b/gi, "let the uncertain plan's container set")
    .replace(/\bgive uncertain plan a practical container leaves\b/gi, "the uncertain plan's practical container leaves")
    .replace(/\bshould make the task that needs a visible name visible\b/gi, "should give the unnamed task a visible name")
    .replace(/\bMake separate tiredness guidance concrete before it spreads be the repeating correction\b/g, "Make the tiredness check practical before it spreads; that is the repeating correction")
    .replace(/\bMake ([^.]+?) before it spreads be the repeating correction\b/g, "Make $1 before it spreads; that is the repeating correction")
    .replace(/\bgive letting body neutral a practical container\b/gi, "give the body one neutral pause")
    .replace(/\breduce give letting body to one next action\b/gi, "reduce the body cue to one next action")
    .replace(/\bfinish useful draft gets one visible boundary\b/gi, "one useful draft gets a visible boundary")
    .replace(/\bkeep another person's gets one visible boundary\b/gi, "mixed signals get one clean boundary")
    .replace(/\breceive feeling leave gets one visible boundary\b/gi, "borrowed feelings get one clean boundary")
    .replace(/\bgive uncertain plan a practical container the standard\b/gi, "the uncertain plan's practical container the standard")
    .replace(/\bmake give uncertain plan a practical container the standard\b/gi, "make the uncertain plan's practical container the standard")
    .replace(/\bFor ([A-Z][a-z]+), ([^.;]+?) becomes costly when ([^.;]+?) starts speaking before the real information is complete\. The three-month map should name ([^.;]+?), give the next reply a time edge, and finish the part that can honestly close today\./g, "For $1, $2 gets costly when $3 starts deciding the mood before the facts are sorted. The three-month map should put $4 into a dated note, give the next reply a time edge, and close the part that already has enough truth.")
    .replace(/\bspeaking before the real information is complete\b/gi, "deciding the mood before the facts are sorted")
    .replace(/\binformation is complete the three-month map should\b/gi, "facts are sorted the three-month map should")
    .replace(/\bThe three-month map should name\b/gi, "The three-month map should make visible")
    .replace(/\bone comfort habit that has started asking for repayment\b/gi, () => comfortHabitVariant(seed))
    .replace(/\bthe note needing one practical action\b/gi, () => practicalNoteVariant(seed))
    .replace(/\bbefore the point is fully named\b/gi, () => fullyNamedVariant(seed))
    .replace(/\bfrom let the\b/gi, "from the")
    .replace(/\bLet the repeatable correction be:\s*let\s+/gi, "Repeat the correction: ")
    .replace(/\s+/g, " ")
    .trim())));
}

function practicalNoteVariant(seed) {
  return [
    "the note that should become one clear action",
    "the unfinished note asking for a practical next step",
    "the written cue that needs one real action",
    "the note that should stop at one useful step",
    "the page detail asking for a cleaner next move"
  ][mod(seed, 5)];
}

function fullyNamedVariant(seed) {
  return [
    "before the point has a clear name",
    "before the real point is named plainly",
    "before the useful sentence is clear",
    "before the point has enough shape",
    "before the actual request is named"
  ][mod(seed, 5)];
}

function comfortHabitVariant(seed) {
  return [
    "one comfort habit that now needs a cleaner boundary",
    "the comfort pattern asking for a visible limit",
    "one soothing habit that has become too expensive",
    "the habit that wants comfort before proof",
    "one comfort loop that needs a smaller shape"
  ][mod(seed, 5)];
}

function capitalizeSentenceStarts(text) {
  return String(text || "").replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function removeSupportName(text, name = "") {
  const cleanName = firstName(name);
  if (!cleanName) return text;
  return String(text || "")
    .replace(new RegExp(`\\bFor ${escapeRegex(cleanName)},\\s*`, "g"), "")
    .replace(new RegExp(`\\b${escapeRegex(cleanName)}'s\\b`, "g"), "the next")
    .replace(new RegExp(`\\b${escapeRegex(cleanName)}\\b`, "g"), "the day")
    .replace(/\bkeep it plain for the day:\s*/gi, "keep the proof plain: ")
    .replace(/\breply sent for the day;\s*the limit stays with the day;\s*one duty closes for the day\b/gi, "one reply sent, one limit kept, and one duty closed")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureMinimumWords(text, minimum, extension) {
  const value = String(text || "").trim();
  if (wordCount(value) >= minimum) return value;
  return `${value} ${extension}`.trim();
}

function minimumOverviewExtension(seed) {
  return [
    "Before sleep, save the useful proof in one line so the next morning can begin from behavior.",
    "Let the evening record name one finished detail and one boundary that should meet tomorrow first.",
    "Keep one small proof visible tonight: what closed, what stayed smaller, and what can repeat.",
    "The next review should find one practical result instead of asking the feeling to explain itself again."
  ][mod(stableHash(`${seed}|minimum-overview-v2`), 4)];
}

function minimumWeekExtension(seed) {
  return [
    "Close the day with one result written in plain language.",
    "Reuse the proof tomorrow and keep one closed duty visible.",
    "Write the closed detail before another request arrives.",
    "Keep one result visible for the next morning.",
    "Put the finished piece where tomorrow can find it.",
    "Save the useful edge before the next request arrives."
  ][mod(stableHash(`${seed}|minimum-week-v3`), 6)];
}

function minimumMonthExtension(seed) {
  return [
    "Keep the final note practical enough to guide next week.",
    "Let one dated example choose the next habit.",
    "The last review should leave one usable adjustment.",
    "Attach the lesson to one repeatable weekly action."
  ][mod(stableHash(`${seed}|minimum-month-v2`), 4)];
}

function minimumPracticeExtension(seed, name = "") {
  const cleanName = String(name || "");
  const firstOffset = (cleanName.charCodeAt(0) || 0) + (cleanName.charCodeAt(1) || 0) || seed;
  return [
    "Keep the note small, then name tomorrow's repeatable first step.",
    "Stop there; let tomorrow start from one saved fact.",
    "Let the action stay visible beside tomorrow's first ordinary choice.",
    "Begin there tomorrow with one sentence the body can keep."
  ][mod(firstOffset, 4)];
}

export function buildPaidGuidanceFingerprint(user = {}, context = {}, date = "") {
  const seed = paidSeed(user, context);
  return [
    `scene=${capitalize(paidScene(context, seed))}`,
    `area=${readableArea(context.dailyArea, seed)}`,
    `lunar=${formatPaidLunarMansion(context.dailyLunarMansion || context.transits?.moon?.lunarMansion)}`,
    `tithi=${formatPaidLunarDay(context.dailyLunarDay || context.transits?.lunarDay)}`,
    `cost=${paidCost(context, seed, firstName(user.name))}`,
    `week=${safePhrase(context.bodySignal || context.decisionGate || context.mentorMove)}`,
    `month=${monthStructure(context, seed)}`,
    `caution=${relationPhrase(context.relationalCaution || context.relationshipMirror, seed)}`,
    `date=${date}`,
    `user=${firstName(user.name)}`
  ].filter((item) => item && !item.endsWith("=")).join("; ");
}

function paidScene(context = {}, seed = 0, name = "") {
  const raw = String(context.openingScene || context.dailyScene || context.attentionAnchor || "").toLowerCase();
  const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const pickScene = (key, variants) => pickArea(stableHash(`${seed}|${name}|scene|${key}|${raw}`) + nameOffset, variants);
  if (raw.includes("water") || raw.includes("glass")) return pickScene("water", ["the water glass beside the first decision", "the first sip before the day speeds up", "the glass waiting near the work surface", "the small water break before the reply"]);
  if (raw.includes("calendar") || raw.includes("appointment") || raw.includes("deadline")) {
    const calendarScenes = [
      "the calendar square that keeps shifting",
      "the appointment box asking for a cleaner boundary",
      "the deadline line that needs one honest shape",
      "the marked deadline",
      "the date box asking for one practical edge",
      "the deadline note that needs a smaller promise",
      "the calendar mark waiting for a real finish"
    ];
    return calendarScenes[mod(stableHash(`${seed}|${name}|scene|calendar-v2|${raw}`) + stableHash(name), calendarScenes.length)];
  }
  if (raw.includes("notebook") || raw.includes("page") || raw.includes("pen") || raw.includes("written")) {
    const notebookScenes = [
      "the notebook line waiting beside the day",
      "the half-written page near the morning",
      "the pen mark that keeps asking for a finish",
      "the note needing one practical action",
      "the note that should become one clean action",
      "the margin where the unfinished sentence keeps returning",
      "the page edge asking for one useful choice",
      "the line that needs a finish more than another edit",
      "the page corner where the next action should be named",
      "the written line that wants a smaller decision"
    ];
    return notebookScenes[mod(stableHash(`${seed}|scene|notebook-v2|${raw}`) + stableHash(name), notebookScenes.length)];
  }
  if (raw.includes("kitchen") || raw.includes("counter") || raw.includes("meal") || raw.includes("cup") || raw.includes("tea")) {
    const kitchenScenes = [
      "the cup cooling near the counter",
      "the post-meal kitchen surface",
      "the tea mark beside an unfinished thought",
      "the counter corner where the day pauses",
      "the plate or cup that keeps pulling attention back",
      "the kitchen edge where the next task waits",
      "the counter mark beside one practical choice",
      "the meal-side pause before the next reply"
    ];
    const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    const kitchenIndex = mod(stableHash(`${seed}|${name}|scene|kitchen-v3|${raw}`) + nameOffset, kitchenScenes.length);
    if (kitchenIndex === 3) {
      const first = String(name || "").trim().charAt(0).toLowerCase();
      return first && first < "m" ? "the kitchen counter holding one practical pause" : "the kitchen counter edge where the day slows";
    }
    return kitchenScenes[kitchenIndex];
  }
  if (raw.includes("wallet") || raw.includes("receipt") || raw.includes("payment") || raw.includes("money") || raw.includes("bill")) return pickScene("money", ["the receipt or small payment decision", "the bill line that needs a plain choice", "the wallet detail that should not become a mood", "the account note asking for one clean answer"]);
  if (raw.includes("chair") || raw.includes("room") || raw.includes("desk") || raw.includes("drawer") || raw.includes("laundry")) return pickScene("room-v2", [
    "the room detail you keep passing",
    "the desk corner holding one unfinished loop",
    "the chair or drawer asking for a visible decision",
    "the quiet room detail asking for placement",
    "the drawer edge that keeps catching attention",
    roomChairScene(seed, name),
    "the laundry corner asking for one visible close"
  ]);
  if (raw.includes("door") || raw.includes("shoes") || raw.includes("keys") || raw.includes("bag") || raw.includes("charger")) return pickScene("doorway", [
    "the doorway detail",
    "the keys or bag waiting near the exit",
    "the threshold cue",
    "the shoe or charger near the exit",
    "the bag by the door",
    "the key point before leaving",
    "the exit detail asking for order"
  ]);
  if (raw.includes("message") || raw.includes("sentence") || raw.includes("reply") || raw.includes("conversation")) return pickScene("message", ["the unsent sentence", "the message draft asking for less force", "the reply window before extra meaning enters", "the conversation line that needs a clean time"]);
  if (raw.includes("list") || raw.includes("task") || raw.includes("draft") || raw.includes("work") || raw.includes("promise")) return pickScene("task-v2", ["the task list with one unnamed item", "the draft line that should be made real", "the promise on the list without a finish", "the work note needing a visible close", "the work note before closure", "the task line asking for one finish"]);
  if (raw.includes("tab") || raw.includes("worry") || raw.includes("thought") || raw.includes("mind")) return pickScene("mind", ["the mental tab that keeps reopening", "the thought loop asking for a written edge", "the worry line that needs a practical container", "the private tab that should be closed on paper"]);
  return pickScene("ordinary", ["one ordinary detail near the work", "the small cue waiting beside the next task", "the practical task detail that keeps returning", "the unnoticed work detail where the day asks for order"]);
}

function roomChairScene(seed = 0, name = "") {
  const variants = [
    "the chair beside one unfinished decision",
    "the seat near the decision that keeps waiting",
    "the chair holding the day's unfinished loop",
    "the place beside the choice that needs a finish",
    "the quiet seat next to the unresolved detail",
    "the chair near the choice that wants closure",
    "the seat beside one decision still waiting"
  ];
  const nameIndex = name ? name.charCodeAt(0) % variants.length : mod(stableHash(`${seed}|room-chair-scene-v3`), variants.length);
  return variants[nameIndex];
}

function pickOverview(parts, seed) {
  const { name, scene, area, anchor, move, caution, avoid, work, cost } = parts;
  const templates = [
    `${overviewPlainMarkerLine(seed, scene, area)} ${overviewCostSizeLine(seed, name, cost)} ${overviewContainerLine(seed, anchor)} Keep ${avoid} away from the next reply. In relationships, ${caution}; in work, ${work}. ${overviewProgressLine(seed, area)}`,
    `${capitalize(scene)} gives ${name} a practical doorway into ${area}. ${overviewEffortLine(seed, cost, name)} ${overviewVisibleAnchorLine(seed, anchor, name, area)} Let this rule lead: ${move}. Keep ${avoid} away from the next reply. In closeness, ${caution}. In work, ${work}. ${overviewEvidenceClose(seed, area, name)}`,
    `Begin at ${scene}; ${overviewEvidenceWeightLine(seed, name, area)} ${overviewTimingDrainLine(seed, cost)} ${overviewInspectableSequenceLine(seed, anchor)} Keep ${avoid} out of the decision. With people, ${caution}. With work, ${work}. ${overviewUrgencyClose(seed, area)}`,
    `${overviewUsefulEvidenceLine(seed, { name, scene, area, anchor, cost, move, caution, work })}`,
    `${overviewPaidMapLine(seed, { name, scene, area, cost, avoid, caution, work })}`,
    `${overviewMapOpening(seed, scene, area)} ${overviewCostCrowdLine(seed, name, cost)} ${overviewInspectLine(seed, anchor, name)} ${overviewManagerLine(seed, avoid, caution)} ${overviewWorkPracticalClose(seed, work)}`,
    `${overviewMethodOpening(seed, scene, area, name)} For ${name}, the drain is ${cost}; ${overviewSmallDutyLine(seed, cost)} ${overviewVisibleSequenceLine(seed, anchor, name)} Keep ${avoid} out of the review. With people, ${caution}. With work, ${work}. ${overviewRecordClose(seed, area)}`,
    `${overviewHandleCycleLine(seed, { name, scene, area, cost, anchor, avoid, caution, work })}`,
    `${overviewNoticeOpening(seed, name, scene, area)} ${overviewRepairLine(seed, cost)} ${overviewPlanLine(seed, anchor, name, area)} ${overviewAvoidLine(seed, avoid, name, area)} ${overviewRelationshipLine(seed, caution)} ${overviewWorkLine(seed, work)} ${overviewThreeMonthClose(seed, name, area)}`,
    `${overviewDeepPlacementOpening(seed, scene, name, area)} ${overviewHabitCostLine(seed, cost, name, area)} ${overviewThreeMonthVisibleLine(seed, area)} ${overviewSmallPromiseLine(seed, anchor)} ${overviewRuleLine(seed, move)} ${overviewReviewBoundaryLine(seed, avoid, name, area)} With people, ${caution}. With work, ${work}. ${overviewCareProofLine(seed, name, area)}`,
    `${overviewEvidenceHandlingLine(seed, { name, scene, area, cost, anchor, move, avoid, caution, work })}`,
    `${overviewTestablePlaceLine(seed, name, scene, area)} ${overviewPressureRepeatLine(seed, cost)} ${overviewBodyNegotiationLine(seed, area)} ${overviewVisibleChainLine(seed, anchor)} ${overviewExplanationLine(seed, avoid, caution)} For work, ${work}. ${overviewSeventhDayLine(seed, area)}`
  ];
  const fingerprint = stableHash(`${seed}|${scene}|${area}|${anchor}|${work}|${cost}|${name}|overview-v4`);
  return templates[mod(seed + fingerprint + overviewSceneOffset(scene), templates.length)];
}

function overviewHandleCycleLine(seed, parts) {
  const { name, scene, area, cost, anchor, avoid, caution, work } = parts;
  return [
    `Let ${scene} be the place where ${name} stops carrying ${area} as a private mood and starts treating it as a pattern with handles. The cost is ${cost}; it asks for extra emotional payment long after the practical bill is clear. This paid cycle needs three anchors: ${anchor} written plainly, one boundary that can be repeated without apology, and one finish that proves the day is not only reacting. Keep ${avoid} from choosing the tone. In closeness, ${caution}. In work, ${work}. The guidance becomes real when the same correction is visible next week, not only understood today.`,
    overviewSeparateMoodLine(seed, { name, scene, area, cost, anchor, avoid, caution, work }),
    overviewHandlePracticalLine(seed, { name, scene, area, cost, anchor, avoid, caution, work }),
    `${capitalize(scene)} is the practical entry point for ${name}: ${area} needs handles, not another private weather report. The cost is ${cost}, so the paid map should make ${anchor} visible, give one boundary a repeatable shape, and close one finish before the day starts defending itself. Keep ${avoid} from choosing the tone. In closeness, ${caution}. In work, ${work}. Next week should show evidence, not only understanding.`,
    `${capitalize(scene)} gives ${name} the first review point for ${area}. The costly habit is ${cost}, so the next three months should turn ${anchor} into a record: where it appears, what it charges, and which boundary answers it. Keep ${avoid} away from the tone. In closeness, ${caution}. In work, ${work}. Let the week prove one changed behavior before the feeling asks for another explanation.`,
    `Use ${scene} as the starting handle. For ${name}, ${area} becomes workable when ${cost} is treated as a cost, not a verdict. Write ${anchor}, choose the boundary that can repeat, and close the useful part before the day starts defending itself. Keep ${avoid} from choosing the tone. With people, ${caution}. With work, ${work}. The next review needs evidence that can be compared.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|handle-cycle-v3`) + stableHash(cost), 6)];
}

function overviewHandlePracticalLine(seed, parts) {
  const { name, scene, area, cost, anchor, avoid, caution, work } = parts;
  return [
    `Use ${scene} as ${name}'s handle for ${area}. The expensive part is ${cost}; attention should move from that cost into a visible repair. Put ${anchor} where the day can see it, give one boundary a sentence that can repeat, and close the task that can show progress today. Keep ${avoid} out of the tone. In closeness, ${caution}. In work, ${work}. The same correction should be easier to see seven days from now.`,
    `${capitalize(scene)} gives ${name} a practical handle for ${area}. When ${cost} starts charging attention, answer through ${anchor}: visible place, repeatable boundary, finished task. Keep ${avoid} out of the tone. In closeness, ${caution}. In work, ${work}. Seven days from now, the correction should be easier to see in behavior.`,
    `Let ${scene} hold the first handle for ${area}. For ${name}, ${cost} should be met with ${anchor} in the open, one repeatable boundary, and one task closed before the mood argues. Keep ${avoid} away from the tone. With people, ${caution}. With work, ${work}. The next review should see proof, not only intention. Before sleep, save where ${anchor} became visible, which boundary repeated, and what task closed so morning has behavior to compare.`,
    `Start the cycle through ${scene}. ${name} can make ${area} less private by placing ${anchor} in view, giving one boundary a repeatable line, and finishing a task today. When ${cost} asks for attention, keep ${avoid} out of the tone. In closeness, ${caution}. In work, ${work}. The seven-day proof should be visible. Before sleep, note where ${anchor} became visible, which boundary held, and which task closed so tomorrow can compare behavior instead of mood.`,
    `${capitalize(scene)} should become ${name}'s review point, not another place for the feeling to argue. Around ${area}, the cost is ${cost}; answer it by naming ${anchor}, choosing one boundary that can repeat, and closing the part that is ready today. Keep ${avoid} away from the tone. With people, ${caution}. With work, ${work}. Before sleep, save the practical result and the next boundary it teaches.`,
    `Use ${scene} to make the pattern visible. For ${name}, ${area} changes when ${anchor} leaves the mind and becomes one written cue, one answer window, and one closed task. When ${cost} starts collecting attention, return to the visible repair. Keep ${avoid} out of the tone. In closeness, ${caution}. In work, ${work}. The next review should compare behavior, not pressure.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${anchor}|${cost}|handle-practical-v3`) + stableHash(area), 6)];
}

function overviewSeparateMoodLine(seed, parts) {
  const { name, scene, area, cost, anchor, avoid, caution, work } = parts;
  return [
    `${capitalize(scene)} gives ${name} a place to separate ${area} from the mood around it. The cost is ${cost}, and it keeps charging attention after the real duty is already visible. Set ${anchor} at the center of the paid cycle: write it plainly, choose the boundary that can repeat, and finish one part that proves the day is not only reacting. Keep ${avoid} away from the tone. With people, ${caution}. With work, ${work}. The proof should be visible enough to compare next week.`,
    `Use ${scene} to pull ${area} out of the mood and into a visible plan for ${name}. The cost is ${cost}; it keeps collecting attention after the duty is already clear. Put ${anchor} at the center of the paid cycle, choose a boundary that can repeat, and close one part before the day starts reacting. Keep ${avoid} out of the tone. With people, ${caution}. With work, ${work}. Next week should have proof that can be compared, not just remembered.`,
    `${capitalize(scene)} shows ${name} where ${area} needs a practical container. The cost is ${cost}, which keeps making the real duty feel heavier than it is. Write ${anchor}, give the next boundary a repeatable sentence, and finish one part that shows the day is moving. Keep ${avoid} away from the tone. In closeness, ${caution}. In work, ${work}. Let the comparison point be visible by next week.`,
    `Start with ${scene}; it gives ${name} a clean handle for ${area}. The cost is ${cost}, so the paid cycle should make ${anchor} visible, set one boundary that can repeat, and close one useful part before the mood takes over. Keep ${avoid} away from the tone. Let people receive ${caution}. Let work follow ${work}. The proof should be concrete enough to compare in seven days.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|${anchor}|separate-mood-v2`), 4)];
}

function overviewPaidMapLine(seed, parts) {
  const { name, scene, area, cost, avoid, caution, work } = parts;
  return [
    `The three-month map begins with ${scene}, not with a dramatic breakthrough. Around ${area}, ${name} needs a structure that stops ${cost} from turning each small duty into a verdict. Place the returning detail in a fixed spot: a calendar slot, a written cost, and a finish line that can be seen by tonight. Keep ${avoid} away from the next explanation, especially when the room asks for proof before the practical evidence exists. In relationships, ${caution}. In work, ${work}. Trackable guidance means less emotional rent and more visible repair.`,
    `Start the three-month map at ${scene}. For ${name}, ${area} needs a structure for the way ${cost} charges the practical task. Put the returning detail into a dated note, a chosen time, and one closeable task. ${paidMapEvidenceLine(seed, avoid, name, area)} With people, ${caution}. With work, ${work}. Tonight's review should ${paidMapReviewLine(seed, name, area)}.`,
    overviewPaidMapEvidencePointLine(seed, parts),
    `Let ${scene} hold the opening of the three-month map for ${name}. The pressure around ${area} grows when ${cost} makes each duty feel like a judgment. Put ${area} on the calendar and write ${area}'s price; while ${avoid} is small, close one visible part. In closeness, ${caution}; use ${area}'s proof when reassurance asks again. In work, ${work}. Let the next review see ${area}'s finished repair.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|${cost}|paid-map-v3`) + stableHash(name), 4)];
}

function overviewPaidMapEvidencePointLine(seed = 0, parts = {}) {
  const { name, scene, area, cost, avoid, caution, work } = parts;
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("sleep") || areaText.includes("closure")) {
    if (areaText.includes("evening")) {
      return `Use ${scene} as the evening proof point for ${name}. Around ${area}, write ${cost} before the reply asks for care as proof. Choose one finish line tonight, keep ${avoid} outside the explanation, and let the record show exactly what closed. In relationships, ${caution}. In work, ${work}. The useful change is a night record that can be checked tomorrow without reopening the whole feeling.`;
    }
    return `${capitalize(scene)} belongs on ${name}'s night note. Around ${area}, write ${cost}, choose the one part that can close, and leave ${avoid} outside until sleep has a fact to review. Give the duty a small finish before tonight rather than a larger verdict. In relationships, ${caution}. In work, ${work}. The next morning should inherit one closed detail, one lighter explanation, and a boundary that can repeat.`;
  }
  if (areaText.includes("private")) {
    return `Treat ${scene} as the first map point for ${name}. Around ${area}, ${cost} needs a page-based structure before the detail becomes a private verdict. Use a dated note, one written cost, and one finish line before tonight. Keep ${avoid} outside the explanation when comfort wants proof too early. In relationships, ${caution}. In work, ${work}. The useful guidance is the closed duty the next review can inspect.`;
  }
  return `${capitalize(scene)} is the first point in ${name}'s three-month map. Around ${area}, the expensive habit is ${cost}; it turns a practical duty into a private verdict unless the detail gets a fixed place. Use a calendar slot, a written cost, and one finish line before tonight. Keep ${avoid} outside the explanation when the room wants comfort before anything has moved. Let relationships follow ${caution}. Let work follow ${work}. Guidance becomes useful when the repair leaves evidence.`;
}

function paidMapEvidenceLine(seed, avoid, name, area) {
  return [
    `Keep ${avoid} out of the explanation until a dated note, protected time, or closeable task exists.`,
    `Do not give ${avoid} the microphone before the dated note and first closed task are visible.`,
    `Let the explanation wait until ${area} has one timed proof and one written cost.`,
    `Ask ${avoid} to wait outside the room until one practical part has moved in the record.`
  ][mod(stableHash(`${seed}|${avoid}|${name}|${area}|paid-map-evidence-v2`), 4)];
}

function paidMapReviewLine(seed, name, area) {
  return [
    "name the proof, the cost it reduced, and the next correction that can repeat",
    `compare the written cost with the task that actually moved`,
    `leave one sentence about what changed before ${area} asks for another story`,
    `choose the next repeatable correction from evidence, not pressure`
  ][mod(stableHash(`${seed}|${name}|${area}|paid-map-review-v2`), 4)];
}

function overviewEvidenceHandlingLine(seed, parts) {
  const { name, scene, area, cost, anchor, move, avoid, caution, work } = parts;
  const moveRule = phraseVariant(move, seed, "overview-rule");
  return [
    `Start by handling ${scene} as evidence, not decoration. For ${name}, ${area} gets expensive when ${cost} starts pricing the facts before they are sorted. The three-month map reduces the emotional tax: name ${anchor}, give the next answer a time window, and close the informed part of the issue. ${capitalize(moveRule)} becomes the repeatable correction. ${overviewHurryMomentLine(seed, avoid)} In relationships, ${caution}. In work, ${work}. A good month will feel less dramatic because it has fewer loose ends.`,
    overviewPracticalEvidenceLine(seed, { name, scene, area, cost, anchor, avoid, caution, work }, moveRule),
    overviewProofPointLine(seed, { name, scene, area, cost, anchor, avoid, caution, work }, moveRule),
    `${capitalize(scene)} is evidence, not background. For ${name}, the expensive pattern around ${area} is ${cost} before the facts have a clean place to land. The three-month map asks for ${anchor} on paper, one answer window, and one close that does not need more information. Keep repeating this correction: ${moveRule}. ${overviewHurryToneLine(seed, avoid)} In relationships, ${caution}. For work, ${work}. The month should become quieter because the open loops are fewer.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|evidence-handling-v2`), 4)];
}

function overviewHurryMomentLine(seed = 0, avoid = "") {
  const avoidText = String(avoid || "").toLowerCase();
  if (avoidText.includes("old thread") || avoidText.includes("answered") || avoidText.includes("settled")) {
    return `If the old thread asks for proof, do less and make the next action cleaner.`;
  }
  return `If ${avoid} tries to hurry the moment, do less; make the next action cleaner.`;
}

function overviewHurryToneLine(seed = 0, avoid = "") {
  const avoidText = String(avoid || "").toLowerCase();
  if (avoidText.includes("old thread") || avoidText.includes("answered") || avoidText.includes("settled")) {
    return `If the old thread asks to reopen the tone, choose the smaller action.`;
  }
  return `If ${avoid} tries to hurry the tone, choose the smaller action.`;
}

function overviewProofPointLine(seed, parts, moveRule) {
  const { name, scene, area, cost, anchor, avoid, caution, work } = parts;
  return [
    `Use ${scene} as the proof point. For ${name}, ${area} gets costly when ${cost} starts deciding the mood before the facts are sorted. The three-month map should put ${anchor} into a dated note, give the next reply a time edge, and close the part that already has enough truth. Repeat this correction: ${moveRule}. If ${avoid} presses for speed, make the action smaller and clearer. In closeness, ${caution}. In work, ${work}. Fewer loose ends will make the month less dramatic.`,
    `${capitalize(scene)} gives the proof a place to stand. For ${name}, ${cost} can make ${area} feel decided before the real facts are arranged. Put ${anchor} into writing, give the next answer a time edge, and close the honest part of the issue today. Repeat this correction: ${moveRule}. If ${avoid} asks for speed, shrink the action first. In closeness, ${caution}. In work, ${work}. The month should leave fewer loose ends, not sharper explanations.`,
    `Let ${scene} become the day's proof point. ${name}, ${area} grows expensive when ${cost} starts charging attention before the practical facts have a place. The three-month map should make ${anchor} visible, set one reply window, and finish the part that can close without more evidence. Repeat this correction: ${moveRule}. When ${avoid} presses for pace, choose the smaller action. With people, ${caution}. With work, ${work}.`,
    `Begin from ${scene} and treat it as evidence. For ${name}, naming ${cost} gives ${area} a cleaner handle before the whole story hardens. Put ${anchor} on paper, choose the next answer window, and close the piece whose facts are ready. Let ${moveRule} be the repeating correction. If ${avoid} hurries the room, do one cleaner action. In closeness, ${caution}. In work, ${work}.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|${anchor}|proof-point-v2`), 4)];
}

function overviewPracticalEvidenceLine(seed, parts, moveRule) {
  const { name, scene, area, cost, anchor, avoid, caution, work } = parts;
  return [
    `Treat ${scene} as evidence first. For ${name}, ${area} gets expensive when ${cost} outruns the evidence. Put ${anchor} into a dated note, give the next answer a window, and close the checkable part of ${anchor} tonight. Repeat the correction: ${moveRule}. If ${avoid} rushes the moment, make ${avoid} smaller before acting. With people, ${caution}. With work, ${work}. ${overviewOpenLoopCloseLine(seed, area, name)}`,
    `${capitalize(scene)} goes first. For ${name}, ${cost} can make ${area} decide too quickly. Write ${anchor}, choose one answer window, and close the part of ${anchor} that can be checked tonight. Let ${moveRule} be the repeatable correction. When ${avoid} hurries the room, answer with one smaller action. With people, ${caution}. With work, ${work}. ${overviewOpenLoopCloseLine(seed + 1, area, name)}`,
    `Use ${scene} as the evidence point. ${name} needs ${area} measured before ${cost} becomes the mood. Give ${anchor}'s reply a time window; let ${anchor}'s finished piece prove movement for ${area}. Repeat this correction: ${moveRule}. If ${avoid} asks for speed, reduce ${avoid} before acting. With people, ${caution}. With work, ${work}. ${overviewOpenLoopCloseLine(seed + 2, area, name)}`,
    `Let ${scene} hold the facts first. For ${name}, ${area} becomes costly when ${cost} gets ahead of what can be proven. Put ${anchor} on paper, time the reply, and finish the part that can be checked beside ${anchor}. Make ${moveRule} the repeatable correction. If ${avoid} pushes the pace, choose the smaller action. With people, ${caution}. With work, ${work}. ${overviewOpenLoopCloseLine(seed + 3, area, name)}`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|${anchor}|practical-evidence-v2`), 4)];
}

function overviewUsefulEvidenceLine(seed, parts) {
  const { name, scene, area, anchor, cost, move, caution, work } = parts;
  const moveRule = phraseVariant(move, seed, "overview-rule");
  return [
    `${capitalize(scene)} is useful evidence: ${area} has a shape, and ${anchor} shows where it gets louder. ${name}, the old response is ${cost}; the repair is not more availability, care, or persuasion. Put the recurring duty on paper, use this rule: ${moveRule}, and close the part that is already ready. In relationships, ${caution}. In work, ${work}. The next review should be able to see what changed without asking the mood to explain it again.`,
    overviewStopLoopLine(seed, { name, scene, area, anchor, cost, caution, work }, moveRule),
    overviewSpecificEvidenceLine(seed, { name, scene, area, anchor, cost, caution, work }, moveRule),
    overviewDatedBoundaryLine(seed, { name, scene, area, anchor, cost, caution, work }, moveRule),
    `${capitalize(scene)} is the practical clue. For ${name}, ${anchor} gets heavy when ${cost} turns a solvable duty into a test of care. Name the duty, use ${moveRule}, and close the ready part before the feeling asks for a bigger verdict. In relationships, ${caution}. At work, ${work}. The useful proof is one saved result and one boundary that can be repeated.`,
    `Use ${scene} to make ${area} concrete. ${name}, ${cost} has been asking ${anchor} to carry too much feeling. Put the duty in plain words, choose ${moveRule}, and finish the part that can close today. Let relationships practice ${caution}; let work use ${work}. The paid reading becomes useful when the result can be checked tomorrow, not only felt tonight.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|${anchor}|useful-evidence-v3`), 6)];
}

function overviewDatedBoundaryLine(seed = 0, parts = {}, moveRule = "") {
  const { name, scene, area, anchor, cost, caution, work } = parts;
  return pickArea(stableHash(`${seed}|${name}|${area}|${anchor}|dated-boundary-v2`), [
    `Start with ${scene}; it gives ${area} a visible edge. ${name}, ${cost} grows around ${anchor}, so write the duty, repeat ${moveRule}, and close the ready piece. In relationships, ${caution}. For work, ${work}. Save one dated result as evidence, not a speech, and let the next review compare behavior instead of mood.`,
    `Use ${scene} to make ${anchor} visible. For ${name}, ${cost} asks for extra attention; answer with ${moveRule}, close the ready part, and save one dated boundary. In relationships, ${caution}. For work, ${work}. The next week should inherit a result it can inspect, not another private argument.`,
    `${capitalize(scene)} gives ${area} a practical edge. ${name}, write the duty around ${anchor}, use ${moveRule}, and close what is ready before the loop asks for more effort. With people, ${caution}. With work, ${work}. Save the result as evidence and let the next review start from the finished detail.`,
    `Begin with ${scene}; ${anchor} needs a written duty and a closeable part. ${name}, use ${moveRule} before ${cost} adds effort. In relationships, ${caution}. For work, ${work}. Let the dated result carry the proof into next week so the pattern has less room to argue.`
  ]);
}

function overviewStopLoopLine(seed, parts, moveRule) {
  const { name, scene, area, anchor, cost, caution, work } = parts;
  return [
    `Use ${scene} as the evidence point for ${area}. When ${anchor} stays unnamed, pressure grows. For ${name}, ${cost} is the old response. Stop feeding that loop: write the duty, use ${moveRule}, and close the ready part before explaining the feeling. In relationships, ${caution}. For work, ${work}. Save one practical proof for tomorrow: duty named, answer timed, next action visible. Before sleep, compare the result with the original duty so morning starts from visible behavior.`,
    `${capitalize(scene)} gives ${name} the loop's entry point. Around ${anchor}, ${cost} asks for more attention than the duty needs. Name the duty, apply ${moveRule}, and close the ready part before the loop asks for more care. In relationships, ${caution}. For work, ${work}. Keep one proof small enough to repeat tomorrow.`,
    `Start with ${scene} and make ${anchor} visible. For ${name}, the old move is ${cost}; the useful move is ${moveRule}. Write the duty, close what is ready, and stop before the loop asks for extra attention. In relationships, ${caution}. For work, ${work}. Tomorrow should inherit proof, not another private reading.`,
    `Use ${scene} to catch ${area} early. ${name}, when ${anchor} gets vague, ${cost} starts steering the tone. Put the duty in writing, use ${moveRule}, and close the part already available before the loop asks for more care. In relationships, ${caution}. For work, ${work}. Keep the proof practical enough to repeat in an ordinary day: one duty named, one edge chosen, one result saved. Before sleep, compare the saved result with the first duty so tomorrow has a cleaner starting point.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${anchor}|${cost}|stop-loop-v2`), 4)];
}

function overviewSpecificEvidenceLine(seed, parts, moveRule) {
  const { name, scene, area, anchor, cost, caution, work } = parts;
  return [
    `${capitalize(scene)} shows ${name} where ${area} has become specific enough to handle. The pressure rises around ${anchor}; ${cost} turns the ready duty into a private test. Put the duty on paper, let ${moveRule} lead, and close what is ready. With people, ${caution}. With work, ${work}. Save one dated line: what moved, what stayed smaller, and which boundary can be repeated tomorrow. The point is not to sound more certain; it is to leave a result the next morning can check without reopening the whole feeling.`,
    `Use ${scene} as the handle for ${area}. ${name}, ${anchor} is the place where ${cost} starts asking for extra attention. Write the duty plainly, let ${moveRule} set the next edge, and finish the piece that can close today. With people, ${caution}. With work, ${work}. Keep one proof in the evening record: the action taken, the pressure reduced, and the boundary that should meet tomorrow first.`,
    `${capitalize(scene)} gives ${name} a practical entry into ${area}. Around ${anchor}, ${cost} makes a small duty feel larger than it is. Put the duty where it can be seen, use ${moveRule}, and close one real part before the mood asks for more interpretation. For people, use ${caution}; for work, use ${work}. By review, ${anchor} should leave one visible change; ${work} should make the practical part easier, and ${caution} should keep the next answer smaller.`,
    `Begin with ${scene}. It points ${name} toward the part of ${area} that can be handled now, especially around ${anchor}. When ${cost} asks for extra attention, answer with ${moveRule} and one closeable duty. With people, ${caution}. With work, ${work}. Save proof that a real action moved before another private story formed. Tomorrow should inherit a smaller task, not a heavier feeling. Before sleep, record one clear fact, one finished duty, and the next time the limit should appear.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${anchor}|${cost}|${caution}|${work}|specific-evidence-v3`), 4)];
}

function extendShortOverview(text, seed, parts = {}) {
  const value = String(text || "").trim();
  if (wordCount(value) >= 105) return value;
  const { area = "the pattern", anchor = "one visible detail", name = "" } = parts;
  const extra = [
    `Save one dated proof tonight: the handled detail, the boundary that held, and the next place ${area} should stay smaller.`,
    shortOverviewVisibleResultClose(seed, area, anchor, name),
    shortOverviewRepeatableClose(seed, area, anchor, name),
    `Keep the record small: what moved, what stayed outside the reply, and what the next morning can trust.`
  ][mod(stableHash(`${seed}|${name}|${area}|${anchor}|short-overview-extension`), 4)];
  return `${value} ${extra}`;
}

function shortOverviewVisibleResultClose(seed = 0, area = "", anchor = "", name = "") {
  const anchorText = String(anchor || "").toLowerCase();
  if (anchorText.includes("yes")) {
    return `Before sleep, save the measured yes beside the written result; tomorrow needs proof it can use without reopening the whole feeling.`;
  }
  if (anchorText.includes("payment") || anchorText.includes("task")) {
    return `Before sleep, put the payment or task result in one line; tomorrow needs proof without reopening the whole feeling.`;
  }
  return pickArea(stableHash(`${seed}|${name}|${area}|${anchor}|visible-result-close-v1`), [
    `Before sleep, write the visible result beside ${anchor}; tomorrow needs proof it can use without reopening the whole feeling.`,
    `Before sleep, save one visible result beside ${anchor}; tomorrow should inherit proof, not the whole feeling.`,
    `At night, place the visible result beside ${anchor}; morning needs usable proof without reopening the full emotion.`
  ]);
}

function shortOverviewRepeatableClose(seed = 0, area = "", anchor = "", name = "") {
  return [
    `The next review should find one closed duty, one lighter answer, and one boundary that can repeat.`,
    `Let the next review compare one finished detail, one quieter reply, and one practical edge around ${anchor}.`,
    `The useful review should leave ${area} with one finished duty and one boundary worth repeating.`,
    `By the next review, keep one completed detail visible and one smaller answer ready to reuse.`,
    `The next check-in should show one duty closed, one explanation reduced, and one edge that held.`
  ][mod(stableHash(`${seed}|${name}|${area}|${anchor}|short-overview-repeatable-v2`), 5)];
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function overviewOpenLoopCloseLine(seed, area, name = "") {
  return [
    `${capitalize(area)} should leave one closed loop and one correction ready for next week.`,
    `Let the review show one fewer loose end, one smaller explanation, and one repeatable correction.`,
    `The month should feel quieter because ${area} has a closed detail, not another private argument.`,
    `By the next review, one open piece should be finished and one correction should be easier to repeat.`
  ][mod(stableHash(`${seed}|${name}|${area}|open-loop-close-v2`), 4)];
}

function overviewSceneOffset(scene) {
  const value = String(scene || "").toLowerCase();
  if (value.includes("task list") || value.includes("draft")) return 1;
  if (value.includes("calendar")) return 4;
  if (value.includes("receipt") || value.includes("payment")) return 2;
  if (value.includes("notebook")) return 3;
  if (value.includes("threshold") || value.includes("exit")) return 5;
  return 0;
}

function overviewSeventhDayLine(seed, area) {
  return [
    overviewSeventhEvidenceLine(seed, area),
    `${capitalize(area)} gets day-seven proof.`,
    `The useful test is whether ${area} gives the next review something visible to inspect.`,
    `Let the seventh-day review find evidence in ${area}, not another mood to interpret.`
  ][mod(stableHash(`${seed}|${area}|seventh-day`), 4)];
}

function overviewSeventhEvidenceLine(seed, area) {
  return [
    `Useful guidance leaves ${area} with day-seven evidence: one finished duty and one fact morning can trust.`,
    `The seventh-day proof for ${area} should be practical: one closed detail, one calmer reply, one usable fact.`,
    `Day seven should leave a closed duty, a smaller explanation, and one fact that ${area} can use tomorrow morning.`,
    `By day seven, ${area} should leave visible proof instead of another private argument.`,
    `Let the seventh day give ${area} one closed duty, one simpler explanation, and one fact worth repeating.`,
    `The day-seven mark for ${area} is practical proof: one duty closed, one answer smaller, one fact saved.`
  ][mod(stableHash(`${seed}|${area}|${String(area).length}|seventh-evidence-v3`), 6)];
}

function overviewTestablePlaceLine(seed, name, scene, area) {
  return [
    `For ${name}, ${scene} tests ${area} through one practical detail.`,
    `For ${name}, ${scene} is the small proof-point where ${area} can stop staying abstract.`,
    `${capitalize(scene)} matters because it turns ${area} into one visible detail ${name} can work with.`,
    `Use ${scene} as ${name}'s test surface for ${area}; the pattern needs evidence before interpretation.`,
    `${capitalize(scene)} gives ${area} a handle, so ${name} can change one visible detail instead of carrying the whole mood.`,
    `${capitalize(scene)} turns ${area} into something ${name} can inspect before the mood names it.`,
    `Let ${scene} make ${area} concrete for ${name}; one visible detail should lead before interpretation starts.`,
    `${capitalize(scene)} is where ${name} needs one fact for ${area} before another story forms.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|testable-place-v2`), 8)];
}

function overviewEvidenceWeightLine(seed, name, area) {
  return [
    `that ordinary detail shows ${name} where the facts around ${area} cannot carry ${area}'s extra weight anymore.`,
    `${name} can see there how ${area} asks for interpretation before the real duty is clear.`,
    `the useful signal shows ${name} where meaning around ${area} starts arriving before the facts settle.`,
    `that small cue shows ${name} where ${area} needs evidence before another explanation.`,
    `Give ${area} one proof point for ${name}, then keep the mood around ${area} out of the verdict.`
  ][mod(stableHash(`${seed}|${name}|${area}|evidence-weight`), 5)];
}

function overviewPlainMarkerLine(seed, scene, area) {
  return [
    `${capitalize(scene)} gives the pressure around ${area} a practical address before it spreads through the day.`,
    `Treat ${scene} as the marker for ${area}; it shows where attention is leaving the real task.`,
    overviewLocatePressureLine(seed, scene, area),
    `${capitalize(scene)} is the ordinary place where ${area} asks to be made visible.`,
    `Start with ${scene}; the useful signal is how ${area} pulls attention away from the next clean step.`
  ][mod(stableHash(`${seed}|${scene}|${area}|plain-marker`), 5)];
}

function overviewLocatePressureLine(seed = 0, scene = "", area = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("recognition") || areaText.includes("public")) {
    const sceneText = String(scene || "").toLowerCase();
    if (sceneText.includes("glass") || sceneText.includes("water")) {
      return `Let ${scene} show the recognition pressure; ${area} should leave one proof on the work surface while the mood is still quiet.`;
    }
    if (sceneText.includes("deadline") || sceneText.includes("marked")) {
      return `Start with ${scene} as the recognition-pressure marker, then put one proof for ${area} inside the deadline before interpretation gets loud.`;
    }
    return `Use ${scene} as the recognition-pressure marker, then give ${area} one reviewable proof while the mood is still small.`;
  }
  return pickArea(stableHash(`${seed}|${scene}|${area}|locate-pressure-v1`), [
    `Use ${scene} to locate ${area} before the pressure turns into a mood.`,
    `Let ${scene} show where ${area} starts gathering pressure, then answer it with one visible fact.`,
    `Use ${scene} as the marker for ${area}; catch the pressure while it is still practical.`
  ]);
}

function overviewCostSizeLine(seed, name, cost) {
  return [
    `${name}, the cost is ${cost}, and the next duty should be measured by facts rather than emotional weight.`,
    `${name}, the expensive part is ${cost}; it makes the next task feel personal before the evidence is complete.`,
    `${name}, the pattern costs energy through ${cost}, so the repair has to be practical before it becomes emotional.`,
    `${name}, ${cost} is the tax on the day; name that tax before the next promise is chosen.`,
    `${name}, the pressure grows through ${cost}, then asks for reassurance when the work actually needs a container.`
  ][mod(stableHash(`${seed}|${name}|${cost}|cost-size`), 5)];
}

function overviewTimingDrainLine(seed, cost) {
  return [
    overviewTimingPersonalLine(seed, cost),
    `The timing problem belongs to ${cost}; let the practical step answer ${cost} before emotion adds a price.`,
    `The cost pattern is ${cost}, especially when timing starts carrying more meaning than the next action.`,
    `What drains the day is ${cost}; the next practical step should not have to prove emotional safety.`
  ][mod(stableHash(`${seed}|${cost}|timing-drain`), 4)];
}

function overviewTimingPersonalLine(seed = 0, cost = "") {
  return [
    `The drain is ${cost}; timing should return to facts before the next step gets emotional.`,
    `${capitalize(cost)} makes the hour feel personal, so the repair has to stay practical.`,
    `The old drain is ${cost}; answer it with timing, facts, and one visible next step.`,
    overviewClockChargeLine(seed, cost),
    `The pressure in ${cost} belongs beside the facts, not inside the whole mood.`
  ][mod(stableHash(`${seed}|${cost}|timing-personal-v2`), 5)];
}

function overviewClockChargeLine(seed = 0, cost = "") {
  const costText = String(cost || "").toLowerCase();
  if (costText.includes("responsibility")) {
    return `When responsibility starts charging the clock, answer with one practical step before the hour turns into proof of love.`;
  }
  if (costText.includes("practical duty")) {
    return `When the practical duty turns into negotiation, put the clock back beside one action instead of letting emotion price the hour.`;
  }
  return pickArea(stableHash(`${seed}|${cost}|clock-charge-line-v1`), [
    `When the clock starts carrying ${cost}, answer with one practical step before emotion prices the hour.`,
    `If ${cost} starts charging the hour, keep the repair practical enough to finish before the mood grows.`,
    `When timing gets expensive through ${cost}, put one visible action back in charge.`
  ]);
}

function overviewInspectableSequenceLine(seed, anchor) {
  return [
    `For the paid cycle, build a sequence that can be inspected: write ${anchor}, choose one reply window, and close a task before the mind reopens it.`,
    `Mark ${anchor}: cue for ${anchor}, reply time for ${anchor}, closed proof.`,
    `Let ${anchor} carry the sequence: write it down, give the next reply a window, and close one task before the case reopens.`,
    overviewVisibleOrderLine(seed, anchor)
  ][mod(stableHash(`${seed}|${anchor}|inspectable-sequence`), 4)];
}

function overviewVisibleOrderLine(seed = 0, anchor = "") {
  return pickArea(stableHash(`${seed}|${anchor}|visible-order-line-v2`), [
    `The three-month order around ${anchor} is practical: cue written, reply timed, duty finished, case closed.`,
    `Give ${anchor} visible order: written cue, timed reply, finished task, no reopened case before evening.`,
    `Let ${anchor} move through four steps: cue, reply window, closed task, saved evidence.`,
    `The useful order for ${anchor} is written cue first, timed reply second, task closed before evening.`,
    `Build the visible order around ${anchor}: write it, time the reply, finish the duty, stop reopening it.`
  ]);
}

function overviewUrgencyClose(seed, area) {
  return [
    overviewSimpleStructureLine(seed, area),
    `For ${area}, the aim is structure that keeps urgency from pretending to be proof.`,
    overviewStructuredUrgencyLine(seed, area),
    `${capitalize(area)} can be carried by structure; urgency does not need to become the proof.`
  ][mod(stableHash(`${seed}|${area}|urgency-close`), 4)];
}

function overviewSimpleStructureLine(seed = 0, area = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("money")) {
    return `The aim is simple: let the money structure prove care before urgency asks for the role.`;
  }
  if (areaText.includes("ambition") || areaText.includes("recognition") || areaText.includes("proof")) {
    return `The aim is simple: let visible structure prove the work before urgency asks for the role.`;
  }
  return pickArea(stableHash(`${seed}|${area}|simple-structure-v1`), [
    `The aim is simple: let structure prove care before urgency asks for the role.`,
    `The aim is practical: let structure carry proof before urgency asks for a role.`,
    `The simple aim is structure first, then urgency with less authority.`
  ]);
}

function overviewStructuredUrgencyLine(seed = 0, area = "") {
  return pickArea(stableHash(`${seed}|${area}|structured-urgency-v2`), [
    `The week improves when ${area} gets structure before urgency takes the role.`,
    `Let ${area} receive a practical frame before urgency starts arguing.`,
    `The useful shift is structure first, then urgency with less authority.`,
    `Give ${area} one visible frame so urgency has less room to perform.`,
    `The week gets easier when structure answers before urgency grows.`
  ]);
}

function overviewContainerLine(seed, anchor) {
  return [
    `The paid map gives that pressure a container: write ${anchor}, name the hidden cost, and close one part that can be finished today.`,
    `Turn the pressure into a visible sequence: put ${anchor} on paper, choose the useful limit, and finish one factual step.`,
    `Give the pattern a place to land by naming ${anchor}, setting one boundary, and completing the part of ${anchor} that is ready to close.`,
    `Make the pressure inspectable: record ${anchor}, mark the cost of leaving it vague, and close the smallest honest part.`
  ][mod(stableHash(`${seed}|${anchor}|container`), 4)];
}

function overviewProgressLine(seed, area) {
  return [
    `For ${area}, let the body see the changed detail before calling the progress real.`,
    `This is how ${area} becomes less private: the repair has evidence before the mood changes.`,
    `The useful shift in ${area} is not intensity; it is proof that can be reviewed tomorrow.`,
    `Let ${area} improve through visible repair, not through another hidden negotiation.`,
    `The body trusts ${area} faster when the proof is visible, dated, and small enough to repeat.`,
    `Progress in ${area} should leave a mark the body can recognize before the mind argues again.`
  ][mod(stableHash(`${seed}|${area}|progress-v2`), 6)];
}

function overviewEvidenceClose(seed, area, name) {
  return [
    `For ${area}, evidence means a cleaner ${area} promise, less hidden accounting around ${area}, and one repair repeated next week.`,
    overviewBodyTrustClose(seed, area, name),
    `Let the next reviews show ${area} earning steadiness through dated proof.`,
    `The paid work is to make ${area} easier to inspect: less emotional accounting around ${area}, more finished detail.`
  ][mod(stableHash(`${seed}|${area}|${name}|evidence`), 4)];
}

function overviewBodyTrustClose(seed = 0, area = "", name = "") {
  const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return pickArea(stableHash(`${seed}|${area}|${name}|body-trust-close-v2`) + nameOffset, [
    `By the end of the cycle, proof should stay attached to ${area}, even after the day's feeling changes.`,
    `The cycle should give ${area} dated proof the body can trust after the mood has changed.`,
    `By the final review, ${area} should have evidence the body can recognize without chasing a feeling.`,
    `At the final review, make ${area}'s repair one step that can repeat.`
  ]);
}

function overviewEffortLine(seed, cost, name = "") {
  return [
    `The issue is not effort; it is ${cost} until duty turns costly.`,
    `The pressure is not a lack of trying; ${cost} makes the next ordinary task feel more expensive than it is.`,
    `What needs care is the cost pattern: ${cost}, especially before the next duty gets heavy.`,
    overviewRealDrainLine(seed, cost, name)
  ][mod(stableHash(`${seed}|${cost}|effort`), 4)];
}

function overviewRealDrainLine(seed = 0, cost = "", name = "") {
  const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return pickArea(stableHash(`${seed}|${name}|${cost}|real-drain-v1`) + nameOffset, [
    `The real drain is ${cost}; write ${cost} before another task borrows ${cost}.`,
    `The real drain is ${cost}; name the charge early so the next task stays ordinary.`,
    `The real drain is ${cost}; keep the next task factual before this cost turns it into a verdict.`,
    `The real drain is ${cost}; put the charge on paper before another duty inherits it.`
  ]);
}

function overviewVisibleAnchorLine(seed, anchor, name = "", area = "") {
  return [
    `Put ${anchor} where it can be seen, attach one time limit, and finish the piece that already has enough facts.`,
    overviewVisibleBoundaryLine(seed, anchor),
    `Move ${anchor} out of the mind and into the day: one written line, one time edge, one finished detail.`,
    overviewUsefulLimitLine(seed, anchor, name, area)
  ][mod(stableHash(`${seed}|${anchor}|visible`), 4)];
}

function overviewUsefulLimitLine(seed = 0, anchor = "", name = "", area = "") {
  const safeName = name || "the day";
  const safeArea = area || "the practical pressure";
  return pickArea(stableHash(`${seed}|${anchor}|${safeName}|${safeArea}|useful-limit-v2`), [
    `Set ${anchor} in front of the day; let ${safeArea} receive one practical limit and close the settled piece.`,
    `Put ${anchor} beside ${safeArea}; make the first limit useful, then close the part that is already settled.`,
    `Give ${anchor} one visible edge inside ${safeArea}; close the settled part before more proof gets requested.`,
    `Move ${anchor} into ${safeArea}'s real schedule; set one edge and finish the part that is ready.`
  ]);
}

function overviewVisibleBoundaryLine(seed, anchor) {
  return [
    `Give ${anchor} a place in the day; let the boundary stay clean and the finish survive the mood changing.`,
    `Put ${anchor} beside one clean boundary, then close the part that can still be checked tonight.`,
    `Let ${anchor} have a visible place, a smaller edge, and one finish that does not need a larger story.`,
    `Make the place for ${anchor} visible, keep ${anchor}'s boundary clean, and close ${anchor} before the mood can rewrite it.`
  ][mod(stableHash(`${seed}|${anchor}|visible-boundary-v2`), 4)];
}

function overviewMapOpening(seed, scene, area) {
  return [
    `The pressure around ${area} needs a three-month map that starts in the ordinary scene of ${scene}.`,
    `Let ${scene} begin the three-month map for ${area}, because the pressure needs a place to be inspected.`,
    overviewConcreteStartLine(seed, scene, area),
    `${capitalize(scene)} gives the three-month map for ${area} a place to start without making the day dramatic.`
  ][mod(stableHash(`${seed}|${scene}|${area}|map-open`), 4)];
}

function overviewConcreteStartLine(seed, scene, area) {
  return [
    `Let ${scene} give ${area} a concrete start; keep the first review beside that exact scene.`,
    `${capitalize(scene)} makes ${area} reviewable today.`,
    `Use ${scene} to make ${area} inspectable; the review should begin with that ordinary evidence.`,
    `${capitalize(scene)} gives ${area} a first handle, so the review starts with evidence instead of mood.`
  ][mod(stableHash(`${seed}|${scene}|${area}|concrete-start`), 4)];
}

function overviewCostCrowdLine(seed, name, cost) {
  return [
    overviewInvisibleAccountingLine(seed, name, cost),
    `${name}, effort is not the missing piece; ${cost} is the part that quietly crowds the day.`,
    `${name}, ordinary timing gets crowded when ${cost} starts adding private accounting to the day.`,
    `${name}, the map begins where ${cost} turns the day into too many invisible calculations.`
  ][mod(stableHash(`${seed}|${name}|${cost}|crowd`), 4)];
}

function overviewInvisibleAccountingLine(seed = 0, name = "", cost = "") {
  return [
    `${name}, the issue is not effort; ${cost} is the hidden accounting that crowds the day.`,
    `${name}, the missing piece is not effort; ${cost} keeps adding private calculations.`,
    `${name}, ${cost} makes the day feel crowded before the real task is named.`,
    `${name}, the map starts where ${cost} turns effort into quiet bookkeeping.`,
    `${name}, the costly part is ${cost}; name it before the day fills with private math.`
  ][mod(stableHash(`${seed}|${name}|${cost}|invisible-accounting-v2`), 5)];
}

function overviewInspectLine(seed, anchor, name = "") {
  return [
    overviewInspectableHandleLine(seed, anchor, name),
    overviewVisibleCycleLine(seed, anchor, name),
    overviewAnchorEvidenceLine(seed, anchor, name),
    overviewInspectHandleLine(seed, anchor, name)
  ][mod(stableHash(`${seed}|${name}|${anchor}|inspect-v3`), 4)];
}

function overviewInspectableHandleLine(seed, anchor, name = "") {
  return [
    `Use the next three months to give ${anchor} a visible record: write the cue, mark the cost, and close the part that can finish before evening.`,
    `Make ${anchor} reviewable in three steps: write the duty, name the cost, and close the part that can honestly finish today.`,
    `Let ${anchor} move out of the mind and into the record: one written cue, one cost named, one evening-sized finish.`,
    `Turn ${anchor} into a usable checkpoint: what it costs, what part can close, and what should stay out of the next reply.`
  ][mod(stableHash(`${seed}|${name}|${anchor}|inspectable-handle-v2`), 4)];
}

function overviewVisibleCycleLine(seed, anchor, name = "") {
  return [
    `Make the next three-month cycle visible: place ${anchor} on paper, mark its cost, finish one evening-sized piece, and leave the rest outside the next conversation.`,
    `Give the cycle a visible record around ${anchor}: one note, one named price, and one useful part closed before the next exchange.`,
    `Let ${anchor} hold the record for this cycle: written place first, cost second, one closeable action before another discussion.`,
    `Keep ${anchor} practical by writing it down, naming its price, and finishing the part that can reduce tomorrow's pressure.`
  ][mod(stableHash(`${seed}|${name}|${anchor}|visible-cycle-v2`), 4)];
}

function overviewInspectHandleLine(seed, anchor, name = "") {
  return [
    `Use ${anchor} as the three-month handle: one written duty, one named cost, one part closed before evening, and one conversation left lighter.`,
    `Let ${anchor} become the handle: write the duty, name the cost, close the evening-sized part, and leave the next conversation easier to carry.`,
    `Put ${anchor} in charge of the sequence: duty named, cost written, one useful part finished, and one exchange made lighter.`,
    `Make ${anchor} the practical handle by naming the duty, marking its cost, finishing one piece, and keeping the next conversation smaller.`
  ][mod(stableHash(`${seed}|${name}|${anchor}|inspect-handle-v2`), 4)];
}

function overviewAnchorEvidenceLine(seed, anchor, name = "") {
  return [
    `Put ${anchor} on paper. Close one part. In the next exchange, use the written fact and leave the heat outside.`,
    `Let ${anchor} produce evidence in the next cycle: write the cost, close one useful part, and leave the next conversation easier to carry.`,
    `Build evidence around ${anchor} by naming the price, finishing one useful piece, and keeping the next exchange smaller than the worry.`,
    overviewProofPointRepairLine(seed, anchor),
    `Let ${anchor} become the factual edge: name the cost, finish the ready piece, and let the next reply borrow calm from the completed work.`,
    `Give ${anchor} a written place first. Then close the piece that can move today and keep the next exchange tied to the visible result.`
  ][mod(stableHash(`${seed}|${name}|${anchor}|anchor-evidence-v3`), 6)];
}

function overviewProofPointRepairLine(seed = 0, anchor = "") {
  return pickArea(stableHash(`${seed}|${anchor}|proof-point-repair-v2`), [
    `Use ${anchor} as the proof point: write the cost, close one practical part, and let the next exchange stay lighter.`,
    `Let ${anchor} hold the evidence: cost named, useful part closed, next conversation smaller.`,
    `Make ${anchor} practical by writing the cost, finishing one piece, and keeping the next reply tied to visible work.`,
    overviewProofRepairSpecificLine(seed, anchor),
    `Let ${anchor} leave proof through one written cost, one closed part, and one lighter conversation.`
  ]);
}

function overviewProofRepairSpecificLine(seed = 0, anchor = "") {
  const anchorText = String(anchor || "").toLowerCase();
  if (anchorText.includes("promise")) {
    return `Use ${anchor} for the repair: write the cost, close the kept edge, and let the next exchange stay less crowded.`;
  }
  if (anchorText.includes("yes")) {
    return `Use ${anchor} for the repair: measure the cost, close one practical finish, and keep the next answer smaller.`;
  }
  return pickArea(stableHash(`${seed}|${anchor}|proof-repair-specific-v1`), [
    `Use ${anchor} for the repair: cost written, practical part closed, next exchange easier to carry.`,
    `Let ${anchor} guide the repair: write the price, close one useful piece, and leave the next reply less crowded.`,
    `Make ${anchor} the repair point: one cost named, one piece finished, and one exchange kept smaller.`
  ]);
}

function overviewManagerLine(seed, avoid, caution) {
  return [
    overviewCrowdedToneLine(seed, avoid, caution),
    `Do not let ${avoid} manage the tone. For closeness, return to this rule: ${caution}.`,
    overviewAvoidTakesChargeLine(seed, avoid, caution),
    `Keep ${avoid} out of the manager role; let closeness stay guided by ${caution}.`
  ][mod(stableHash(`${seed}|${avoid}|${caution}|manager`), 4)];
}

function overviewAvoidTakesChargeLine(seed = 0, avoid = "", caution = "") {
  const avoidText = String(avoid || "").toLowerCase();
  if (avoidText.includes("old thread") || avoidText.includes("settled") || avoidText.includes("answered")) {
    return `When the old thread asks for proof again, give closeness a cleaner rule: ${caution}.`;
  }
  return pickArea(stableHash(`${seed}|${avoid}|${caution}|avoid-takes-charge-v1`), [
    `When ${avoid} tries to take charge, give closeness a cleaner rule: ${caution}.`,
    `If ${avoid} starts taking charge, return closeness to this rule: ${caution}.`,
    `When ${avoid} pushes for the manager role, let closeness follow ${caution}.`
  ]);
}

function overviewCrowdedToneLine(seed = 0, avoid = "", caution = "") {
  const cautionText = String(caution || "").toLowerCase();
  if (cautionText.includes("access")) {
    return `If the tone gets crowded, give access a clearer hour before ${avoid} takes over.`;
  }
  if (cautionText.includes("receive")) {
    return `If the tone gets crowded, receive the point first and keep ${avoid} from assigning the aftermath to you.`;
  }
  if (cautionText.includes("time") || cautionText.includes("timing")) {
    return `If the tone gets crowded, let timing and warmth lead before ${avoid} starts managing the reply.`;
  }
  return pickArea(stableHash(`${seed}|${avoid}|${caution}|crowded-tone-v1`), [
    `If the tone gets crowded, return to ${caution} before ${avoid} takes over.`,
    `When the tone gets crowded, use ${caution} as the closeness rule and keep ${avoid} outside the exchange.`,
    `If the exchange gets crowded, let ${caution} set the edge before ${avoid} chooses the pace.`
  ]);
}

function overviewWorkPracticalClose(seed, work) {
  return [
    `Let work stay practical through this signal: ${work}. The win is a trackable rhythm, not a perfect mood.`,
    `For work, keep returning to ${work}. The paid cycle succeeds when rhythm becomes visible before mood has to approve it.`,
    `Let the practical side follow ${work}. The real win is a rhythm that can be tracked, saved, and repeated.`,
    overviewSavedRecordWorkLine(seed, work)
  ][mod(stableHash(`${seed}|${work}|practical-close`), 4)];
}

function overviewSavedRecordWorkLine(seed = 0, work = "") {
  const workText = String(work || "").toLowerCase();
  if (workText.includes("practical question")) {
    return `Let the saved record carry ${work}; keep the mood out of the proof and let the answer stay factual.`;
  }
  if (workText.includes("uncertain plan")) {
    return `Let ${work} become the work signal, then save the record as proof of timing, place, and first action.`;
  }
  if (workText.includes("planning") || workText.includes("plan")) {
    return `Let the work signal stay with ${work}; the saved record should prove the plan, not the mood around it.`;
  }
  return pickArea(stableHash(`${seed}|${work}|saved-record-work-v1`), [
    `Let ${work} carry the work signal; the saved record should hold proof instead of mood.`,
    `Use the saved record to show ${work}, then leave the temporary mood outside the proof.`,
    `Let the record save ${work} as evidence, not as another feeling to interpret.`
  ]);
}

function overviewMethodOpening(seed, scene, area, name = "") {
  const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return [
    `Use ${scene} as the entry point, because mood should meet ${area}'s repeatable method, not a loose story.`,
    `Start from ${scene}; give ${area} a practical loop the body can repeat tomorrow.`,
    `Let ${scene} open the map, because ${area} is asking for a method the body can recognize again tomorrow.`,
    overviewUsableMethodLine(seed, scene, area)
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|method-v2`) + nameOffset, 4)];
}

function overviewUsableMethodLine(seed = 0, scene = "", area = "") {
  return pickArea(stableHash(`${seed}|${scene}|${area}|usable-method-v1`), [
    `Begin with ${scene}; give ${area} one method before ${area} turns private again.`,
    `Begin at ${scene}; give ${area} one method the day can repeat instead of another private interpretation.`,
    `Use ${scene} to make ${area} workable: one method, one proof, and less private mood-reading.`,
    `Let ${scene} hold ${area} in a usable method before the feeling asks for a larger story.`
  ]);
}

function overviewVisibleSequenceLine(seed, anchor, name = "") {
  return [
    `For ${anchor}, set the body cue first, put the promise on paper, and close one task before review.`,
    `Make ${anchor} the sequence: settle the body, write the promise, and close the task before the next review gets a chance to reopen it.`,
    `The sequence starts with ${anchor}: body cue first, ${anchor} on paper, then one finished task.`,
    `Build the visible order through ${anchor}: body first, promise on paper, one task closed before the next review.`
  ][mod(stableHash(`${seed}|${name}|${anchor}|sequence-v2`) + stableHash(name), 4)];
}

function overviewSmallDutyLine(seed, cost) {
  return [
    `${cost} makes the smallest duty feel like evidence about love, value, or timing.`,
    `under ${cost}, even a small duty can start sounding like proof about timing or worth.`,
    `the pattern turns a small duty into evidence before the day has enough facts.`,
    `under ${cost}, keep the duty factual.`
  ][mod(stableHash(`${seed}|${cost}|small-duty`), 4)];
}

function overviewRecordClose(seed, area) {
  return [
    `By month three, ${area} should leave body-trust evidence.`,
    `Over three months, ${area} should leave a record the body can inspect and trust.`,
    `The paid cycle works when ${area} becomes a saved record, not a passing insight.`,
    `This is how ${area} moves from scattered insight into evidence that can be reviewed.`
  ][mod(stableHash(`${seed}|${area}|record-close`), 4)];
}

function overviewDeepPlacementOpening(seed, scene, name, area) {
  return [
    `The deeper reading begins with ${scene}: it shows ${name} where ${area} needs cleaner placement before private pressure grows.`,
    `${scene} begins the deeper reading for ${name}, because ${area} needs placement that can be seen and reviewed.`,
    `For ${name}, ${scene} shows where ${area} should be written next to ${scene}; do not let it move indoors.`,
    `The deeper map starts at ${scene}; it shows ${name} how ${area} can be placed before it becomes private pressure.`
  ][mod(stableHash(`${seed}|${scene}|${name}|${area}|deep-placement`), 4)];
}

function overviewHabitCostLine(seed, cost, name = "", area = "") {
  return [
    `When ${cost} rises, name it early.`,
    `${cost} is the costly habit; facts need a place before small duties become verdicts.`,
    `The expensive habit is ${cost}; facts need a place before the next duty becomes personal.`,
    `What costs the most is ${cost}; name ${cost} and keep the duty factual.`
  ][mod(stableHash(`${seed}|${cost}|${name}|${area}|habit-cost-v4`) + stableHash(area), 4)];
}

function overviewThreeMonthVisibleLine(seed, area) {
  const areaCue = phraseVariant(area, seed, "overview-area");
  return [
    `Begin the record with ${areaCue}.`,
    `Use the next three months to leave dated proof around ${areaCue}.`,
    `Give the next three months a dated record for review.`,
    `Let ${areaCue} keep the three-month proof, not the mood.`,
    `Let the next three months leave proof that can be compared.`,
    `Use three months to turn the pressure into reviewable evidence.`
  ][mod(stableHash(`${seed}|${areaCue}|three-month-visible-v3`) + stableHash(areaCue), 6)];
}

function overviewSmallPromiseLine(seed, anchor) {
  return [
    `Place ${anchor} in one plain line; close the part of ${anchor} that can settle today.`,
    `Write ${anchor}; close ${anchor} before the day turns emotional.`,
    `Move ${anchor} from the mind into a visible note, then finish the smallest piece that can honestly close today.`,
    `Put ${anchor} where the day can see it; close one clean detail before another worry starts editing the plan.`,
    `Make ${anchor} visible, choose one kept promise, and let tonight inherit a finished detail instead of another loose meaning.`,
    `Give ${anchor} one line, one hour, and one close that can be checked before sleep.`,
    `Turn ${anchor} into a small record: written place first, finished piece second, no extra verdict required.`,
    `Write the practical edge of ${anchor}; let one finished piece prove movement before the feeling asks for a larger answer.`,
    `Name ${anchor} in the day's plain language, then close the part that can be true by tonight.`
  ][mod(stableHash(`${seed}|${anchor}|small-promise-v3`) + stableHash(anchor), 9)];
}

function overviewCareProofLine(seed, name = "", area = "") {
  return [
    `Care needs proof in behavior.`,
    `Care becomes believable when behavior can carry the proof.`,
    `The useful proof is behavior that can be repeated without pressure.`,
    `Let changed behavior carry trust.`,
    `Trust becomes steadier when the proof is visible in action.`,
    `The repair works when care has evidence, not just better wording.`,
    `At review, write the changed behavior before adding any defense.`,
    `Repeated action makes the promise believable.`
  ][mod(stableHash(`${seed}|${name}|${area}|care-proof-v4`) + stableHash(name), 8)];
}

function overviewReviewBoundaryLine(seed, avoid, name = "", area = "") {
  return [
    `Keep the review away from ${avoid}.`,
    `Let the review measure the work, not ${avoid}.`,
    `Use the review to notice ${avoid} without giving it the final word.`,
    `Keep ${avoid} outside the written review.`,
    `Let ${area} be reviewed by evidence, not by ${avoid}.`,
    `Leave one note the review can use.`
  ][mod(stableHash(`${seed}|${avoid}|${name}|${area}|review-boundary-v2`), 6)];
}

function overviewRuleLine(seed, move) {
  const moveCue = phraseVariant(move, seed, "overview-rule");
  return [
    `${moveCue}. Keep pressure practical.`,
    `${moveCue}. Give the conversation a useful edge before the room fills with explanations.`,
    `${moveCue}. Keep the next exchange tied to facts before it starts performing care.`,
    `${moveCue}. Let the reply stay close to timing, task, and request.`,
    `${moveCue}. Let the answer stop when it has served the real need.`,
    `${moveCue}. Keep the first note free of extra explanation.`,
    `${moveCue}. Then keep the conversation close to the practical facts.`,
    `${moveCue}. Stop before the room asks for more words.`
  ][mod(stableHash(`${seed}|${moveCue}|rule-line-v6`) + stableHash(moveCue), 8)];
}

function overviewBodyNegotiationLine(seed, area) {
  return [
    `For this pattern, the body needs proof after the choice, not another negotiation.`,
    `Once the choice is plain, let ${area} stop asking the body to reargue it.`,
    `The body stops rearguing once ${area} has one visible action.`,
    `Put one action inside ${area}; if the body reopens ${area}, answer with proof.`,
    `The repair is to give ${area} a visible answer before the body turns it into another argument.`,
    `When ${area} has a clean next step, the body does not need to carry the whole debate.`
  ][mod(stableHash(`${seed}|${area}|body-negotiation-v3`), 6)];
}

function overviewPressureRepeatLine(seed, cost) {
  return [
    `The pressure has a route; today it moves through ${cost}.`,
    `The pressure repeats through ${cost}, then looks for a place to settle.`,
    `Answer the evidence around ${cost}; do not let the private argument grow.`,
    `The pattern returns through ${cost}, so the repair has to be visible.`,
    `The first clue is ${cost}; treat it as a cost before it becomes the whole story.`,
    `Watch how ${cost} gives the pressure a familiar doorway, then answer with one visible repair.`
  ][mod(stableHash(`${seed}|${cost}|pressure-repeat-v2`), 6)];
}

function overviewVisibleChainLine(seed, anchor) {
  return [
    overviewVisibleChainOpening(seed, anchor),
    `Let ${anchor} become the visible chain: write the cue, time the response, finish the duty, and save the evidence.`,
    `The paid cycle needs a chain anchored in ${anchor}: one cue, one response window, one finished duty, and one saved note.`,
    overviewChainOrderLine(seed, anchor)
  ][mod(stableHash(`${seed}|${anchor}|visible-chain`), 4)];
}

function overviewVisibleChainOpening(seed, anchor) {
  return [
    `For this three-month cycle, build one visible chain around ${anchor}: cue, timed response, finished duty, and a saved note about what changed.`,
    `Give ${anchor} a chain the day can inspect: cue first, response timed, duty finished, evidence saved.`,
    `Make ${anchor} practical: notice the cue, answer at a chosen time, close one duty, and save the result.`,
    `Let ${anchor} move in order: notice the cue, time the response, finish the duty, then save what changed.`
  ][mod(stableHash(`${seed}|${anchor}|visible-chain-opening-v2`), 4)];
}

function overviewChainOrderLine(seed = 0, anchor = "") {
  return [
    `Build the chain through ${anchor}: written cue, timed answer, closed duty, saved evidence.`,
    `Let ${anchor} set the order: cue written, response timed, one duty closed, one result saved.`,
    `Use ${anchor} for the sequence: note the cue, time the reply, finish the duty, and save the evidence.`,
    `Make ${anchor} the chain's anchor: written cue first, chosen response time, finished duty, saved result.`
  ][mod(stableHash(`${seed}|${anchor}|chain-order-v2`), 4)];
}

function overviewExplanationLine(seed, avoid, caution) {
  return [
    `Keep ${avoid} out of the explanation; use ${caution} as the closeness rule.`,
    `Do not let ${avoid} explain the whole day. Let closeness take its shape from ${caution}.`,
    overviewExplainEverythingLine(seed, avoid, caution),
    `Keep the explanation smaller than ${avoid}; let closeness stay guided by ${caution}.`
  ][mod(stableHash(`${seed}|${avoid}|${caution}|explanation`), 4)];
}

function overviewExplainEverythingLine(seed = 0, avoid = "", caution = "") {
  const avoidText = String(avoid || "").toLowerCase();
  if (avoidText.includes("old thread") || avoidText.includes("answered") || avoidText.includes("settled")) {
    return `When the old thread asks for proof again, return closeness to this rule: ${caution}.`;
  }
  return pickArea(stableHash(`${seed}|${avoid}|${caution}|explain-everything-v1`), [
    `When ${avoid} tries to explain everything, return closeness to this rule: ${caution}.`,
    `If ${avoid} starts explaining everything, let closeness return to ${caution}.`,
    `When the explanation grows around ${avoid}, bring closeness back to ${caution}.`
  ]);
}

function overviewNoticeOpening(seed, name, scene, area) {
  return [
    `${name}, notice ${scene}; it points to where ${area} has been taking space from steadier choices.`,
    `${scene} gives ${name} a close-range view of ${area}, especially where attention starts leaving the present task.`,
    `For ${name}, ${scene} marks the part of ${area} that keeps asking for structure before it asks for emotion.`,
    `${name}, start with ${scene}; practical friction gives ${area} a usable place to begin.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|notice`), 4)];
}

function overviewRepairLine(seed, cost) {
  return [
    `The repeating cost is ${cost}; make a visible rule around ${cost}.`,
    `The expensive pattern is ${cost}, so the correction needs to be seen on paper before the feeling gets louder.`,
    `What keeps draining the day is ${cost}; the answer is a cleaner rule, not another round of self-pressure.`,
    `The old tax is ${cost}, which means the repair has to be small enough to repeat and clear enough to measure.`
  ][mod(stableHash(`${seed}|${cost}|repair`), 4)];
}

function overviewPlanLine(seed, anchor, name = "", area = "") {
  return [
    `Put ${anchor} on paper, give it a start and stop, then protect the first finished step before another person or worry edits the plan.`,
    `Write ${anchor} where the day can see it, choose one time boundary, and close the piece that already has enough facts.`,
    `Give ${anchor} a day slot: choose one time for ${anchor}, close its smallest part, and stop.`,
    overviewNamedPlacePlanLine(seed, anchor, name, area)
  ][mod(stableHash(`${seed}|${anchor}|plan`), 4)];
}

function overviewNamedPlacePlanLine(seed, anchor, name = "", area = "") {
  const safeName = name || "the day";
  const safeArea = area || "the pressure";
  return [
    `Name a place for ${anchor} inside ${safeArea}, finish the first useful piece, and stop before extra conditions join.`,
    `Give ${anchor} one visible home inside ${safeArea}, close the ready part, and leave the next concern outside the first step.`,
    `Put a clear label on ${anchor}; let ${safeArea} get the usable piece before the plan grows.`,
    `Set ${anchor} where the day can see it, finish the true step, and keep the next condition waiting.`
  ][mod(stableHash(`${seed}|${anchor}|${safeName}|${safeArea}|named-place-plan-v2`), 4)];
}

function overviewAvoidLine(seed, avoid, name = "", area = "") {
  const safeName = name || "the day";
  const safeArea = area || "the moment";
  return [
    `If ${avoid} appears, slow the reply and let the next action become simpler.`,
    `When ${avoid} tries to lead, reduce the explanation and make the boundary more visible.`,
    `Keep ${avoid} from setting the pace; answer with timing, not performance.`,
    overviewAvoidManagingLine(seed, avoid, safeArea, safeName)
  ][mod(stableHash(`${seed}|${avoid}|${safeName}|${safeArea}|avoid-v2`), 4)];
}

function overviewAvoidManagingLine(seed = 0, avoid = "", area = "", name = "") {
  return pickArea(stableHash(`${seed}|${avoid}|${area}|${name}|avoid-managing-v1`), [
    `If ${avoid} starts managing ${area}, shrink the next move until it can close today.`,
    `If ${avoid} starts steering ${area}, choose a small action that can finish before night.`,
    `When ${avoid} tries to run ${area}, return to one task the day can actually close.`,
    `If ${avoid} takes charge of ${area}, make the reply smaller and finish the practical piece first.`
  ]);
}

function overviewRelationshipLine(seed, caution) {
  return [
    `Let relationships use this caution: ${caution}.`,
    `For closeness, let ${caution} stay practical and quiet.`,
    `Around people, make the clean move early: ${caution}.`,
    `In emotional access, keep this rule visible: ${caution}.`
  ][mod(stableHash(`${seed}|${caution}|relationship`), 4)];
}

function overviewWorkLine(seed, work) {
  return [
    `For work, use this signal: ${work}.`,
    `For work, keep the standard practical: ${work}.`,
    `In visible effort, keep returning to this: ${work}.`,
    `For the practical side of the day, ${work}.`
  ][mod(stableHash(`${seed}|${work}|work`), 4)];
}

function overviewThreeMonthClose(seed, name = "", area = "") {
  const safeName = name || "the day";
  const safeArea = area || "the main pressure";
  return [
    `Over three months, the record should show kept promises around ${safeArea}, not a rush of intensity.`,
    `By the review points, proof for ${safeArea} should be visible in ordinary behavior instead of a passing sense of relief.`,
    `The guidance becomes trustworthy when one correction around ${safeArea} can repeat in an ordinary week.`,
    `Across the membership period, the review for ${safeArea} should show closed details, lighter pressure, and care proven in practice.`
  ][mod(stableHash(`${seed}|${safeName}|${safeArea}|close-v3`) + stableHash(safeName), 4)];
}

function pickThisWeek(parts, seed) {
  const { bodyStart, move, caution, avoid, work, name } = parts;
  const bodyCue = phraseVariant(bodyStart, seed, "week-body");
  const moveCue = phraseVariant(move, seed, "week-move");
  const cautionCue = phraseVariant(caution, seed, "week-caution");
  const avoidCue = phraseVariant(avoid, seed, "week-avoid");
  const workCue = phraseVariant(work, seed, "week-work");
  const templates = [
    `${weekPracticalBlockLine(seed, bodyCue, name)}`,
    weekObservableRuleLine(seed, moveCue, bodyCue, workCue, avoidCue),
    `${weekFirstRepairLine(seed, bodyCue, workCue, cautionCue, name)}`,
    `${weekEvidenceLine(seed, bodyCue, avoidCue, name)}`
  ];
  return templates[mod(seed + 3, templates.length)];
}

function weekObservableRuleLine(seed = 0, moveCue = "", bodyCue = "", workCue = "", avoidCue = "") {
  const bodyText = String(bodyCue || "").toLowerCase();
  const workText = String(workCue || "").toLowerCase();
  if (bodyText.includes("walking") && workText.includes("protect")) {
    return `Give the week one outside-visible rule: ${moveCue}. Use walking before deciding as the pause, protect the work inside one chosen block, and close the open item in the form it needs. ${weekMessageLine(seed, avoidCue)}`;
  }
  if (bodyText.includes("walking") && workText.includes("work visible")) {
    return `Give the week one rule the outside can see: ${moveCue}. Let walking before deciding slow the first choice, then make work visible inside one block that closes in a checkable form. ${weekMessageLine(seed, avoidCue)}`;
  }
  return pickArea(stableHash(`${seed}|${moveCue}|${bodyCue}|${workCue}|observable-rule-v1`), [
    `Give the week one rule that can be observed from the outside: ${moveCue}. Pair it with ${bodyCue}, then ${weekBlockLine(seed, workCue, moveCue)}. ${weekMessageLine(seed, avoidCue)}`,
    `Make one rule visible this week: ${moveCue}. Start with ${bodyCue}, then ${weekBlockLine(seed + 1, workCue, moveCue)}. ${weekFactualReplyBridgeLine(seed + 1, avoidCue)} ${weekMessageLine(seed + 1, avoidCue)}`,
    `Let the outside-visible rule be ${moveCue}. Use ${bodyCue} before choosing the work block, then ${weekBlockLine(seed + 2, workCue, moveCue)}. ${weekMessageLine(seed + 2, avoidCue)}`
  ]);
}

function weekFactualReplyBridgeLine(seed = 0, avoidCue = "") {
  const avoidText = String(avoidCue || "").toLowerCase();
  if (avoidText.includes("mood")) {
    return `Let the reply answer the factual part before the mood story asks for proof.`;
  }
  if (avoidText.includes("explain") || avoidText.includes("explanation")) {
    return `Let the reply handle the factual part before another explanation gets invited.`;
  }
  return pickArea(stableHash(`${seed}|${avoidCue}|factual-reply-bridge-v1`), [
    `Let the next reply answer the factual part first.`,
    `Answer the factual part before the reply grows extra proof.`,
    `Keep the next reply tied to the useful fact first.`
  ]);
}

function pickThisMonth(parts, seed) {
  const { structure, area, anchor, avoid, name } = parts;
  const areaCue = phraseVariant(area, seed, "month-area");
  const anchorCue = phraseVariant(anchor, seed, "month-anchor");
  const avoidCue = phraseVariant(avoid, seed, "month-avoid");
  const templates = [
    `${capitalize(structure)}. ${monthTrackLine(seed, areaCue, name)} ${monthProgressClose(seed, areaCue, name)}`,
    `${monthVisibleReviewLine(seed, anchorCue, areaCue, avoidCue)}`,
    `${monthSundayReviewLine(seed, structure, name)}`,
    `${monthDutyTaxLine(seed, areaCue, avoidCue, name)}`
  ];
  return templates[mod(seed + 7, templates.length)];
}

function weekPracticalBlockLine(seed, bodyStart, name = "") {
  return [
    `${weekProtectedBlockOpening(seed, bodyStart, name)} ${weekPromiseOnPaperLine(seed, bodyStart, name)} ${weekAccessPressureLine(seed, bodyStart)}`,
    `Start the week through ${bodyStart}, then ${weekVisibleWorkLine(seed, bodyStart, name)} ${weekQuickRequestLine(seed, bodyStart, name)}`,
    weekVisiblePieceLine(seed, bodyStart),
    `Let ${bodyStart} settle the body first, then protect a work block with one written promise and one finish line. When someone asks for immediate access, answer with time, complete the visible piece, and let action carry more weight than extra explanation. Save the proof before the next request arrives.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|week-block-v2`), 4)];
}

function weekProtectedBlockOpening(seed, bodyStart, name = "") {
  return [
    `Begin with ${bodyStart}, then protect one practical block before the day gathers too many opinions.`,
    `Start from ${bodyStart} and give one work block a boundary before extra requests gather.`,
    `Let ${bodyStart} come first, then place one practical block where it cannot be interrupted too early.`,
    `Use ${bodyStart} as the opening cue, then keep one work block clear enough to finish.`,
    `Before the day collects more requests, begin with ${bodyStart} and set one block apart for visible work.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|protected-block-opening-v3`), 5)];
}

function weekPromiseOnPaperLine(seed, bodyStart, name = "") {
  return [
    `Put the returning promise on paper, give it a start time, and keep the reply shorter than habit wants.`,
    `Write the returning promise, choose its first time edge, and keep the next reply smaller than habit prefers.`,
    `Give the promise a written place and a start time, then let the reply stay short enough to keep.`,
    `Name the promise on paper, set the first time boundary, and keep the answer from becoming a performance.`,
    `Name one promise on the page, give it a first time edge, and make the reply do one job.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|promise-on-paper-v3`), 5)];
}

function weekVisibleWorkLine(seed, bodyStart, name = "") {
  return [
    `claim one visible work block, write the promise, choose the first time edge, and finish the part that can be seen before another request enters.`,
    `give one work block a visible edge: write the promise, choose the time, and close the useful piece while it is still simple.`,
    weekVisibleWorkCueLine(seed, bodyStart, name),
    `put one block around the work, define the promise, and close the part that already has enough facts before the day negotiates.`,
    `turn one work block into proof: name the promise, choose the first hour, and close the part that can be checked tonight.`,
    `give the practical block three markers: a promise on paper, a chosen time, and one finished piece the body can recognize.`,
    `keep one block small enough to finish: promise named, time protected, useful part closed before the next message pulls attention.`,
    `make the work visible through three plain marks: what is promised, when it begins, and which useful piece closes first.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|visible-work-v3`), 8)];
}

function weekVisibleWorkCueLine(seed = 0, bodyStart = "", name = "") {
  return pickArea(stableHash(`${seed}|${name}|${bodyStart}|visible-work-cue-v1`), [
    `give visible work one named block: promise written, first hour chosen, and the ready piece closed before explanation has a job.`,
    `open the work block through ${bodyStart}; write the promise, choose the hour, and close the piece that is ready.`,
    `make the block answer through evidence: one promise, one time edge, and one ready piece finished before extra words gather.`,
    `put the work inside one visible container, name the promise, choose the time, and finish the ready piece while it is still simple.`,
    `turn the work block into a record: promise named, time chosen, and one usable piece closed before explanation takes over.`
  ]);
}

function weekVisiblePieceLine(seed, bodyStart) {
  return [
    `Let ${bodyStart} become the first gate, then give one practical block a beginning and an end. Put the returning duty where the day can see it, make the reply smaller than fear prefers, and close one visible piece before a new promise enters. Save the result while it still feels ordinary enough to repeat.`,
    `Begin with ${bodyStart}, then make one block visible: returning duty named, reply shortened, and one useful piece closed before another promise gets added. The proof should be something the evening can see, not another explanation waiting to be believed.`,
    weekClosedPartLine(seed, bodyStart),
    `Let ${bodyStart} slow the first answer, then close one piece the day can see before another promise joins the list. The useful sign is a task with edges, a reply with timing, and proof that survives the mood changing.`,
    `Start with ${bodyStart}; the block should end with one visible piece finished, one reply made smaller, and no new promise accepted too early. Record the handled part before the room asks for a larger performance, then let that record choose the next boundary instead of guilt.`
  ][mod(stableHash(`${seed}|${bodyStart}|visible-piece-v2`), 5)];
}

function weekClosedPartLine(seed = 0, bodyStart = "") {
  return pickArea(stableHash(`${seed}|${bodyStart}|closed-part-line-v2`), [
    `Use ${bodyStart} as the entry point, give one work block a real end, and finish the visible piece before another promise enters. Keep the block repeatable, then record what closed while attention is still steady.`,
    `Begin with ${bodyStart}, set one block with an actual ending, and finish the visible piece before the next promise expands. Save the closed detail before attention moves on, then let that proof choose the next boundary.`,
    weekCloseVisiblePieceLine(seed, bodyStart),
    `Use ${bodyStart} to start the work block, define the end, and close the visible piece first. Write the finished detail before attention gets pulled elsewhere, then repeat only the boundary that helped.`
  ]);
}

function weekCloseVisiblePieceLine(seed = 0, bodyStart = "") {
  return pickArea(stableHash(`${seed}|${bodyStart}|close-visible-piece-v2`), [
    `Let ${bodyStart} open the block, then close one visible piece before another promise has room. Save the result while it is still easy to find, and use that proof to choose one small boundary for tomorrow.`,
    weekProtectedCommitmentLine(seed, bodyStart),
    `Start with ${bodyStart}, close the visible piece first, and keep the next promise outside the block. Save the finished detail before the day asks for more, then repeat the boundary that made it possible.`,
    `Let ${bodyStart} set the edge, then finish one visible piece before another promise expands. Record the result, the smaller reply, and the first action that should stay attached to it tomorrow.`
  ]);
}

function weekProtectedCommitmentLine(seed = 0, bodyStart = "") {
  const cue = String(bodyStart || "").toLowerCase();
  if (cue.includes("screen")) {
    return `Use ${bodyStart} as the opening cue for one protected block. Keep the screen away long enough to finish a useful piece, then write the detail that closed and the boundary that protected it. Let the morning action stay simple enough to repeat.`;
  }
  if (cue.includes("message")) {
    return `Begin with ${bodyStart}, then give the block one promise and one ending. Finish the practical piece before the reply grows, save the detail that actually closed, and attach tomorrow's first move to that proof instead of to the pressure.`;
  }
  return pickArea(stableHash(`${seed}|${bodyStart}|protected-commitment-line-v1`), [
    `Use ${bodyStart} as the first cue for one contained block. Finish the useful piece, keep any added promise outside the edge, and write the detail that closed while the boundary still feels repeatable tomorrow.`,
    `Let ${bodyStart} open the protected block. Close the practical part first, hold later requests outside the edge, and save the finished detail with one morning move that can repeat without extra force.`,
    `Begin through ${bodyStart}, give the block one ending, and close the useful part before the next promise gets room. Save the proof, the boundary, and the plain first move for tomorrow.`
  ]);
}

function weekQuickRequestLine(seed, bodyStart, name = "") {
  return [
    `When a request comes too fast, answer with time first and let the finished detail speak next.`,
    `If someone reaches before the work is visible, give a time window and let the completed piece carry the answer.`,
    `When urgency asks for access, name the timing first; the finished detail can do the warmer work after that.`,
    `If the next request rushes the room, slow the answer and let one completed piece carry more proof than extra wording.`,
    `When a message tries to interrupt the block, give it a time and return to the piece that can close.`,
    `If access is demanded too early, offer timing first; let the finished work provide the rest of the answer.`,
    `When the room wants an immediate reply, protect the block and let one closed detail speak calmly afterward.`,
    weekWholeDayUrgencyLine(seed, bodyStart, name)
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|quick-request-v3`), 8)];
}

function weekWholeDayUrgencyLine(seed = 0, bodyStart = "", name = "") {
  return pickArea(stableHash(`${seed}|${name}|${bodyStart}|whole-day-urgency-v1`), [
    `If urgency tries to take the whole day, answer with timing and keep the finished piece visible as proof.`,
    `When the whole day gets pulled into urgency, give one time window and let the closed detail carry the answer.`,
    `If urgency reaches past the block, set a time edge and keep the completed piece as the evidence.`,
    `When pressure asks for the whole day, answer with one window and let the finished work speak afterward.`,
    `If the request expands beyond the block, name the next time and protect the proof already finished.`
  ]);
}

function weekAccessPressureLine(seed, bodyStart) {
  return [
    `If someone reaches for instant access, answer with timing and let the completed piece carry the proof.`,
    `When access is requested too early, offer a time window and let the finished piece answer next.`,
    `If closeness asks for the whole block, give timing first and return to the part that can close.`,
    `When a request wants immediate access, protect the block; the completed detail can speak afterward.`,
    `If someone asks before the work is visible, name the next time and let action carry the warmth.`
  ][mod(stableHash(`${seed}|${bodyStart}|access-pressure-v2`), 5)];
}

function phraseVariant(text, seed = 0, role = "") {
  const value = lowerFirst(safePhrase(text || ""));
  const salt = stableHash(`${seed}|${role}|${value}|variant`);
  const pick = (variants) => pickArea(salt, variants);
  const wantsArea = role.includes("area");
  const wantsRule = role.includes("rule");
  const wantsAvoidNoun = role.includes("avoid") || role.includes("watch");
  const wantsChip = role.includes("focus") || role.includes("watch");
  const wantsPracticeNoun = role.includes("practice");
  const wantsWorkNoun = role.includes("work");
  const wantsBodyCue = role.includes("body");

  if (value.includes("give the day a visible finish line")) {
    if (wantsRule) return pick(["give the day one visible finish line", "set one finish line the day can see", "close one practical line of completion"]);
    return wantsChip
      ? pick(["Visible finish line today", "One visible finish line", "Finish line before noise"])
      : pick(["one visible finish line", "a finish line the day can see", "one practical line of completion"]);
  }
  if (value.includes("protecting the first quiet hour")) {
    if (wantsBodyCue) return pick(["the first quiet hour", "a protected first hour", "quiet before replies begin"]);
    return wantsChip
      ? pick(["Protect the quiet hour", "Quiet hour before replies", "First hour stays protected"])
      : pick(["protect the first quiet hour", "let the first quiet hour stay protected", "keep the first hour quiet before answering"]);
  }
  if (value.includes("solve the factual part")) {
    return wantsWorkNoun
      ? pick(["the factual piece closing first", "a visible close for the facts", "the facts receiving the first finish"])
      : pick(["close the factual piece first", "let the facts receive the first finish", "give the factual piece a visible close"]);
  }
  if (value.includes("work a boundary")) {
    return wantsWorkNoun
      ? pick(["a clear edge around the work", "visible effort inside one container", "the work kept inside one defined edge"])
      : pick(["put a clear edge around the work", "give visible effort a smaller container", "keep the work inside one defined edge"]);
  }
  if (value.includes("make care visible")) {
    if (wantsPracticeNoun) return pick(["care shown through one firm limit", "one visible edge around care", "care held inside one repeatable shape"]);
    return wantsChip
      ? pick(["Care through clear limits", "Visible care, clear limit", "Care with one edge"])
      : pick(["show care through one firm shape", "give care a visible edge", "let care prove itself through one limit"]);
  }
  if (value.includes("private worry")) {
    if (wantsPracticeNoun) return pick(["the worry placed in a dated slot", "one appointment for the concern", "the scheduled concern"]);
    return wantsChip
      ? pick(["Scheduled worry, smaller story", "Worry gets one slot", "Private worry, dated slot"])
      : pick(["put the worry into a dated slot", "give the worry one appointment", "move the concern into one scheduled place"]);
  }
  if (value.includes("sleep outrank")) {
    if (role.includes("result")) return pick(["the protected rest cue", "the smaller second check", "the closed review"]);
    if (wantsBodyCue) return pick(["sleep before the extra review", "rest before another check", "the body closing the review first"]);
    return pick(["let rest lead before another review", "protect sleep before the extra check", "let the body close the review first"]);
  }
  if (value.includes("sleep before the extra review")) {
    if (role.includes("result")) return pick(["the protected rest cue", "the smaller second check", "the closed review"]);
    return pick(["rest before another check", "sleep before one more review", "the body closing the extra review"]);
  }
  if (value.includes("stepping away before the screen") || value.includes("screen pause") || value.includes("screen down")) {
    if (role.includes("result")) return pick(["the screen pause", "rested eyes", "the shorter reply"]);
    if (wantsBodyCue) return pick(["a short screen pause", "eyes away from the screen", "ten screen-free minutes"]);
    return pick(["take a short screen pause", "step away from the screen first", "let the eyes rest before choosing words"]);
  }
  if (value.includes("pausing with water") || value.includes("water before") || value.includes("drinking water")) {
    if (role.includes("result")) return pick(["the water pause", "the slower answer", "the body check"]);
    if (wantsBodyCue) return pick(["water before deciding", "one water pause", "a slower body check"]);
    return pick(["take water before deciding", "let water slow the first answer", "use one water pause before choosing"]);
  }
  if (value.includes("placing movement") || value.includes("breath check") || value.includes("movement before")) {
    if (role.includes("result")) return pick(["the movement cue", "the first breath", "the body pause"]);
    if (wantsBodyCue) return pick(["movement before the verdict", "one breath before judgment", "a body cue before reacting"]);
    return pick(["put movement before the verdict", "let one breath check the reaction", "give the body a cue before judging"]);
  }
  if (value.includes("checking hunger") || value.includes("meal come before") || value.includes("food before")) {
    if (role.includes("result")) return pick(["the meal cue", "the steadier tone", "the body check"]);
    if (wantsBodyCue) return pick(["a meal before the tone", "food before the hard reply", "hunger checked before choosing"]);
    return pick(["eat before choosing the tone", "let food come before the hard reply", "check hunger before interpreting the mood"]);
  }
  if (value.includes("messy detail")) {
    if (wantsChip) return pick(["Messy detail taking over", "One detail, too much", "Detail becoming the story"]);
    return wantsAvoidNoun
      ? pick(["the messy-detail story", "one detail becoming the whole story", "the pressure to make one detail explain everything"])
      : pick(["stop one messy detail from explaining everything", "keep the messy detail from becoming the whole story", "give the messy detail a smaller role"]);
  }
  if (value.includes("reopening the question through every detail")) {
    if (wantsChip) return pick(["Old question reopening", "Detail-check loop", "Question asking again"]);
    return wantsAvoidNoun
      ? pick(["the old proof-check", "the repeated question", "the detail-check loop", "the search for another sign"])
      : pick(["stop the old question from reopening", "let the detail-check loop lose its vote", "answer the repeated question with one fact"]);
  }
  if (value.includes("checking every small change") || value.includes("turning little movements") || value.includes("searching small details") || value.includes("using tiny shifts")) {
    if (wantsChip) return pick(["Small signs getting loud", "Tiny shifts, big proof", "Detail-check loop", "Proof-check loop", "Small changes, too much proof", "One sign getting oversized", "Signs becoming verdicts", "Less checking, more evidence"]);
    return wantsAvoidNoun
      ? pick(["small signs getting loud", "the proof-check loop", "tiny shifts becoming evidence", "the search for another sign", "one sign getting oversized", "minor changes asking for a verdict"])
      : pick(["keep tiny shifts from becoming proof", "stop checking every small sign", "answer the proof-check loop with one fact"]);
  }
  if (value.includes("using explanation as a substitute") || value.includes("explanation delay")) {
    if (wantsChip) return pick(["Explanation delaying choice", "Choice before explanation", "Decision, not more explanation"]);
    return wantsAvoidNoun
      ? pick(["explanation delaying the choice", "the extra explanation loop", "the decision hiding inside explanation"])
      : pick(["choose before adding another explanation", "let the decision arrive before the speech", "keep explanation from delaying the choice"]);
  }
  if (value.includes("letting urgency borrow your care") || value.includes("treating discomfort as a command") || value.includes("rescue")) {
    if (wantsChip) return pick(["Urgency borrowing care", "Care before rescue", "Rescue pressure getting loud"]);
    return wantsAvoidNoun
      ? pick(["urgency borrowing care", "rescue pressure getting loud", "another person's urgency"])
      : pick(["keep urgency from borrowing care", "let care stay warm without rescue", "answer pressure after the real request is clear"]);
  }
  if (value.includes("reopening a settled conversation")) {
    if (wantsChip) return reopenedConversationChip(seed);
    return wantsAvoidNoun
      ? pick(["the reopened conversation", "the old conversation asking to return", "the settled talk reopening"])
      : pick(["keep the settled conversation closed", "stop the old conversation from reopening", "leave the answered conversation alone"]);
  }
  if (value.includes("hear the feeling") || (value.includes("feeling") && value.includes("adopting"))) {
    return pick(["hear the feeling without carrying the consequence", "listen without taking over the outcome", "let the feeling be heard without becoming your task"]);
  }
  if (value.includes("answering before your body settles")) {
    if (wantsChip) return pick(["Answering before body settles", "Rushed answer, tense body", "Body unsettled, answer rushing"]);
    return wantsAvoidNoun
      ? pick(["rushed answering", "the answer that arrives before the body settles", "the unsettled-body reply"])
      : pick(["wait until the body has settled", "let the body settle before answering", "slow the answer until the body catches up"]);
  }
  if (value.includes("loose detail")) {
    if (wantsChip) return pick(["Loose detail getting large", "One detail naming everything", "Small detail, large verdict"]);
    return wantsAvoidNoun
      ? pick(["the loose-detail verdict", "one loose detail getting too large", "the pressure to make one detail name everything"])
      : pick(["keep one loose detail from becoming too large", "give the loose detail a smaller job", "stop the loose detail from naming the whole day"]);
  }
  if (value.includes("delay") || value.includes("waiting")) {
    return delayFactsPhrase(seed, wantsChip);
  }
  if (value.includes("wait for behavior")) {
    return wantsChip
      ? pick(["Behavior before soft words", "Proof before kind words", "Behavior carries the proof"])
      : pick(["let behavior provide the proof", "wait for behavior before soft words lead", "let proof arrive through behavior"]);
  }
  if (value.includes("answer with timing instead")) {
    if (wantsPracticeNoun) return pick(["a timed answer before defense", "timing used before the long defense", "the answer carried by timing first"]);
    return wantsChip
      ? pick(["Timing before long defense", "Timed answer, shorter defense", "Answer through timing first"])
      : pick(["answer through timing first", "let timing carry the answer", "use timing before any longer defense"]);
  }
  if (value.includes("pause before making tiredness") || (value.includes("tiredness") && value.includes("intuition"))) {
    if (role.includes("result")) return pick(["the tiredness check", "the body check", "the slower answer"]);
    if (wantsChip) return pick(["Tiredness checked first", "Body before intuition", "Pause before tiredness speaks"]);
    if (wantsBodyCue) return pick(["checking tiredness before interpretation", "a body check before the answer", "pausing before tiredness speaks"]);
    return pick(["check tiredness before treating it as guidance", "pause before tiredness gets a vote", "let the body check the story first"]);
  }
  if (value.includes("let care arrive with a shape") || value.includes("care arrive with a shape") || value.includes("care visible through one shaped limit")) {
    if (wantsPracticeNoun) return pick(["care held inside one clear edge", "one shaped limit around care", "care made visible through one boundary"]);
    return wantsChip
      ? pick(["Care with one edge", "Shaped care, clear limit", "Care arrives with limits"])
      : pick(["give care one clear edge", "let care arrive with a limit", "make care visible through one boundary"]);
  }
  if (value.includes("finish the useful part")) {
    if (wantsPracticeNoun) return pick(["the useful part finished first", "one finished useful piece", "the practical piece closed before explanation"]);
    return wantsChip
      ? pick(["Finish useful part first", "Useful part before explaining", "Close before explaining"])
      : pick(["finish the useful part before explaining", "close one useful piece before the speech", "let the practical piece close first"]);
  }
  if (value.includes("make the plan visible") || value.includes("plan visible without")) {
    if (wantsPracticeNoun) return pick(["the plan made visible early", "one visible plan before defense", "a plan plain enough to follow"]);
    return wantsChip
      ? pick(["Plan visible before defense", "Visible plan, fewer defenses", "Plain plan first"])
      : pick(["make the plan visible before defending it", "put the plan where the day can see it", "let the plan work with fewer defenses"]);
  }
  if (value.includes("uncertain plan") || value.includes("vague plan")) {
    if (wantsWorkNoun) return pick(["a scheduled block for the uncertain plan", "one dated action for the loose plan", "a practical container for the plan"]);
    return wantsChip
      ? pick(["Plan gets a date", "Loose plan, real appointment", "Uncertain plan scheduled"])
      : pick(["give the uncertain plan one dated action", "put the loose plan into one scheduled block", "make the plan practical before defending it"]);
  }
  if (value.includes("leaving space between messages")) {
    if (role.includes("result")) return pick(["the pause before the reply", "the extra space before answering", "the message gap"]);
    if (wantsBodyCue) return pick(["a pause between messages", "space before the next message", "the gap before answering"]);
    return pick(["leave space between messages", "give the next message more room", "let the reply wait for a cleaner moment"]);
  }
  if (value.includes("pause between messages") || value.includes("space before the next message")) {
    if (role.includes("result")) return pick(["the pause before the reply", "the extra space before answering", "the message gap"]);
    if (wantsBodyCue) return pick(["a pause between messages", "space before the next message", "the gap before answering"]);
    return pick(["leave space between messages", "give the next message more room", "let the reply wait for a cleaner moment"]);
  }
  if (value.includes("giving the eyes a break")) {
    if (role.includes("result")) return pick(["the screen break", "rested eyes before wording", "the eye break"]);
    if (wantsBodyCue) return pick(["an eye break before words", "eyes rested before the reply", "a short break from the screen"]);
    return pick(["rest the eyes before choosing words", "let the eyes pause before the reply", "step back from the screen first"]);
  }
  if (value.includes("taking water")) {
    if (role.includes("result")) return pick(["the water break", "a slower first answer", "the body cue"]);
    if (wantsBodyCue) return pick(["water before interpretation", "a glass of water first", "one water break before answering"]);
    return pick(["take water before interpretation", "let water slow the first answer", "drink before treating the mood as guidance"]);
  }
  if (value.includes("first yes that would quietly cost")) {
    return pick(["the costly yes", "the first expensive yes", "the yes that needs a smaller shape"]);
  }
  if (value.includes("task asking for a smaller edge")) {
    return pick(["the task needing a smaller edge", "the open duty with a cleaner edge", "the task that needs less emotional weight"]);
  }
  if (value.includes("unfinished work and personal authority")) {
    return pick(["open tasks and self-trust", "unfinished duties and authority", "work left open and self-trust"]);
  }
  if (value.includes("thought-conversation asking for a finish")) {
    return pick(["the inner dialogue needing closure", "the recurring thought-conversation", "the private dialogue loop"]);
  }
  if (value.includes("make the draft imperfect")) {
    return wantsWorkNoun
      ? pick(["an imperfect draft made visible", "the rough draft becoming real", "one visible draft before polish"])
      : pick(["make the rough draft visible", "let the draft become real before polish", "put the imperfect draft where it can be seen"]);
  }
  if (value.includes("finish one useful draft") || value.includes("finish useful draft")) {
    return wantsWorkNoun
      ? pick(["a visible boundary for one useful draft", "one draft finished before polish", "the useful draft closed first", "the first draft made usable"])
      : pick(["finish one useful draft before improving it", "close the useful draft before polishing it", "make one draft usable before improving it"]);
  }
  if (value.includes("shoulder") || value.includes("jaw") || value.includes("body voting")) {
    if (wantsBodyCue) return pick(["a shoulder check before answering", "jaw and shoulders softening first", "the body vote checked early"]);
    return wantsChip
      ? pick(["Body vote checked first", "Shoulders before reply", "Jaw softens before answer"])
      : pick(["check the shoulders before answering", "let the jaw soften before choosing words", "use the body vote as a pause, not a verdict"]);
  }
  if (value.includes("reply") || value.includes("message")) {
    return pick([
      "give the reply one clean job",
      "let timing choose the reply's size",
      "make the next message carry one job",
      "keep the next reply shorter and easier to keep",
      "send only the sentence the moment can hold"
    ]);
  }
  if (value.includes("access") || value.includes("available") || value.includes("reachable")) {
    if (wantsArea) return pick(["access timing", "belonging and access", "availability boundaries", "friendship rhythm"]);
    if (wantsAvoidNoun) return pick([
      "constant access becoming the test",
      "availability running ahead of the limit",
      "the reachability pressure",
      "access asking for proof too early",
      "availability turning into emotional proof",
      "the open-door habit asking for proof",
      "timing getting replaced by reachability"
    ]);
    return pick(["give access a cleaner time", "make availability smaller and more honest", "let access follow timing"]);
  }

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    return compressedPhraseVariant(value, salt, wantsChip);
  }
  return value;
}

function compressedPhraseVariant(value, seed, wantsChip = false) {
  const core = meaningfulTokens(value).slice(0, 4);
  const shortCore = core.slice(0, 3).join(" ");
  const nounCore = readableCompressedCore(core, seed);
  if (!shortCore) {
    return wantsChip
      ? pickArea(seed, ["Pattern made smaller", "Pressure given shape", "Cleaner visible rule"])
      : pickArea(seed, ["the pressure made smaller", "one visible rule for the pressure", "the pattern named before it spreads"]);
  }
  if (wantsChip) {
    const chip = nounCore || core.join(" ");
    return wordsForCue(chip);
  }
  return pickArea(seed, [
    practicalVisibleBoundaryLine(seed, nounCore),
    `reduce ${nounCore} to one next action`,
    concreteBeforeSpreadLine(seed, nounCore),
    practicalPressureNamingLine(seed, nounCore),
    `give ${nounCore} a practical container`,
    `turn ${nounCore} into one repeatable step`
  ]);
}

function practicalVisibleBoundaryLine(seed = 0, nounCore = "") {
  const nounText = String(nounCore || "").toLowerCase();
  if (nounText.includes("work") && nounText.includes("boundary")) {
    return pickArea(stableHash(`${seed}|${nounCore}|work-boundary-visible-v1`), [
      "protected work gets one usable edge",
      "make the work edge visible once",
      "give the guarded work one clear line"
    ]);
  }
  if (nounText.includes("boundary")) {
    return pickArea(stableHash(`${seed}|${nounCore}|boundary-visible-v1`), [
      `give ${nounCore} one usable edge`,
      `make ${nounCore} visible through one line`,
      `let ${nounCore} show one practical edge`
    ]);
  }
  return `${nounCore} gets one visible boundary`;
}

function practicalPressureNamingLine(seed = 0, nounCore = "") {
  const noun = safePhrase(nounCore || "the task");
  if (noun.toLowerCase().includes("complete task name")) {
    return pickArea(stableHash(`${seed}|${noun}|complete-task-pressure-v2`), [
      `name the task pressure before the deadline grows`,
      `catch the complete-task pressure while it is still factual`,
      `put the named task pressure into one early line`,
      `mark the completion pressure before it becomes personal`
    ]);
  }
  return pickArea(stableHash(`${seed}|${noun}|pressure-naming-v2`), [
    `name the pressure around ${noun} early`,
    `catch ${noun}'s pressure before it spreads`,
    `put the pressure on ${noun} into one line`,
    `mark ${noun}'s pressure while it is still small`
  ]);
}

function delayFactsPhrase(seed = 0, wantsChip = false) {
  if (wantsChip) {
    return pickArea(seed, [
      "Wait stays factual",
      "Delay kept practical",
      "Facts before waiting story",
      "Smaller story for delay"
    ]);
  }
  return pickArea(stableHash(`${seed}|delay-facts-v2`), [
    "keep the waiting point factual",
    "let the delay keep its real size",
    "put facts before the waiting story",
    "answer slow timing with one practical fact",
    "keep the pause factual before the story grows",
    "make the waiting point answer through facts",
    "give slow timing one practical fact"
  ]);
}

function concreteBeforeSpreadLine(seed = 0, nounCore = "the pressure") {
  return pickArea(stableHash(`${seed}|${nounCore}|concrete-before-spread-v2`), [
    `give ${nounCore} a concrete shape before it spreads`,
    `make ${nounCore} visible before it grows`,
    `put ${nounCore} into one practical container early`,
    `name ${nounCore} before the pressure widens`,
    `turn ${nounCore} into a usable next action`
  ]);
}

function reopenedConversationChip(seed = 0) {
  return pickArea(stableHash(`${seed}|reopened-conversation-chip-v2`), [
    "Old conversation asking again",
    "Answered talk trying to return",
    "Settled exchange getting loud",
    "Closed reply seeking attention",
    "Old thread wanting proof"
  ]);
}

function readableCompressedCore(core = [], seed = 0) {
  const text = core.join(" ");
  if (!text) return "";
  if (text.includes("protect") && text.includes("useful") && text.includes("work")) return pickArea(seed, [
    "the useful-work boundary",
    "protected work",
    "work boundary",
    "the guarded work block"
  ]);
  if (text.includes("exhaustion")) return pickArea(seed, [
    "the tiredness story",
    "the exhaustion argument",
    "the body doubt",
    "the fatigue verdict"
  ]);
  if (text.includes("futureyou") || text.includes("future")) return pickArea(seed, [
    "the future-self repair",
    "tomorrow's repair",
    "the next version of care",
    "the future-you promise"
  ]);
  if (text.includes("visible mess") || text.includes("mess")) return pickArea(seed, [
    "the visible-mess story",
    "one messy detail",
    "the room-detail pressure",
    "the small-disorder story"
  ]);
  if (text.includes("letting") && text.includes("access")) return pickArea(seed, [
    "the access question",
    "the availability pattern",
    "the reachability pressure",
    "the timing boundary"
  ]);
  if (text.includes("separate") && text.includes("tiredness")) return pickArea(seed, [
    "the tiredness check",
    "the body-fatigue boundary",
    "the tiredness sorting line",
    "the fatigue-before-guidance cue",
    "the body truth checkpoint"
  ]);
  if (text.includes("promise")) return pickArea(seed, [
    "the promise",
    "the smaller commitment",
    "the next kept promise",
    "the follow-through line"
  ]);
  const compact = core
    .slice(0, 3)
    .filter(Boolean)
    .join(" ");
  return compact || "the pressure";
}

function meaningfulTokens(text) {
  const stop = new Set(["a", "an", "and", "are", "as", "at", "be", "been", "before", "by", "can", "do", "for", "from", "has", "have", "in", "is", "it", "its", "not", "of", "on", "or", "that", "the", "then", "this", "to", "when", "where", "with", "without", "you", "your"]);
  return String(text || "")
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9']/g, ""))
    .filter((word) => word.length >= 4 && !stop.has(word));
}

function wordsForCue(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const cueWords = words.slice(0, 4);
  while (cueWords.length < 4) cueWords.push("pattern");
  return capitalize(cueWords.join(" "));
}

function weekEvidenceLine(seed, bodyStart, avoid, name = "") {
  return [
    weekSevenDayTestLine(seed, bodyStart, avoid),
    weekProofCycleLine(seed, bodyStart, avoid, name),
    `${weekDemandingExchangeLine(seed, bodyStart, avoid, name)}`,
    weekVisibleExperimentLine(seed, bodyStart, avoid, name)
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${avoid}|week-evidence-v3`) + stableHash(name), 4)];
}

function weekProofCycleLine(seed, bodyStart, avoid, name = "") {
  return [
    `Use the week as a proof cycle. Start difficult replies with ${bodyStart}, define the finish line before the task begins, and keep ${avoid} outside the work block. Repetition matters first; save one example the next morning can trust.`,
    `Make the week prove one small repair. Begin tense replies with ${bodyStart}, write the task's finish line, and keep ${avoid} away from the measured work. By morning, one saved result should matter more than the old pressure.`,
    `Let this week collect evidence instead of certainty. Use ${bodyStart} before the hard reply, name what done means, and keep ${avoid} out of the practical block. The useful sign is one repeated result the next day can verify.`,
    `Treat the week like a visible test. Put ${bodyStart} before the demanding answer, set one finish line, and keep ${avoid} away from the proof. End with a written example, not a longer explanation.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${avoid}|proof-cycle-v2`), 4)];
}

function weekVisibleExperimentLine(seed, bodyStart, avoid, name = "") {
  return [
    `Use one experiment the day can see. Begin the difficult reply with ${bodyStart}, define done before the task starts, and keep ${avoid} away from the measured work. ${weekCompareClose(seed, bodyStart)}`,
    `Give the week one visible experiment: ${bodyStart} before the first tense reply, one sentence for what done means, and ${avoid} outside the work block. ${weekCompareClose(seed + 1, bodyStart)}`,
    `Let the week test one visible sequence. Put ${bodyStart} before the demanding reply, write the finish line for the task, and keep ${avoid} away from the proof. ${weekCompareClose(seed + 2, bodyStart)}`,
    `Make the experiment ordinary enough to repeat. Use ${bodyStart} before the first hard answer, define the task's finish, and keep ${avoid} outside the measured block. ${weekCompareClose(seed + 3, bodyStart)}`,
    `Use the week as a visible trial: body cue first, finish line second, with ${avoid} kept outside the work that needs proof. Start with ${bodyStart}, then save one dated result the next morning can trust and compare.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${avoid}|visible-experiment-v2`), 5)];
}

function weekCompareClose(seed, bodyStart) {
  return [
    `A dated rhythm gives care a cleaner shape because the week can compare proof instead of mood.`,
    `By the seventh day, compare what closed, what softened, and what no longer needed extra explanation.`,
    `The week should end with evidence that can be checked, not a mood that needs another argument.`,
    `Let the review compare visible proof: the shorter reply, the finished task, and the quieter body.`
  ][mod(stableHash(`${seed}|${bodyStart}|compare-close`), 4)];
}

function weekSevenDayTestLine(seed, bodyStart, avoid) {
  const result = phraseVariant(bodyStart, seed + 5, "week-body-result");
  return [
    `Let the next seven days test ${bodyStart}. Use the cue before ${avoid} crowds the exchange, give the task a finish line, and keep the measured work simple. Save one dated example so ${result} has proof tomorrow. The test works when one reply changes before the mood expands.`,
    `Use seven days to test ${bodyStart}. Pause there before the tense conversation, mark the smallest acceptable finish for the work, and keep ${avoid} outside the block. Let ${result} show what changed in one saved note.`,
    `Let ${bodyStart} lead one week of practice. The conversation gets the cue first, the task gets a plain finish line, and ${avoid} stays out of the measured work. Save proof that ${result} helped before the day turns it into mood.`,
    `Give the week a visible test through ${bodyStart}. Put the cue before the hard answer, put the finish line before the work, and keep ${avoid} outside the proof. Save the result before the next request arrives.`,
    `Let the week compare one body cue with one finished duty. Start with ${bodyStart}, define the task's smallest finish, and keep ${avoid} away from the work until ${result} leaves a dated trace.`,
    `For seven days, start with ${bodyStart}. Pause the reply, give ${result} one finish line, and keep ${avoid} outside the block until ${result} has something visible to show. ${weekMorningProofLine(seed, bodyStart, result)}`
  ][mod(stableHash(`${seed}|${bodyStart}|${avoid}|seven-day-test-v2`) + stableHash(result), 6)];
}

function weekMorningProofLine(seed, bodyStart, result) {
  return [
    `Close the night with that proof in writing; morning should inherit behavior instead of mood.`,
    `Save the proof before sleep so ${result} can meet morning as behavior, not another feeling.`,
    `End with one written proof; the next morning should compare ${bodyStart} by action, not mood.`,
    `Let the night record the proof, then let morning begin from the visible behavior.`
  ][mod(stableHash(`${seed}|${bodyStart}|${result}|morning-proof-v2`), 4)];
}

function weekDemandingExchangeLine(seed, bodyStart, avoid, name = "") {
  return [
    `Let ${bodyStart} open the exchange. Name the finish line before ${avoid} enters, keep the work block plain, and save one written proof that tomorrow can use without reopening the debate. Close by noting where ${bodyStart} changed the tone, timing, or explanation load.`,
    `Start the exchange through ${bodyStart}. Put the finish line where the task can see it, keep ${avoid} outside the work block, and leave one written result for tomorrow morning. The useful win is not a bigger explanation; it is one finished piece that stays honest when the day checks it tomorrow.`,
    `Start with ${bodyStart}. Keep ${avoid} outside one plain work block, give the task a finish line, and save a result tomorrow can reuse. Name the changed tone, the closed detail, and the place where ${avoid} lost volume; then leave the explanation small.`,
    `Let ${bodyStart} gather facts before the exchange gets crowded. The task needs one finish line, ${avoid} needs to stay outside the block, and tomorrow needs one proof it can reuse. Record the proof before the mood starts editing it into a larger story.`,
    `Place ${bodyStart} before the exchange, then write the finish line in one sentence. Keep ${avoid} away from the work block and leave the day with one proof, not another mood. The week should end with a result that is visible enough to repeat without extra force.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${avoid}|demanding-exchange-v3`), 5)];
}

function weekFirstRepairLine(seed, bodyStart, work, caution, name = "") {
  return [
    `Start with ${bodyStart}. Pick one task with facts, ${weekWorkConcreteLine(seed, work)}, and ${weekRelationshipPracticeLine(seed, caution, name)} ${weekSimpleProofLine(seed, work, caution, name)}`,
    weekFactTaskRepairLine(seed, bodyStart, work, caution, name),
    `Start with the practical repair: ${bodyStart}, one task with enough facts, and a work signal of ${work}. With people, make ${caution} the concrete practice. The week improves when ${bodyStart} helps one reply repeat while ${caution} keeps the limit ordinary.`,
    `${weekGroundedActionLine(seed, bodyStart, work, name)} ${weekPeoplePracticeLine(seed, caution, name)} ${weekUsefulProofLine(seed, work, caution, name)}`,
    weekFirstRepairSpecificLine(seed, bodyStart, work, caution, name),
    weekRepairTaskSignalLine(seed, bodyStart, work, caution, name)
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${work}|${caution}|first-repair-v2`), 6)];
}

function weekRepairTaskSignalLine(seed, bodyStart, work, caution, name = "") {
  const bodyText = String(bodyStart || "").toLowerCase();
  if (bodyText.includes("hunger") || bodyText.includes("food")) {
    return `${weekRepairOpeningLine(seed, bodyStart)} Put the fact-ready task after the food cue, let ${work} choose the work signal, and keep ${caution} small enough for one reply. ${weekNightProofLine(seed, work)}`;
  }
  if (bodyText.includes("sleep")) {
    return `${weekRepairOpeningLine(seed, bodyStart)} Put one fact-ready task inside the sleep-protected edge, use ${work} as the work signal, and let ${caution} guide the reply. ${weekNightProofLine(seed, work)}`;
  }
  return pickArea(stableHash(`${seed}|${name}|${bodyStart}|${work}|${caution}|repair-task-signal-v1`), [
    `${weekRepairOpeningLine(seed, bodyStart)} Put one fact-ready task in front, let ${work} become the work signal, and keep ${caution} small enough for one reply. ${weekNightProofLine(seed, work)}`,
    `${weekRepairOpeningLine(seed, bodyStart)} Choose the fact-ready task, let the work signal be ${work}, and make the relationship practice visible through ${caution}. ${weekNightProofLine(seed, work)}`,
    `${weekRepairOpeningLine(seed, bodyStart)} Give the task one factual edge, use ${work} for the work signal, and keep the people-facing rule at ${caution}. ${weekNightProofLine(seed, work)}`
  ]);
}

function weekFirstRepairSpecificLine(seed, bodyStart, work, caution, name = "") {
  const workText = String(work || "").toLowerCase();
  if (workText.includes("draft")) {
    return `Let ${bodyStart} set the first edge. Put the imperfect draft where it can be seen, use ${work} as the completion cue, and keep the people-facing repair at ${caution}. End with one reply, one limit, and one draft piece closed for tomorrow's record.`;
  }
  if (workText.includes("loose plan")) {
    return `Let ${bodyStart} set the first edge. Turn the loose plan into ${work}, keep the relationship repair as small as ${caution}, and close the week with one dated result, one reply, and one limit that can be checked tomorrow.`;
  }
  return pickArea(stableHash(`${seed}|${name}|${bodyStart}|${work}|${caution}|first-repair-specific-v1`), [
    `Let ${bodyStart} set the first edge. Put ${work} in charge of the fact-ready task, keep ${caution} visible in one reply, and close the week with proof tomorrow can inspect.`,
    `Begin through ${bodyStart}. Let the work answer through ${work}, let the people-facing repair stay at ${caution}, and save one completed duty before the next morning starts.`,
    `${weekBodyLeadLine(seed, bodyStart)} Let ${work} define the practical task. Keep ${caution} as the relational rule and leave one closed duty for tomorrow's record.`
  ]);
}

function weekBodyLeadLine(seed = 0, bodyStart = "") {
  const cue = String(bodyStart || "").trim();
  if (/ing\b/i.test(cue.split(/\s+/)[0] || "")) {
    return `Let the body cue lead: ${cue}.`;
  }
  return `Use ${cue} first.`;
}

function weekFactTaskRepairLine(seed = 0, bodyStart = "", work = "", caution = "", name = "") {
  const bodyText = String(bodyStart || "").toLowerCase();
  if (bodyText.includes("sleep")) {
    const first = String(name || "").charAt(0).toLowerCase();
    if (first && first < "m") {
      return `${weekBodyLeadLine(seed, bodyStart)} Choose one task with facts and give it a finish the night can protect. Let ${caution} guide the reply, record what closed before sleep, and leave tomorrow with one smaller answer instead of another proof loop.`;
    }
    return `${weekBodyLeadLine(seed, bodyStart)} Put the factual task inside the sleep boundary, then use ${work} to mark what is done. Keep ${caution} in the reply, save the closed duty before bed, and let tomorrow begin from that calmer record.`;
  }
  const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return pickArea(stableHash(`${seed}|${name}|${bodyStart}|${work}|${caution}|fact-task-repair-v1`) + nameOffset, [
    `${weekBodyLeadLine(seed, bodyStart)} Choose one factual task. Use ${work}, keep ${caution} in the reply, and save the closed duty beside ${bodyStart}. Let ${caution} show which answer got smaller and what tomorrow repeats.`,
    `${weekBodyLeadLine(seed, bodyStart)} Put one task with facts in front. Let ${work} mark the finish while ${caution} shapes the smaller answer. Record how ${bodyStart} protected the limit before the next request arrives.`,
    `${weekBodyLeadLine(seed, bodyStart)} Give the factual task one finish and let ${caution} keep the reply clean. Afterward, write what closed; tomorrow's smaller reply should start from ${caution}, not pressure.`,
    `${weekBodyLeadLine(seed, bodyStart)} Choose the task with enough facts; ${work} sets the edge, and ${caution} keeps tomorrow's answer smaller. Close by naming the duty, reply, and body cue that held.`
  ]);
}

function weekRelationshipPracticeLine(seed, caution, name = "") {
  return [
    `keep the relationship practice concrete: ${caution}.`,
    `let the people-facing rule stay small: ${caution}.`,
    `make the relational edge visible through ${caution}.`,
    `keep closeness practical by using ${caution}.`,
    `give the next exchange one clean relational rule: ${caution}.`
  ][mod(stableHash(`${seed}|${name}|${caution}|relationship-practice-line-v2`), 5)];
}

function weekSimpleProofLine(seed, work, caution, name = "") {
  return [
    `End with one reply sent, one limit kept, and one duty closed without turning the day into an explanation.`,
    `Let the proof stay small: one completed duty, one clean reply, and one limit that still feels usable tomorrow.`,
    `Close the day with evidence the body can find: a finished part, a smaller answer, and a limit kept without drama.`,
    `The result should be plain enough to repeat tomorrow: one duty closed and one answer kept inside its proper size.`,
    `Save the evidence before sleep: what finished, which limit held, and where the next reply can stay shorter.`
  ][mod(stableHash(`${seed}|${name}|${work}|${caution}|simple-proof-v2`), 5)];
}

function weekGroundedActionLine(seed, bodyStart, work, name = "") {
  return [
    `Ground the first repair in action: ${bodyStart}, one fact-ready task, and ${work} as the visible standard.`,
    `Make the first repair practical. Start with ${bodyStart}, choose the task with enough facts, and let ${work} define what progress looks like.`,
    `Keep the opening move concrete: ${bodyStart}, one task with evidence, and ${work} before the next explanation grows.`,
    `Begin with action instead of analysis. Use ${bodyStart}, pick the fact-ready task, and let ${work} leave the first visible result.`,
    `Let the repair begin where the day can see it: ${bodyStart}, a task with facts, and ${work} before the next request expands.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${work}|grounded-action-v2`), 5)];
}

function weekPeoplePracticeLine(seed, caution, name = "") {
  return [
    `With people, keep ${caution} small enough to repeat.`,
    `Around people, practice ${caution} before the answer grows.`,
    `Let closeness use ${caution} without turning it into a speech.`,
    `For the relational part, make ${caution} visible in one reply.`
  ][mod(stableHash(`${seed}|${name}|${caution}|people-practice-v2`), 4)];
}

function weekUsefulProofLine(seed, work, caution, name = "") {
  return [
    `The useful proof is a finished duty, a clean limit, and one reply that stays easier to keep.`,
    `Let one completed part and one quiet boundary carry the evidence without a performance.`,
    `Let the evidence stay plain: one duty closed, one answer smaller, and one limit still warm.`,
    `The week changes when ${work} leaves a visible result and ${caution} keeps the next exchange lighter.`
  ][mod(stableHash(`${seed}|${name}|${work}|${caution}|useful-proof-v2`), 4)];
}

function weekWorkConcreteLine(seed, work) {
  return [
    `turn ${work} into the visible work standard`,
    `let ${work} decide what counts as done`,
    `make the task answer through ${work}`,
    `use ${work} as the practical finish line`
  ][mod(stableHash(`${seed}|${work}|work-concrete`), 4)];
}

function weekRepairOpeningLine(seed, bodyStart) {
  return [
    `Begin through ${bodyStart}.`,
    `Let ${bodyStart} set the first edge.`,
    `Open the repair with ${bodyStart}.`,
    `Use ${bodyStart} before the week starts negotiating.`
  ][mod(stableHash(`${seed}|${bodyStart}|repair-opening`), 4)];
}

function weekNightProofLine(seed, work) {
  return [
    `By night, the proof should be one finished piece that still feels usable tomorrow.`,
    `The useful evidence is not a bigger speech; it is one result that can be repeated when the day gets busy.`,
    `End with a visible result, then let tomorrow inherit the proof instead of the pressure.`,
    `The week starts changing when the finished piece can be found without another explanation.`
  ][mod(stableHash(`${seed}|${work}|night-proof`), 4)];
}

function monthTrackLine(seed, area, name = "") {
  return [
    monthCrossAreaTrackLine(seed, area, name),
    monthHiddenRouteLine(seed, area, name),
    monthOrdinarySceneLine(seed, area, name),
    monthSavedReadingLine(seed, area, name)
  ][mod(stableHash(`${seed}|${name}|${area}|month-track-v3`) + stableHash(name), 4)];
}

function monthCrossAreaTrackLine(seed = 0, area = "", name = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("creative")) {
    return `Track how ${area} changes names across first drafts, replies, rest, and visible effort. On the seventh day, review the saved note, circle the cost, and choose the habit that gives the first version a container.`;
  }
  if (areaText.includes("public") || areaText.includes("recognition")) {
    return `Track how ${area} moves through deadlines, messages, recognition timing, and rest. Every seventh day, save the proof, name the recognition cost, and choose one habit that can hold the next week.`;
  }
  return pickArea(stableHash(`${seed}|${name}|${area}|cross-area-track-v1`), [
    `Track how ${area} changes names across work, money, family, rest, and communication. Review saved readings every seventh day, circle the repeating cost, and let one habit become the container that holds it.`,
    `Follow ${area} across work, money, family, rest, and communication. Each seventh day, save proof, name the cost, and choose one habit that can contain it.`,
    `Let ${area} be checked across work, money, family, rest, and communication. Review the saved note weekly and choose the habit that makes the pressure smaller.`
  ]);
}

function monthHiddenRouteLine(seed, area, name = "") {
  return [
    `Follow ${area} through timing, money, messages, rest, and duty. On the seventh day, save the evidence, name the cost, and choose one habit to contain it.`,
    `Let the weekly note ask where ${area} hid: timing, money, messages, rest, or duty. Save the evidence, name the cost, and choose one habit for the next week.`,
    `Trace ${area} across the ordinary places it borrows: timing, money, messages, rest, and duty. The seventh-day note should name one cost and one habit that contains it.`,
    `Use the seventh day to locate where ${area} showed up in ordinary life. Keep the note small, name the cost for ${area}, then choose one habit that can hold it.`
  ][mod(stableHash(`${seed}|${name}|${area}|hidden-route-v2`), 4)];
}

function monthSavedReadingLine(seed, area, name = "") {
  return [
    `Use one saved reading as the weekly marker for ${area}. Write the cost in one sentence, then choose the habit that keeps the next week lighter.`,
    `Let the saved note show where ${area} repeated. Each week, name the cost once and give the pressure one habit that can hold it.`,
    `Put a saved reading beside ${area} every seventh day. Mark the repeated cost, choose one habit, and keep the repair small enough to repeat.`,
    `Use the weekly saved note to catch ${area} early. Write the cost plainly, then give the next seven days one habit instead of another speech.`,
    `Let each saved reading become a checkpoint for ${area}. Circle the cost, name the pressure, and choose the habit that keeps it contained.`
  ][mod(stableHash(`${seed}|${name}|${area}|saved-reading-line-v2`), 5)];
}

function monthOrdinarySceneLine(seed, area, name = "") {
  return [
    `Give ${area} a seven-day ledger. Note the ordinary examples, name the cost once, and choose the habit that keeps next week lighter.`,
    `Follow ${area} through small scenes rather than one dramatic moment. At each seventh-day review, mark the cost and choose the habit that can hold the pressure next.`,
    `Let ${area} be tracked through daily evidence, not a single breakthrough. Every seventh day, name the cost and choose the habit that keeps the pressure contained.`,
    `Use ordinary scenes to track ${area}. On each seventh day, save the evidence, write the cost, and choose the habit that will carry the next week.`,
    `Let ${area} keep its receipt: one ${area} example, one cost, and one habit before review.`,
    `Review ${area} by examples, not intensity. Save the clearest scene, name what it charged, and choose the smallest habit that can hold the next week.`
  ][mod(stableHash(`${seed}|${name}|${area}|ordinary-scene-v3`), 6)];
}

function monthProgressClose(seed, area, name = "") {
  return [
    `For ${area}, progress shows up when the weekly system starts replacing the dramatic speech with evidence.`,
    monthReviewableEvidenceLine(seed, area, name),
    monthEarlyRepairClose(seed, area, name),
    `For ${area}, keep the weekly system practical: one early repair, one dated note, and one mood left without a speech.`,
    monthVisibleRepairBeforeMoodLine(seed, area, name),
    `The record should show one repair in motion before the feeling asks for a larger story.`
  ][mod(stableHash(`${seed}|${name}|${area}|month-progress-v3`) + stableHash(name), 6)];
}

function monthReviewableEvidenceLine(seed = 0, area = "", name = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("ambition") || areaText.includes("recognition")) {
    const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    return pickArea(stableHash(`${seed}|${name}|${area}|ambition-evidence-v1`) + nameOffset, [
      `Let ${area} answer through weekly proof instead of a dramatic speech.`,
      `Let weekly proof carry ${area} before a dramatic speech gets invited.`,
      `Give ${area} one reviewable proof before the story asks for drama.`
    ]);
  }
  return pickArea(stableHash(`${seed}|${name}|${area}|reviewable-evidence-v1`), [
    `Let reviewable evidence around ${area} replace the dramatic speech.`,
    `Let ${area} use reviewable evidence instead of a dramatic speech.`,
    `Give ${area} evidence the week can review without a dramatic speech.`
  ]);
}

function monthVisibleRepairBeforeMoodLine(seed = 0, area = "", name = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("public") || areaText.includes("recognition")) {
    return `Let ${area} gain one reviewable repair before recognition pressure starts asking for a larger explanation.`;
  }
  if (areaText.includes("friendship") || areaText.includes("belonging")) {
    return `Let ${area} gain one visible repair before the social story asks for more proof.`;
  }
  return pickArea(stableHash(`${seed}|${name}|${area}|visible-repair-before-mood-v1`), [
    `Let ${area} gain a visible repair before the mood asks to explain everything again.`,
    `Give ${area} one visible repair before the feeling starts asking for a larger story.`,
    `Let one repair for ${area} become visible before the review turns into explanation.`
  ]);
}

function monthEarlyRepairClose(seed, area, name = "") {
  return [
    `Before ${area} spills into the week, catch pressure early and make one repair visible.`,
    `Catch the pressure inside ${area} while it is still small, then give the week one repair it can actually use.`,
    `Let ${area} show the early pressure point, choose one repair, and keep the rest of the week from carrying the overflow.`,
    `When ${area} first tightens, act while it is small and let the fix be visible.`,
    `Use the first small signal from ${area} as the repair point, then keep the week from inheriting the overflow.`,
    `Let the earliest pressure around ${area} get one visible answer before it becomes the week's background.`
  ][mod(stableHash(`${seed}|${name}|${area}|early-repair-close-v3`), 6)];
}

function monthDutyTaxLine(seed, area, avoid, name = "") {
  return [
    monthDutyAuditLine(seed, area, avoid, name),
    monthSmallRepeatableReviewLine(seed, area, avoid, name),
    monthChargeReviewLine(seed, area, avoid, name),
    monthCrowdedDutyLine(seed, area, avoid, name),
    `${monthDutyChargeOpening(seed, area, avoid, name)} ${monthBorrowedMoodClose(seed, area, name)}`,
    `Use four weeks to split ${area} into two columns: the real duty and the pressure added around it. Let the second column show where ${avoid} entered, then choose a small rule that interrupts it next time. Add one note each week so the record shows what moved, not how loud it felt.`
  ][mod(stableHash(`${seed}|${name}|${area}|${avoid}|duty-tax-v3`) + stableHash(name), 6)];
}

function monthSmallRepeatableReviewLine(seed = 0, area = "", avoid = "", name = "") {
  return pickArea(stableHash(`${seed}|${name}|${area}|${avoid}|small-repeatable-review-v2`), [
    `Let ${area} show the real duty and the added tax. Each week, name the costly spot, reduce ${avoid}, and protect one body cue. Keep the review small, dated, and easy to repeat, with one action chosen for the next week.`,
    `Use ${area} to separate duty from extra pressure. Once a week, name the cost, reduce ${avoid}, and keep one body cue protected in a short dated note. End by choosing the next repeatable limit.`,
    `Let ${area} get a weekly check: real duty, added tax, and one body cue that stays protected while ${avoid} gets smaller. The review should leave one visible habit for the next seven days.`,
    `Each week, make ${area} practical by naming the costly spot, reducing ${avoid}, and saving one dated example with a protected body cue. Add the first repair the next week should test.`,
    monthSmallBoundaryReviewLine(seed, area, avoid, name)
  ]);
}

function monthSmallBoundaryReviewLine(seed = 0, area = "", avoid = "", name = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("sleep")) {
    return `Give ${area} one small review: the real duty, the extra charge, and the body cue that interrupts ${avoid} before it grows. Close with a sleep-facing boundary the next review can test in ordinary life.`;
  }
  if (areaText.includes("home")) {
    return `Give ${area} one small review: the real duty, the extra charge, and the body cue that interrupts ${avoid} before it grows. Close with a home-rhythm boundary that can be tested before the next weekly note.`;
  }
  return pickArea(stableHash(`${seed}|${name}|${area}|${avoid}|small-boundary-review-v1`), [
    `Give ${area} one small review: the real duty, the extra charge, and the body cue that interrupts ${avoid} before it grows. Close with a boundary the next weekly note can test.`,
    `Give ${area} a small review: real duty, added charge, and the body cue that catches ${avoid}. End with one repeatable boundary tied to the next ordinary scene.`,
    `Let ${area} close with a modest review: duty, added charge, and one body cue that weakens ${avoid}. Choose the boundary the next week should test first.`
  ]);
}

function monthDutyChargeOpening(seed, area, avoid, name = "") {
  return [
    `Let ${area} separate the duty from the extra emotional charge. Once a week, write the real task, reduce ${avoid}, and keep the repair tied to one visible promise.`,
    `Use the month to split ${area} into duty, added pressure, and repair. Name the real task first, reduce ${avoid}, and keep one promise visible.`,
    `Give ${area} a weekly page for the real duty and the extra charge around it. Mark where ${avoid} enters, then choose one visible promise as the repair.`,
    `Each week, sort ${area} into what belongs, what got inflated, and what answer can stay small. Reduce ${avoid} before choosing the next visible promise.`,
    `Let the review ask what ${area} actually required and what ${avoid} added. Keep the repair tied to one promise that can be checked before the next week.`
  ][mod(stableHash(`${seed}|${name}|${area}|${avoid}|duty-charge-opening-v2`), 5)];
}

function monthBorrowedMoodClose(seed, area, name = "") {
  return [
    `By the last review, one pressure should be caught before it borrows the whole mood.`,
    `The final note should show one pressure interrupted before it becomes the week's background.`,
    `By week four, the repair should arrive early enough to keep the mood from carrying the whole duty.`,
    `Let the last review find one early interruption, not another emotional bill.`,
    `The month should end with one pressure named while it is still small enough to redirect.`
  ][mod(stableHash(`${seed}|${name}|${area}|borrowed-mood-close-v2`), 5)];
}

function monthDutyAuditLine(seed, area, avoid, name = "") {
  return [
    `Treat this theme each week as a duty audit. Mark the real task, name where ${avoid} added charge, and answer ${avoid} with one rule you can see. Tie the visible promise to ${area}'s review. ${monthDutyTaxClose(seed, area, name)}`,
    `Let ${area} use a weekly audit: real duty first, added charge second, and one visible answer for ${avoid}. Keep the promise small enough to check before Sunday becomes another story. ${monthDutyTaxClose(seed, area, name)}`,
    `Each week, make a practical split: real duty, cost of ${avoid}, and one visible rule before the next promise is made. Keep a dated example with that rule. ${monthDutyTaxClose(seed, area, name)}`,
    `Give ${area} one weekly page for duty, cost, and repair. Let ${avoid} be named early, then keep one promise visible enough to review without a speech. ${monthDutyTaxClose(seed, area, name)}`
  ][mod(stableHash(`${seed}|${name}|${area}|${avoid}|duty-audit-v2`), 4)];
}

function monthCrowdedDutyLine(seed, area, avoid, name = "") {
  return [
    `Choose one weekly place inside ${area} where the real duty and emotional tax get tangled. Name the duty, reduce ${avoid}, and keep one protected body cue in the review. ${monthLastWeekRepairLine(seed, area, name)}`,
    `Use the review to find where ${area} turns a practical duty into emotional tax. Write the duty first, reduce ${avoid}, and keep one body cue as the boundary. ${monthLastWeekRepairLine(seed + 1, area, name)}`,
    `For ${area}, track the moment a real task starts carrying more feeling than fact. Name it, reduce ${avoid}, and let one protected body cue stay in the review. ${monthLastWeekRepairLine(seed + 2, area, name)}`,
    `Give ${area} one weekly checkpoint for the duty that keeps getting emotionally expensive. Write the real task, reduce ${avoid}, and keep the review tied to one body cue. ${monthLastWeekRepairLine(seed + 3, area, name)}`,
    `Each week, find the place where ${area} turns one duty into a larger emotional bill. Name the task, reduce ${avoid}, and keep one body cue protected while the repair is chosen. ${monthLastWeekRepairLine(seed + 4, area, name)}`
  ][mod(stableHash(`${seed}|${name}|${area}|${avoid}|crowded-duty-v2`), 5)];
}

function monthLastWeekRepairLine(seed, area, name = "") {
  return [
    `By the last week, the repair should begin earlier than the old pressure.`,
    `Let the final review show how quickly the first repair can interrupt the pressure.`,
    `By week four, the useful sign is a repair that starts before the story gets large.`,
    `The last review should show one pressure caught early and one habit ready to repeat.`,
    `Let the final note show which repair starts soon enough to keep ${area} usable.`
  ][mod(stableHash(`${seed}|${name}|${area}|last-week-repair-v2`), 5)];
}

function monthDutyTaxClose(seed, area, name = "") {
  return [
    `By the last review, the repair should be easier to find than the old story.`,
    `By review four, one task inside ${area} should ease. Let the old pressure lose authority.`,
    `The final note should show where the repair became usable before the mood expanded.`,
    `By week four, the record should point to the exact habit that made ${area} easier to interrupt.`,
    `The goal is a pattern with fewer hiding places and one repair that can be repeated without drama.`,
    `Let the month end with a visible adjustment, not another private argument about the pressure.`
  ][mod(stableHash(`${seed}|${name}|${area}|duty-tax-close-v2`), 6)];
}

function monthChargeReviewLine(seed, area, avoid, name = "") {
  return [
    `Build the review around ${area}: write the real duty, name how ${avoid} inflated it, then choose the next visible limit. Keep the promise close to the review so the pattern has less room to hide. Add one dated example each week, because the goal is a cleaner record, not a bigger speech.`,
    `Let ${area} have a weekly audit. ${monthAuditActionLine(seed, avoid)} ${monthRecordWeakensLine(seed, area)}`,
    `Separate the duty inside ${area} from the extra charge in writing. Mark where ${avoid} entered, choose one repeatable limit, and keep the promise visible enough to check next week. The review should show what changed, not only what felt heavy.`,
    `Use the review to sort ${area} into duty, pressure, and repair. When ${avoid} appears, answer it with one visible limit and one promise that can be checked before the next Sunday. Keep the note plain enough to use on a busy day.`,
    `Give ${area} a plain weekly ledger: the duty, the pressure added by ${avoid}, and the limit that answers it. Add the smallest proof beside the ledger, because the point is a record that can change behavior, not a larger speech.`
  ][mod(stableHash(`${seed}|${name}|${area}|${avoid}|charge-review-v3`), 5)];
}

function monthAuditActionLine(seed, avoid) {
  return [
    `Name the duty, show where ${avoid} added pressure, and choose one visible limit before the next review.`,
    `Mark the duty first, then write how ${avoid} inflated it and what limit answers it next week.`,
    `Separate the real task from ${avoid}; the next review gets one limit, one promise, and one dated example.`,
    `Show where ${avoid} entered, then give the next week a boundary that can be checked without a speech.`
  ][mod(stableHash(`${seed}|${avoid}|audit-action`), 4)];
}

function monthRecordWeakensLine(seed, area) {
  return [
    `A dated record makes the pressure easier to interrupt because it points to one repeatable action.`,
    `The record should stay plain enough to change behavior, not just describe what felt heavy.`,
    `One dated example and one next action will weaken the loop faster than a larger explanation.`,
    `The review works when it leaves a usable adjustment, not a longer story about the pressure.`
  ][mod(stableHash(`${seed}|${area}|record-weakens`), 4)];
}

function monthProofRecordLine(seed, structure) {
  return [
    `${capitalize(structure)}. Each Sunday, measure one proof point, one repeated cost, and one habit that can hold the pressure next week. Add a visible adjustment so the month becomes a record, not a memory, and let the final note point to one behavior that actually changed.`,
    `${capitalize(structure)}. Let Sunday collect evidence: the repeat, the cost, and the habit that made next week easier to enter. Add one dated adjustment before the review turns into a story, then keep the note close to a real message, task, meal, or clock.`,
    `${capitalize(structure)}. Use Sunday for a simple record: the repeated theme, the cost, and the habit that can carry the next week. Close with one visible adjustment and one scene where the habit should appear before pressure grows.`,
    `${capitalize(structure)}. Keep the Sunday proof practical: one repeat, one cost, one useful habit, and one visible adjustment for the coming week. The review should end with a behavior small enough to test before the next weekend.`,
    `${capitalize(structure)}. Let the weekly note show what changed, what charged attention, and which habit can hold the pressure. Add one dated proof so the month stays usable, then choose the first ordinary place to practice it again.`
  ][mod(stableHash(`${seed}|${structure}|proof-record-v2`), 5)];
}

function monthSundayReviewLine(seed, structure, name = "") {
  return [
    `${capitalize(structure)}. On Sunday, let ${structure} hold evidence; name the cost before mood enters and connect ${structure} to one practical habit. The review should end with a named next step.`,
    monthProofRecordLine(seed, structure),
    `${monthTrailOpeningLine(seed, structure, name)} ${monthTrailClose(seed, structure, name)}`,
    `${capitalize(structure)}. Use Sunday to record the repeat, the cost, and the habit that helped the pressure stay contained. Add one dated example beside the note, then use the fourth review to choose the first habit for next week.`,
    `${capitalize(structure)}. ${monthSundayCollectionLine(seed, structure, name)} ${monthSceneReviewClose(seed, structure, name)}`,
    `${capitalize(structure)}. Keep the weekly review plain: the repeat, the cost, and the habit that made the pressure easier to hold. Add one dated example before the fourth note points to the next change, so the month becomes usable evidence.`
  ][mod(stableHash(`${seed}|${name}|${structure}|sunday-v2`), 6)];
}

function monthTrailOpeningLine(seed, structure, name = "") {
  return [
    `Let the weekly note around ${structure} leave practical evidence.`,
    `Use the review for ${structure}: one record, one cost, one behavior to test.`,
    `Let each review keep ${structure} tied to one plain thread of evidence.`,
    `For ${structure}, write the proof first so behavior has somewhere to change.`,
    `Turn the review for ${structure} into one dated path forward.`,
    `Keep ${structure} close to a weekly record that points at action.`,
    `Let the next review translate ${structure} into one usable adjustment.`
  ][mod(stableHash(`${seed}|${name}|${structure}|trail-opening-v3`), 7)];
}

function monthSundayCollectionLine(seed, structure, name = "") {
  return [
    `Let each Sunday collect one dated proof, one named cost, and one habit that makes the next week easier to enter.`,
    `On Sunday, gather the proof, the cost it exposed, and the habit that should meet the next week first.`,
    `Use the Sunday note for three things: what repeated, what it charged, and which habit will hold the pressure next.`,
    `Let the weekly review name the clearest proof, the cost behind it, and one habit that can be tested again.`,
    `Each Sunday should leave a proof point, a cost named plainly, and one habit ready for the coming week.`
  ][mod(stableHash(`${seed}|${name}|${structure}|sunday-collection-v2`), 5)];
}

function monthTrailClose(seed, structure, name = "") {
  return [
    "Save the repeated cue, name the cost plainly, and attach the theme to one habit that can be tested next week without a larger speech.",
    "Let the note capture the repeated cue, the cost it created, and the one habit that should answer it before the next review begins.",
    "Keep the record practical: what repeated, what it charged, and which habit should hold the next week in one ordinary scene.",
    "Use the review to choose one habit around timing, rest, money, or communication, then check whether the next week behaves differently in practice.",
    "Let the trail show one changed behavior and one pressure point that still needs a smaller container before the next Sunday note."
  ][mod(stableHash(`${seed}|${name}|${structure}|trail-close-v2`), 5)];
}

function monthSceneReviewClose(seed, structure, name = "") {
  return [
    `Keep the note close to a real scene so the review can change behavior, not only describe pressure.`,
    `Tie the note to an actual message, room, or task so the review changes what happens next.`,
    `Let the evidence stay near an ordinary scene; the review should produce a usable adjustment.`,
    `Keep the record practical enough that next week can act on it without a larger speech.`,
    `Attach the proof to one real scene so the next habit has somewhere to begin.`
  ][mod(stableHash(`${seed}|${name}|${structure}|scene-review-close-v2`), 5)];
}

function monthVisibleReviewLine(seed, anchor, area, avoid) {
  return [
    `Use one weekly review for ${area}. Put ${area} beside ${anchor}; let the calendar mark ${area}'s heavy place and name when ${avoid} tried to take over. Then ${monthCorrectionLine(seed, avoid)}. Catch ${area} before it needs a crisis.`,
    `Set the review before the week hardens. Keep ${anchor} near the calendar, name where ${area} asked for attention it did not need, and catch how ${avoid} first entered. Then ${monthCorrectionLine(seed, avoid)}. ${monthEarlyReviewClose(seed, area)}`,
    `For ${area}, save one note each week around ${anchor}; name where ${area} became louder than the facts and when ${avoid} tried to lead. Then ${monthCorrectionLine(seed, avoid)}. A pattern loses power when it has a timestamp and a next action.`,
    monthCalendarWitnessLine(seed, anchor, area, avoid),
    `For ${area}, keep a weekly page. Start with ${anchor}, add where ${area} got expensive, and write the entry point for ${avoid}. Then ${monthCorrectionLine(seed, avoid)}. Keep it brief and easy to repeat next week.`,
    monthCheckpointPressureLine(seed, anchor, area, avoid),
    `Give the next four Sundays a single question: where did ${area} become louder than the real duty? Keep ${anchor} in view, note how ${avoid} pressed for control, and ${monthCorrectionLine(seed, avoid)}. This turns the month into evidence rather than memory.`,
    `Make one saved reading the weekly marker. Compare it with ${anchor}, name the pressure around ${area}, and catch the first sentence where ${avoid} wanted control. Then ${monthCorrectionLine(seed, avoid)}. Let one clean adjustment belong to ${area}; keep the review practical.`
  ][mod(stableHash(`${seed}|${anchor}|${area}|${avoid}|month-visible-v2`), 8)];
}

function monthCheckpointPressureLine(seed = 0, anchor = "", area = "", avoid = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("money")) {
    return `Treat each week as a checkpoint. Save ${anchor}, underline when ${area} pulled attention away from facts, and name the first sign of ${avoid}. Then ${monthCorrectionLine(seed, avoid)}. The pressure gets weaker when the money pattern is caught before it fills the room.`;
  }
  if (areaText.includes("rest")) {
    return `Treat each week as a checkpoint. Save ${anchor}, underline when ${area} pulled attention away from facts, and name the first sign of ${avoid}. Then ${monthCorrectionLine(seed, avoid)}. Rest-related pressure changes when the review catches it before the whole week takes its shape.`;
  }
  return pickArea(stableHash(`${seed}|${anchor}|${area}|${avoid}|checkpoint-pressure-v1`), [
    `Treat each week as a checkpoint. Save ${anchor}, underline the moment ${area} pulled attention away from facts, and name the first sign of ${avoid}. Then ${monthCorrectionLine(seed, avoid)}. The pressure weakens when the review catches it early.`,
    `Use each week as a checkpoint. Save ${anchor}, mark where ${area} left the facts, and name the first sign of ${avoid}. Then ${monthCorrectionLine(seed, avoid)}. Keep the pressure visible before it spreads.`,
    `Let ${anchor} become the checkpoint for ${area}. Track ${area}'s first fact drift, name ${avoid}, and then ${monthCorrectionLine(seed, avoid)}. ${monthCheckpointCloseLine(seed, area, avoid)}`
  ]);
}

function monthCheckpointCloseLine(seed = 0, area = "", avoid = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("home")) return `Use the home-order catch for the next repair.`;
  if (areaText.includes("visible") || areaText.includes("public") || areaText.includes("ambition")) return `Use the visibility catch for the next repair.`;
  return pickArea(stableHash(`${seed}|${area}|${avoid}|checkpoint-close-v1`), [
    `Let the early catch choose the next repair.`,
    `Let that early catch point to the next repair.`,
    `Use the early catch to choose the next repair.`
  ]);
}

function monthCalendarWitnessLine(seed = 0, anchor = "", area = "", avoid = "") {
  const avoidText = String(avoid || "").toLowerCase();
  if (avoidText.includes("messy")) {
    return `Use the calendar as the record, not the judge. Each week, write ${anchor}, mark where ${area} became costly, and catch the messy-detail story before it starts directing the next step. Then ${monthCorrectionLine(seed, avoid)}. ${monthSmallPressureClose(seed, area)}`;
  }
  if (avoidText.includes("pause")) {
    return `Let the calendar hold evidence without turning into a verdict. Each week, write ${anchor}, mark where ${area} became costly, and stop the waiting story before it takes over the review. Then ${monthCorrectionLine(seed, avoid)}. ${monthSmallPressureClose(seed, area)}`;
  }
  if (avoidText.includes("mood")) {
    return `Use the calendar as a plain record. Each week, write ${anchor}, mark where ${area} became costly, and catch the mood-responsibility pattern before it becomes the room's explanation. Then ${monthCorrectionLine(seed, avoid)}. ${monthSmallPressureClose(seed, area)}`;
  }
  return pickArea(stableHash(`${seed}|${anchor}|${area}|${avoid}|calendar-witness-v1`), [
    `Use the calendar as a weekly record. Write ${anchor}, mark where ${area} became costly, and catch ${avoid} before it starts leading the review. Then ${monthCorrectionLine(seed, avoid)}. ${monthSmallPressureClose(seed, area)}`,
    `Let the calendar collect proof instead of verdicts. Each week, add ${anchor}, name where ${area} got expensive, and stop ${avoid} before the next step gets shaped by pressure. Then ${monthCorrectionLine(seed, avoid)}. ${monthSmallPressureClose(seed, area)}`,
    `Keep the calendar factual. Write ${anchor}, mark the costly point in ${area}, and catch ${avoid} while the review can still choose a smaller repair. Then ${monthCorrectionLine(seed, avoid)}. ${monthSmallPressureClose(seed, area)}`
  ]);
}

function monthEarlyReviewClose(seed, area) {
  return [
    monthEarlyEvidenceLine(seed, area),
    `Bring ${area} to the review early, before the pattern asks for a bigger scene.`,
    `Use the first proof around ${area} before the month turns it into a story.`,
    `Keep the review close to ${area}, where the evidence is still fresh enough to redirect.`,
    `Review ${area} early, while one clean correction can still change the week.`
  ][mod(stableHash(`${seed}|${area}|early-review`), 5)];
}

function monthEarlyEvidenceLine(seed = 0, area = "") {
  const areaText = String(area || "").toLowerCase();
  if (areaText.includes("mental")) {
    return `Let the evidence for ${area} arrive early, while the review can still choose one practical answer.`;
  }
  if (areaText.includes("rest")) {
    return `Let the evidence for ${area} arrive before the week hardens, while the review can still stay small.`;
  }
  return pickArea(stableHash(`${seed}|${area}|early-evidence-v1`), [
    `Let the evidence for ${area} arrive early, while the review can still stay practical.`,
    `Bring evidence for ${area} in early, before the review turns into a larger story.`,
    `Let ${area} show evidence soon enough for one practical correction.`
  ]);
}

function monthSmallPressureClose(seed, area) {
  return [
    `Catch the pressure around ${area} while one practical change can still redirect it.`,
    `Let ${area} meet correction early, before the review has to manage a larger story.`,
    `Keep the pressure visible in ${area}, then answer it before it hardens into atmosphere.`,
    `Use the review to interrupt ${area} while the next step is still small.`,
    `Let the evidence around ${area} stay close enough to change without drama.`
  ][mod(stableHash(`${seed}|${area}|small-pressure`), 5)];
}

function pickPractice(parts, seed) {
  const { review, bodyStart, move, name } = parts;
  const moveCue = phraseVariant(move, seed, "practice-move");
  const recordCue = phraseVariant(move, seed + 17, "practice-record");
  const bodyCue = phraseVariant(bodyStart, seed, "practice-body");
  const templates = [
    `${practiceSevenDayLine(seed, review, moveCue, name)}`,
    `${practiceFactsLine(seed, moveCue)} ${practiceRecordLine(seed, recordCue)}`,
    `${practiceDemandingMessageLine(seed, bodyCue, name)}`,
    `${practiceMorningPromiseLine(seed, moveCue, name)}`
  ];
  return templates[mod(seed + 11, templates.length)];
}

function practiceSevenDayLine(seed, review, move, name = "") {
  return [
    practiceSevenDayEvidenceLine(seed, review, name),
    practiceDailyOpeningLine(seed, review, move, name),
    `For the next week, put the hardest reply after ${review}. Tie the night note to ${move}; let tomorrow start from that proof and one small decision.`,
    `${practiceConcreteRepairClose(seed, review, name)}`
  ][mod(stableHash(`${seed}|${name}|${review}|seven-day-v2`), 4)];
}

function practiceSevenDayEvidenceLine(seed = 0, review = "", name = "") {
  return [
    `For seven days, use ${review} before the first difficult reply. At night, name what softened and choose tomorrow's first action from that proof.`,
    `Let ${review} lead the hard reply for a week. Each night, save one lighter detail and choose the next morning's first repair.`,
    `Use ${review} before the tense message for seven days. Close by naming the proof, the lighter edge, and the next first action.`,
    `For one week, place ${review} before the hardest reply. At night, keep one proof and choose the next small repair from it.`
  ][mod(stableHash(`${seed}|${name}|${review}|seven-day-evidence-v2`), 4)];
}

function practiceDailyOpeningLine(seed, review, move, name = "") {
  return [
    `Use ${review} to open the day, then put the night note beside ${move}. Record what changed, what stayed easier, and which next step belongs to the morning.`,
    `Begin with ${review}. Before sleep, connect the outcome to ${move}: the lighter detail, the support that helped, and one first action for tomorrow.`,
    `Let ${review} be the opening cue. At night, write what shifted, how ${move} helped, and which small action should meet the next morning first.`,
    `Open with ${review}; close by naming one outcome, one support, and one tomorrow action tied to ${move}. Keep the note practical enough to use.`
  ][mod(stableHash(`${seed}|${name}|${review}|${move}|daily-opening-v2`), 4)];
}

function practiceConcreteRepairClose(seed, review, name = "") {
  return [
    `Begin seven days with ${review} before a demanding message. When the day closes, name the detail that became lighter, save the proof, and choose tomorrow's first repair from that evidence.`,
    practiceSmallestCorrectionLine(seed, review, name),
    `For one week, place ${review} before the hardest message. Close the day by saving the proof, naming the lighter detail, and choosing one repair small enough to repeat tomorrow.`,
    `Begin the seven-day practice with ${review}. When evening comes, record the lighter detail and the proof beside it, then give tomorrow one repair that can be started without debate.`,
    `Put ${review} before the hardest message for one week. End each day with the detail that softened, the proof that stayed visible, and one repair that can begin early tomorrow.`,
    `Let ${review} lead the difficult reply for seven days. At night, save the useful proof, name the lighter detail, and choose the next repair before the mood edits the record.`
  ][mod(stableHash(`${seed}|${name}|${review}|concrete-repair-v3`), 6)];
}

function practiceSmallestCorrectionLine(seed = 0, review = "", name = "") {
  const variants = [
    `Use ${review} before the message that asks too much. At night, save the lighter detail and choose the first useful correction for morning.`,
    `Put ${review} before the difficult message. Close the day with what helped, what softened, and one morning repair.`,
    `Let ${review} lead the demanding reply. Before sleep, name the lighter detail and the first repair tomorrow should use.`,
    practiceSmallestCorrectionSpecificLine(seed, review, name)
  ];
  return variants[mod(String(review).length + String(name).length + seed, variants.length)];
}

function practiceSmallestCorrectionSpecificLine(seed = 0, review = "", name = "") {
  const reviewText = String(review || "").toLowerCase();
  if (reviewText.includes("closing time")) {
    return `Use ${review} for the hardest reply. At night, record the earlier close, the calmer message it created, and one plain starting step for morning.`;
  }
  if (reviewText.includes("body cue")) {
    return `Put ${review} ahead of the hardest reply. Before sleep, record the body cue, the message it softened, and the first simple action for morning.`;
  }
  return pickArea(stableHash(`${seed}|${name}|${review}|smallest-correction-specific-v1`), [
    `Use ${review} for the hardest reply. At night, save how the message changed, then give morning one correction and a first action that stays ordinary.`,
    `Use ${review} before the hard reply. Close the day with the lighter detail, then let morning begin from one correction and one small practical step.`,
    `Let ${review} lead the hardest message. Before sleep, write the changed reply and choose one correction the morning can use without a larger story.`
  ]);
}

function practiceDemandingMessageLine(seed, bodyStart, name = "") {
  return [
    practiceDemandingOpeningLine(seed, bodyStart),
    `Practice ${bodyStart} before the first message that asks for more than belongs to it. ${practiceCleanAnswerLine(seed, bodyStart)} ${practiceLessExplanationClose(seed, bodyStart)}`,
    practiceProtectedMessageLine(seed, bodyStart, name),
    `Before a difficult message, put ${bodyStart} before the reply and give the answer one clear job. ${practiceBodyResultClose(seed, bodyStart)}`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|demanding-v2`), 4)];
}

function practiceProtectedMessageLine(seed = 0, bodyStart = "", name = "") {
  return pickArea(stableHash(`${seed}|${name}|${bodyStart}|protected-message-v1`), [
    `Start with ${bodyStart}; choose one reply from ${bodyStart}. Tomorrow uses that proof.`,
    `Put ${bodyStart} before the demanding reply, then choose one sentence that can stay warm. Close the day by naming the protected edge.`,
    `Before the reply asks for too much, let ${bodyStart} narrow the answer to one usable sentence. At night, save the part that stayed protected.`,
    `Use ${bodyStart} before the demanding reply and keep one sentence. Later, mark which pressure got lighter: timing, warmth, or explanation.`
  ]);
}

function practiceDemandingOpeningLine(seed, bodyStart) {
  return [
    `Before the first demanding message, use ${bodyStart} and write the useful answer in plain words. After the day closes, record which sentence stayed warm because the reply stayed smaller.`,
    `Before the first hard reply, start with ${bodyStart} and keep only the sentence that belongs. At night, save what became easier: timing, warmth, or the pressure to explain.`,
    practiceSizedAnswerLine(seed, bodyStart),
    `Let ${bodyStart} lead the first difficult reply. Send the useful part, leave the extra defense out, and record the moment when less wording kept the exchange steadier.`
  ][mod(stableHash(`${seed}|${bodyStart}|demanding-opening-v2`), 4)];
}

function practiceSizedAnswerLine(seed, bodyStart) {
  return [
    `Put ${bodyStart} before the first message; let the reply stay small enough to keep. Close by naming what ${bodyStart} protected without a longer defense.`,
    `Use ${bodyStart} before answering; give the message one job and stop there. At night, record the part that stayed warm without extra defense.`,
    practicePaceFirstLine(seed, bodyStart),
    `Start with ${bodyStart}; make the first reply practical, brief, and warm. Close the day by saving the proof that fewer words were enough.`
  ][mod(stableHash(`${seed}|${bodyStart}|sized-answer-v2`), 4)];
}

function practicePaceFirstLine(seed, bodyStart) {
  const variants = [
    `After ${bodyStart}, write one useful sentence. Let ${bodyStart} show why the answer became easier to keep.`,
    `Use ${bodyStart} as the pace-setter. Let ${bodyStart} choose the sentence; record the boundary it kept warm and repeat only that smaller answer tomorrow.`,
    `Let the first answer wait for ${bodyStart}. Write one useful sentence and save the proof that the smaller reply held.`,
    `Place ${bodyStart} before the wording. Keep one useful sentence, then record why the answer stayed warm and usable. Save the exact boundary and the smaller reply to repeat tomorrow.`
  ];
  return variants[mod(String(bodyStart).length + seed, variants.length)];
}

function practiceCleanAnswerLine(seed, bodyStart) {
  return [
    `Write the clean answer, send only the useful part, and`,
    `Choose the sentence that belongs, send that part only, and`,
    `Make the answer plain, leave the extra defense out, and`,
    `Write the useful sentence first, keep the rest unsent, and`,
    `Send the part that helps, stop before explaining twice, and`
  ][mod(stableHash(`${seed}|${bodyStart}|clean-answer-line-v2`), 5)];
}

function practiceLessExplanationClose(seed, bodyStart) {
  return [
    `record where less explanation kept care intact.`,
    `note which part stayed warm because the answer stayed smaller.`,
    `save the place where the shorter reply protected the real care.`,
    `write down how the cleaner sentence changed timing, warmth, or pressure.`,
    `mark the moment when sending less made the boundary easier to trust.`
  ][mod(stableHash(`${seed}|${bodyStart}|less-explanation-close-v2`), 5)];
}

function practiceBodyResultClose(seed, bodyStart) {
  const result = phraseVariant(bodyStart, seed + 9, "practice-body-result");
  return [
    `At night, write how ${result} changed the reply length, timing, or warmth.`,
    `Close the day by noting what shifted after ${result}: length, timing, or warmth.`,
    `Before sleep, mark whether ${result} made the answer shorter, warmer, or easier to keep.`,
    `End with one note about ${result}; name the change once, then stop before the story grows.`
  ][mod(stableHash(`${seed}|${bodyStart}|body-result-close`), 4)];
}

function practiceMorningPromiseLine(seed, move, name = "") {
  return [
    practiceSmallPromiseLine(seed, move, name),
    `Start with a promise the day can complete before night. Record what stayed clear, where the line softened, and what tomorrow needs so the promise can hold its shape with less effort.`,
    `Choose one promise the day can see before it gets crowded. Before bed, mark whether ${move} helped it hold, then name the blur and the repair for tomorrow.`,
    `${practicePromiseOpeningLine(seed, move)} ${practicePromiseCloseLine(seed, move)}`,
    `Let the first promise stay small enough to finish by evening. Record the place where ${move} supported it, then choose tomorrow's repair before another task gets added.`,
    `Put one promise on paper before the day starts bargaining. Before sleep, name what held, what slipped, and how ${move} should enter tomorrow with one practical support already chosen.`,
    practiceVisibleEdgeLine(seed, move),
    practicePromiseEndpointLine(seed, move, name)
  ][mod(stableHash(`${seed}|${name}|${move}|morning-promise-v4`), 8)];
}

function practiceSmallPromiseLine(seed, move, name = "") {
  return [
    `Begin the morning with one promise that has a visible finish. Before sleep, note what stayed intact, what softened, and which support ${move} needs before another task joins.`,
    `Give the first promise a size the day can keep. At night, record the held part, the blurred edge, and the next support ${move} should receive before new work enters.`,
    `Let the morning promise stay small and checkable. Before bed, write what held, what loosened, and how ${move} should be supported before the next demand arrives.`,
    `Start with one promise that can close by evening. Record the intact piece, the softened part, and the support ${move} needs so tomorrow does not inherit a vague duty.`,
    `Keep the first promise visible from morning onward. At night, mark the kept piece, the weaker edge, and one support for ${move} before another task gets invited.`
  ][mod(stableHash(`${seed}|${name}|${move}|small-promise-v2`), 5)];
}

function practiceVisibleEdgeLine(seed, move) {
  return [
    `Let ${move} set one visible edge. Close the kept part, mark the weak part, and choose one support for tomorrow. Name that practical support before another request.`,
    `Use ${move} as the day's edge. Before sleep, mark what held, what softened, and which support should be ready before the next request.`,
    `Let the promise take its working edge from ${move}. Close one kept part, one weak point, and one morning support before the day opens.`,
    `Make ${move} the visible edge. End with three facts: what held, what blurred, and which support should meet the next demand.`
  ][mod(stableHash(`${seed}|${move}|${String(move).length}|visible-edge-practice-v3`), 4)];
}

function practicePromiseEndpointLine(seed, move, name = "") {
  return [
    `Choose a promise with a real end point, not a heroic version of the day. At night, record whether ${move} made it easier to keep, then choose one support the next morning can actually use.`,
    `Keep the promise close enough to finish today. Before sleep, note how ${move} changed the outcome, what became easier to repeat, and which practical support should meet morning first.`,
    practiceTomorrowSupportLine(seed, move),
    `Use a promise with a real stopping point. Close the day by naming how ${move} helped it hold, which detail weakened, and which support should be ready before the next demand arrives.`,
    `Let the promise stay ordinary enough to complete. Before bed, record what ${move} protected, what still pulled for attention, and which small support belongs at tomorrow's opening.`,
    `Choose the promise that can finish without becoming a performance. At night, mark whether ${move} kept it visible, what made it wobble, and the simple support tomorrow should receive first.`
  ][mod(stableHash(`${seed}|${name}|${move}|endpoint-promise-v2`), 6)];
}

function practiceTomorrowSupportLine(seed, move) {
  return [
    `Pick the promise that has an honest edge. At night, write where ${move} helped, where it blurred, and which small support should meet morning before the day starts negotiating. Keep the support practical enough to begin before checking messages.`,
    `Choose the promise with a real edge. Before sleep, name where ${move} helped, where it weakened, and which support should be ready before morning asks for more. The support should be visible: a time, note, meal, or first task.`,
    `Let the promise stay small enough to inspect. At night, record how ${move} helped it hold and choose one support for tomorrow's first demand. The next morning should inherit a tool, not a mood.`,
    `Use the promise as the test. Before bed, write where ${move} helped, what blurred, and which practical support should greet tomorrow first. Make it something the body can use before the day becomes crowded.`,
    `Choose the promise by what can be kept. Close the night with where ${move} helped, where it lost shape, and one support for the next morning. Keep the support small enough to repeat without a speech.`
  ][mod(stableHash(`${seed}|${move}|tomorrow-support-v2`), 5)];
}

function practicePromiseOpeningLine(seed, move) {
  return [
    `Give the morning one small promise with a visible end.`,
    `Start the morning with one promise the day can actually close.`,
    `Let the first promise be plain enough to finish before night.`,
    `Choose the morning promise by size, not by guilt, and keep it visible until evening.`
  ][mod(stableHash(`${seed}|${move}|promise-opening`), 4)];
}

function practicePromiseCloseLine(seed, move) {
  return [
    `At night, mark where it held, where it softened, and what ${move} needs tomorrow before any new promise is added.`,
    `Before sleep, write the intact part, the blurred part, and one support for ${move} that can be repeated without effort.`,
    `Close the day with three facts: what held, what blurred, and how ${move} should begin tomorrow before the inbox decides.`,
    `End by naming the kept promise, the weak point, and the support ${move} needs next so the repair stays practical.`
  ][mod(stableHash(`${seed}|${move}|promise-close`), 4)];
}

function weekBlockLine(seed, work, move) {
  return [
    weekRealFinishBlockLine(seed, work),
    weekProtectedVisibleBlockLine(seed, move),
    `put a timed edge around ${work}`,
    `pick one block for ${work}, then close the open item in the form it needs`,
    `make one visible block answer the pressure before another promise joins the list`
  ][mod(stableHash(`${seed}|${work}|${move}`), 5)];
}

function weekRealFinishBlockLine(seed = 0, work = "") {
  const workText = String(work || "").toLowerCase();
  if (workText.includes("practical question")) {
    return `choose a two-hour block where the practical question gets answered before new promises enter`;
  }
  if (workText.includes("boundary") || workText.includes("useful")) {
    return `choose a two-hour block where ${work} leaves one finished edge before any new promise enters`;
  }
  return pickArea(stableHash(`${seed}|${work}|real-finish-block-v1`), [
    `choose a two-hour block where ${work} gets a real finish before new promises enter`,
    `give ${work} one two-hour block and close the usable part before new promises enter`,
    `set two hours around ${work}, then finish the part that can close before another promise arrives`
  ]);
}

function weekProtectedVisibleBlockLine(seed = 0, move = "") {
  return pickArea(stableHash(`${seed}|${move}|protected-visible-block-v2`), [
    `use one protected block where ${move} gets visible before another request enters`,
    `put ${move} inside one block; close ${move} before the next request`,
    `make ${move} visible inside a timed block before new access is offered`,
    `let one protected block show ${move} before the next request gets a vote`,
    `give ${move} one visible block before another promise arrives`
  ]);
}

function weekMessageLine(seed, avoid) {
  return [
    weekFactualNeedLine(seed, avoid),
    `When the reply gets crowded by ${avoid}, ${weekReplyCorrectionLine(seed, avoid)}`,
    `If ${avoid} tries to turn the message into a performance, choose timing over extra explanation.`,
    weekShorterReplyLine(seed, avoid),
    `If the screen invites ${avoid}, step back until the next sentence can carry one job.`
  ][mod(stableHash(`${seed}|${avoid}|message-v2`) + stableHash(avoid), 5)];
}

function weekFactualNeedLine(seed, avoid) {
  return [
    `If a message pulls you toward ${avoid}, answer only the practical request and leave the extra story outside.`,
    `When a message reaches for ${avoid}, name the useful fact first and let the rest wait.`,
    `If ${avoid} shows up, keep ${avoid} outside and send the factual part.`,
    `When the screen pulls on ${avoid}, return to the actual request and keep the answer smaller than the pressure.`,
    `If ${avoid} enters the message, give the factual piece one sentence and let the unfinished emotion stay off the reply.`
  ][mod(stableHash(`${seed}|${avoid}|factual-need-v2`), 5)];
}

function weekReplyCorrectionLine(seed, avoid) {
  return [
    `wait for the practical sentence and send only that.`,
    `write the plain purpose first, then delete the extra defense.`,
    `move the answer to a quieter moment before choosing words.`,
    `answer the factual need before adding any emotional explanation.`,
    `let the reply shrink until one honest job remains.`,
    weekRealRequestLine(seed, avoid),
    `choose the timing first, then make the words carry less strain.`,
    `keep the sentence close to the action it can actually complete.`
  ][mod(stableHash(`${seed}|${avoid}|reply-correction`), 8)];
}

function weekRealRequestLine(seed = 0, avoid = "") {
  const avoidText = String(avoid || "").toLowerCase();
  if (avoidText.includes("explain") || avoidText.includes("explanation")) {
    return `write the real request before the explanation reaches the send button.`;
  }
  if (avoidText.includes("mood")) {
    return `name the actual request before the mood story touches the send button.`;
  }
  return pickArea(stableHash(`${seed}|${avoid}|real-request-v1`), [
    `name the real request on paper before touching the send button.`,
    `write the request plainly before the send button gets involved.`,
    `name the useful request first, then decide whether the send button is needed.`
  ]);
}

function weekShorterReplyLine(seed = 0, avoid = "") {
  return pickArea(stableHash(`${seed}|${avoid}|shorter-reply-line-v2`), [
    `When a reply begins carrying ${avoid}, shrink it to one job and keep the useful sentence.`,
    weekUsefulFactReplyLine(seed, avoid),
    weekMessageShapeLine(seed, avoid),
    `If the answer starts carrying ${avoid}, give it a time edge and one practical sentence.`,
    `When the reply gets crowded by ${avoid}, return to the real request and leave the proof outside.`
  ]);
}

function weekUsefulFactReplyLine(seed = 0, avoid = "") {
  const avoidText = String(avoid || "").toLowerCase();
  if (avoidText.includes("mess") || avoidText.includes("detail")) {
    return `If ${avoid} enters the reply, choose the useful fact first and keep the extra defense outside.`;
  }
  if (avoidText.includes("visible") || avoidText.includes("proof")) {
    return `If ${avoid} enters the reply, send the useful fact first and let the extra defense wait.`;
  }
  return pickArea(stableHash(`${seed}|${avoid}|useful-fact-reply-v1`), [
    `If ${avoid} enters the reply, choose the useful fact first and let the extra defense wait.`,
    `When ${avoid} enters the reply, start with the useful fact and leave the defense outside.`,
    `If the reply carries ${avoid}, answer with the useful fact before adding any defense.`
  ]);
}

function weekMessageShapeLine(seed = 0, avoid = "") {
  const avoidText = String(avoid || "").toLowerCase();
  if (avoidText.includes("conversation") || avoidText.includes("answered")) {
    return `When the old conversation starts shaping the message, keep one factual sentence and leave the rest for later.`;
  }
  if (avoidText.includes("mood")) {
    return `When the mood story starts shaping the reply, choose one useful sentence and keep the larger explanation outside.`;
  }
  return pickArea(stableHash(`${seed}|${avoid}|message-shape-v1`), [
    `When ${avoid} starts shaping the message, keep one sentence and move the rest out of the reply.`,
    `If ${avoid} begins steering the message, keep the useful sentence and move the extra proof outside.`,
    `When the reply starts bending around ${avoid}, choose one practical sentence and stop there.`
  ]);
}

function practiceHandledLine(seed, move) {
  return [
    `what changed by nightfall after ${move}`,
    `where ${move} kept one detail closed`,
    `where ${move} left one loop closed around ${move} instead of running privately`,
    practiceEasierRepeatLine(seed, move),
    `where ${move} kept one promise intact`
  ][mod(stableHash(`${seed}|${move}`), 5)];
}

function practiceEasierRepeatLine(seed, move) {
  return [
    `where ${move} made the next repeat easier to trust`,
    `which small result became repeatable after ${move}`,
    `how ${move} kept the repeat small enough to use`,
    `where the repeated action became easier because ${move} stayed visible`,
    `which detail could repeat once ${move} stayed practical`
  ][mod(stableHash(`${seed}|${move}|easier-repeat-v2`), 5)];
}

function practiceFactsLine(seed, move) {
  const handled = practiceHandledLine(seed, move);
  return [
    `After ${move}, note the repeat, its cost, and ${handled}.`,
    `At night, let ${handled} name the return and price.`,
    `Before sleep, capture what came back, what it charged you, and ${handled}.`,
    `At night, record ${move}: the recurring moment, the cost, and ${handled}.`,
    `${capitalize(handled)}; then record the pressure and price.`
  ][mod(stableHash(`${seed}|${move}|facts`), 5)];
}

function practiceRecordLine(seed, move = "the move") {
  return [
    `Make it brief enough to keep on a tired night and specific enough to guide tomorrow.`,
    `Let the proof show ${move}; save the useful fact before the story starts improving itself.`,
    `Name ${move} in a tired-night note, then keep the record small enough for busy days.`,
    `Stop after capturing evidence for ${move}; after ${move}, pick the action first and keep the note small.`,
    `Use the result as the teacher: save one proof, close the note, and stop early.`,
    `Save that repair as proof for ${move}, then close the note before it turns into a second task.`,
    `Save the plain result of ${move}; tomorrow needs a usable fact, not a polished explanation.`,
    practiceRecordReviewProofLine(seed, move),
    `Write the result in one practical line and leave the rest for tomorrow's action.`,
    practiceEvidencePlainLine(seed, move)
  ][mod(stableHash(`${seed}|${move}|record-v3`), 10)];
}

function practiceEvidencePlainLine(seed = 0, move = "") {
  const moveText = String(move || "").toLowerCase();
  if (moveText.includes("respect")) {
    return `Save the evidence while it is plain; the next review needs one respect-shaped fact, not a performance.`;
  }
  if (moveText.includes("useful") || moveText.includes("work")) {
    return `Save the evidence while it is plain; the next review needs one work fact, not a performance.`;
  }
  return pickArea(stableHash(`${seed}|${move}|evidence-plain-v1`), [
    `Save the evidence while it is plain; the next review needs a fact, not a performance.`,
    `Save the plain evidence before the note turns into performance.`,
    `Let the next review find one plain fact before any performance begins.`
  ]);
}

function practiceRecordReviewProofLine(seed = 0, move = "") {
  const moveText = String(move || "").toLowerCase();
  if (moveText.includes("promise")) {
    return `Keep the record beside ${move}; the next review should find the kept promise before mood starts adding commentary.`;
  }
  if (moveText.includes("finish line")) {
    return `Keep ${move} beside the record; the next review should see the closed edge before mood gets another vote.`;
  }
  return pickArea(stableHash(`${seed}|${move}|record-review-proof-v1`), [
    `Keep the record close to ${move}; let the next review find one proof before the mood starts searching for a bigger explanation.`,
    `Save ${move} near the record, so the next review starts with evidence instead of a mood search.`,
    `Leave ${move} in the note; the next review needs a visible proof before it needs another explanation.`
  ]);
}

function monthCorrectionLine(seed, avoid) {
  const pressure = lowerFirst(safePhrase(avoid || "over-explaining"));
  return [
    `pick the smallest correction that keeps ${pressure} from managing the next week`,
    `answer ${pressure} with one next-week adjustment that can be seen`,
    `write the counter-move you will use before ${pressure} takes the steering wheel again`,
    `choose one reply length, calendar edge, or limit that cuts ${pressure} short next time`,
    monthTimingRuleLine(seed, pressure),
    monthPracticalInterruptionLine(seed, pressure),
    monthExactActionLine(seed, pressure),
    `give the next week one visible rule that answers ${pressure} early`
  ][mod(stableHash(`${seed}|${pressure}|month-v2`), 8)];
}

function monthTimingRuleLine(seed = 0, pressure = "") {
  const pressureText = String(pressure || "").toLowerCase();
  if (pressureText.includes("explanation")) {
    return `set one timing rule before the explanation pattern becomes the room's tone`;
  }
  if (pressureText.includes("conversation") || pressureText.includes("closed")) {
    return `set one reply window before the old conversation becomes the room's tone`;
  }
  return pickArea(stableHash(`${seed}|${pressure}|timing-rule-v1`), [
    `set one timing rule before ${pressure} becomes the room's tone`,
    `choose one timing rule before ${pressure} starts setting the tone`,
    `give ${pressure} one timing edge before it fills the room`
  ]);
}

function monthExactActionLine(seed = 0, pressure = "") {
  const pressureText = String(pressure || "").toLowerCase();
  if (pressureText.includes("detail")) {
    return `make one exact action the review's answer before the detail pressure gets another opening`;
  }
  if (pressureText.includes("conversation") || pressureText.includes("reopened")) {
    return `end the review with one exact action before the old conversation gets another opening`;
  }
  return pickArea(stableHash(`${seed}|${pressure}|exact-action-v1`), [
    `turn the review into one exact action before ${pressure} gets another opening`,
    `make the review choose one exact action before ${pressure} opens the loop again`,
    `let the review end with one exact action that blocks ${pressure}'s next opening`
  ]);
}

function monthPracticalInterruptionLine(seed = 0, pressure = "") {
  const pressureText = String(pressure || "").toLowerCase();
  if (pressureText.includes("pause") || pressureText.includes("waiting")) {
    return `name the next practical interruption for ${pressure}: a shorter answer, a later hour, or a closed task`;
  }
  if (pressureText.includes("mood")) {
    return `name the next practical interruption for ${pressure}: one smaller answer, one timing edge, or one closed duty`;
  }
  return pickArea(stableHash(`${seed}|${pressure}|practical-interruption-v1`), [
    `name the next practical interruption for ${pressure}: shorter answer, later hour, or closed task`,
    `give ${pressure} one practical interruption: shorter reply, later timing, or a closed task`,
    `choose the interruption for ${pressure}: smaller answer, clearer hour, or one duty closed`
  ]);
}

function readableArea(area, seed = 0, name = "") {
  const lower = String(area || "").toLowerCase();
  const salt = stableHash(`${seed}|${name}|${lower}|area-v2`);
  if (lower.includes("unfinished work")) return pickArea(salt, ["unfinished work and personal authority", "the unfinished work pattern", "personal authority and open tasks", "the open-duty pressure", "work left open and self-trust"]);
  if (lower.includes("money")) return pickArea(salt, ["money, restraint, and self-respect", "the money question and self-respect", "financial pressure and measured care", "spending choices and self-respect", "money pressure and practical care"]);
  if (lower.includes("relationship")) return pickArea(salt, ["relationship timing", "closeness, timing, and unsaid needs", "relationship access and emotional pacing", "emotional timing and clean access", "closeness with clearer timing"]);
  if (lower.includes("family")) return pickArea(salt, [
    "family duty and private fatigue",
    "family care and hidden tiredness",
    "home responsibility and quiet resentment",
    "family expectations and body tiredness",
    "home duty and the unspoken cost",
    "care at home and private depletion",
    "family pressure and the need for a cleaner edge"
  ]);
  if (lower.includes("health")) {
    const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    return pickArea(stableHash(`${seed}|${name}|${lower}|health-area-v3`) + nameOffset, [
      "body rhythm and recovery",
      "health rhythm and daily repair",
      "body timing and sustainable care",
      "energy rhythm and practical recovery",
      "daily body timing and repair",
      "sustainable care and body rhythm"
    ]);
  }
  if (lower.includes("public") || lower.includes("ambition")) {
    const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    return pickArea(stableHash(`${seed}|${name}|${lower}|public-area-v3`) + nameOffset, [
      "visible work",
      "public effort",
      "earned proof",
      "recognition timing",
      "reviewable effort",
      "visible ambition"
    ]);
  }
  if (lower.includes("creative") || lower.includes("visibility")) return pickArea(salt, ["early visibility", "creative visibility and unfinished drafts", "expression, visibility, and the first version", "visible expression and first drafts"]);
  if (lower.includes("friendship") || lower.includes("belonging")) return pickArea(salt, ["belonging pressure and social access", "friendship timing and access", "belonging and clean access", "social timing and steadier access"]);
  if (lower.includes("sleep") || lower.includes("closure")) {
    const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    return pickArea(stableHash(`${seed}|${name}|${lower}|sleep-area-v3`) + nameOffset, [
      "closure, sleep, and unfinished meaning",
      "sleep and the open loop",
      "rest and the meaning still left open",
      "evening closure and body rest",
      "night closure and one unfinished task",
      "sleep timing and the open note"
    ]);
  }
  if (lower.includes("learning") || lower.includes("discipline")) return pickArea(seed, [
    "discipline and scattered attention",
    "learning rhythm and scattered focus",
    "repeatable effort",
    "study rhythm and practical concentration",
    "focus, repetition, and unfinished learning",
    "daily discipline and mental steadiness",
    "learning pace and attention repair",
    "the study pattern and scattered effort"
  ]);
  if (lower.includes("home")) return pickArea(salt, ["home rhythm and emotional privacy", "home order and private pressure", "domestic rhythm and inner privacy", "home patterns and quiet pressure"]);
  if (lower.includes("conversation")) return pickArea(seed, [
    "the inner loop",
    "private dialogue",
    "the recurring self-talk",
    "the mental loop",
    "the unfinished conversation",
    "the returning thought",
    "the private reply loop"
  ]);
  return safePhrase(area || "responsibility, timing, and emotional steadiness");
}

function anchorPhrase(text, seed = 0, name = "") {
  const value = lowerFirst(safePhrase(text || "one practical detail that keeps returning"));
  const salt = stableHash(`${seed}|${name}|${value}|anchor`);
  if (value.includes("available") && value.includes("reachable")) {
    return pickArea(salt, [
      "the line between being available and being reachable",
      "the moment availability starts pretending to be care",
      "the reachability rule that needs a clearer edge",
      "the access limit between honest care and constant availability",
      "the place where reachable has become too expensive",
      "the difference between useful access and automatic availability"
    ]);
  }
  if (value.includes("message") && value.includes("edited")) {
    return pickArea(salt, [
      "the message that has been edited too many times",
      "the reply waiting for a cleaner time instead of louder wording",
      "the sentence that needs a boundary more than another revision",
      "the message asking for timing, not more polish",
      "the reply that should become shorter before it becomes heavier"
    ]);
  }
  if (value.includes("task") && (value.includes("unnamed") || value.includes("heavier"))) {
    const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    return pickArea(stableHash(`${salt}|task-name-anchor-v2`) + nameOffset, [
      "the unnamed task",
      "the task that needs a visible name",
      "the over-weighted duty",
      "the task asking for a smaller edge",
      "the open duty that needs one clean label",
      "the duty waiting for a usable name",
      "the task that needs one honest label"
    ]);
  }
  if (value.includes("tab") || value.includes("bill") || value.includes("receipt")) {
    return pickArea(salt, [
      "the tab, bill, or receipt that keeps reopening in the mind",
      "the account detail needing a decision",
      "the payment or task detail that needs a clean place",
      "the open tab where money, timing, or duty keeps returning",
      "the receipt-like thought that needs one visible action"
    ]);
  }
  if (value.includes("private standard")) {
    return pickArea(salt, [
      "the private standard no one else can see",
      "the unseen rule that keeps raising the finish line",
      "the quiet standard that needs a visible limit",
      "the hidden measure that has been making the task heavier",
      "the private rule that should become simpler on paper"
    ]);
  }
  if (value.includes("first yes") || (value.includes("yes") && value.includes("cost"))) {
    return pickArea(stableHash(`${salt}|first-yes-v2`), [
      "the costly yes",
      "the yes that needs a smaller shape",
      "the expensive yes before it becomes duty",
      "the yes that should be measured first",
      "the yes asking for a cleaner edge"
    ]);
  }
  if (value.includes("conversation") && value.includes("clean time")) {
    return pickArea(stableHash(`${salt}|conversation-clean-time-v3`) + stableHash(name), [
      "the conversation that needs a clean time, not a louder tone",
      "the talk that needs a time boundary before it needs intensity",
      "the conversation that needs a doorway more than volume",
      "the reply window that can keep the conversation honest",
      "the conversation that should be scheduled before it gets heavier",
      "the doorway conversation that needs timing first",
      "the talk that needs one doorway and one quieter hour"
    ]);
  }
  if (value.includes("promise") && value.includes("smaller")) {
    return pickArea(salt, [
      "the promise that becomes easier once it is made smaller",
      "the smaller promise that can actually hold its shape",
      "the promise asking for a tighter finish line",
      promiseSmallerAnchor(seed, name),
      "the promise that should shrink until follow-through is visible"
    ]);
  }
  if (value.includes("delay") && value.includes("rejection")) {
    return pickArea(stableHash(`${salt}|delay-rejection-v2`), [
      "the moment a small delay starts sounding like rejection",
      "the delay that needs facts before meaning grows",
      "the waiting point that should not become a verdict",
      "the slow answer that needs facts before meaning",
      "the delay that should stay practical before it becomes personal",
      "the pause that should not be asked to prove rejection",
      "the waiting space that needs a plain fact",
      "the unanswered moment that needs less meaning",
      "the quiet gap that should stay factual",
      "the slow reply that needs a smaller story",
      "the pause before rejection becomes the explanation",
      "the unanswered space that should keep its facts"
    ]);
  }
  return value;
}

function promiseSmallerAnchor(seed = 0, name = "") {
  return pickArea(stableHash(`${seed}|${name}|promise-smaller-anchor-v2`), [
    "the promise that needs a cleaner edge before it grows",
    "the follow-through line that should stay smaller",
    "the commitment asking for a visible finish, not more words",
    "the smaller duty that can prove care through completion",
    "the promise that needs one kept edge before explanation"
  ]);
}

function pickArea(seed, variants) {
  return variants[mod(seed, variants.length)];
}

function paidCost(context = {}, seed = 0, name = "") {
  const knot = String(context.emotionalKnot || "").toLowerCase();
  const salt = stableHash(`${seed}|${name}|${knot}|cost`);
  if (knot.includes("delay")) return pickArea(salt, [
    "delay-as-rejection",
    "letting waiting sound like refusal",
    "turning a slow answer into proof",
    "hearing delay as a verdict before the facts arrive",
    "letting response time carry more meaning than the facts",
    "making the pause answer for the whole relationship",
    "treating a late reply as evidence before behavior arrives"
  ]);
  if (knot.includes("responsibility")) return pickArea(salt, ["using responsibility as proof of love", "making duty prove affection", responsibilityReceiptPhrase(seed, name), "letting obligation stand in for tenderness"]);
  if (knot.includes("self-respect")) return pickArea(salt, [
    "letting another person's softness set the price of self-respect",
    "pricing self-respect through someone else's warmth",
    "letting another person's tone steer the limit",
    "allowing someone else's tone to steer the limit",
    "making another person's gentleness the cost of self-respect",
    "kindness approving limits",
    "asking another person's warmth to approve self-respect",
    "letting the boundary depend on someone else's tenderness",
    "outsourced self-respect"
  ]);
  if (knot.includes("unfinished work")) return pickArea(stableHash(`${seed}|${name}|${knot}|unfinished-work-cost-v2`) + stableHash(name), [
    "turning unfinished work into a private verdict",
    "making the unfinished piece feel personal",
    "letting an open task judge your worth",
    "treating one unfinished piece as the whole report",
    "asking an open task to describe the whole day",
    "letting unfinished work speak louder than the facts",
    "making one incomplete task carry the verdict"
  ]);
  if (knot.includes("available")) return pickArea(salt, ["staying reachable past the point where care still feels honest", "remaining available after care has lost its clean shape", "treating constant access as proof of care", "letting availability continue after honesty has thinned"]);
  if (knot.includes("certainty")) return pickArea(salt, ["asking uncertain people to become your proof", "using uncertain people as the source of certainty", "waiting for unclear people to steady the day", "making someone else's clarity carry your proof"]);
  if (knot.includes("understood")) return understoodCostPhrase(salt);
  return pickArea(stableHash(`${salt}|fallback-cost-v2`), [
    "turning a practical duty into emotional negotiation",
    "making one ordinary task carry too much private meaning",
    "letting a simple duty ask for emotional proof",
    "turning a small responsibility into a verdict on care",
    "asking an everyday task to settle a larger feeling",
    "letting the practical detail borrow too much emotional weight"
  ]);
}

function understoodCostPhrase(seed) {
  const opening = [
    "asking for understanding",
    "wanting recognition",
    "explaining the feeling",
    "needing to be heard",
    "looking for agreement",
    "using explanation",
    "seeking reassurance",
    "trying to earn clarity"
  ][mod(stableHash(`${seed}|open`), 8)];
  const middle = [
    "before the message has a clean shape",
    "before the boundary is named",
    "before the next sentence is clear",
    "before the request becomes simple",
    "before the point is fully named",
    "before the choice has a container"
  ][mod(stableHash(`${seed}|middle`), 6)];
  const close = [
    "from someone else's reaction",
    "through one more explanation",
    "by making the room agree first",
    "before the useful sentence has somewhere to land",
    "rather than giving the request a clear shape",
    "before the actual request is allowed to stay simple",
    "while the clean boundary is still waiting for a place",
    "instead of letting one sentence carry the request",
    "before one practical shape is allowed to hold it",
    "when a smaller shape would keep the request honest"
  ][mod(stableHash(`${seed}|close-v3`), 10)];
  return `${opening} ${middle} ${close}`;
}

function responsibilityReceiptPhrase(seed = 0, name = "") {
  return pickArea(stableHash(`${seed}|${name}|responsibility-receipt-v2`), [
    "treating responsibility like proof of care",
    "making duty carry the receipt for tenderness",
    "asking responsibility to prove love before facts arrive",
    "letting duty stand in for visible care",
    "turning responsibility into the evidence for care"
  ]);
}

function mentorMovePhrase(text, seed = 0) {
  const value = lowerFirst(safePhrase(text || "make the promise smaller and keep it completely"));
  if (value.includes("shape") && value.includes("limit")) {
    return pickArea(seed, [
      "let care arrive with a shape and a limit",
      "give care timed edges",
      "make care visible through one shaped limit",
      "let care become specific before it becomes available"
    ]);
  }
  if (value.includes("consistency") && value.includes("volume")) {
    return pickArea(seed, [
      "let respect show through consistency, not volume",
      "prove respect through steady action instead of louder effort",
      "keep respect visible through repetition, not intensity"
    ]);
  }
  if (value.includes("tiredness") && value.includes("intuition")) {
    return pickArea(seed, [
      "pause before making tiredness sound like intuition",
      "check the body before calling fatigue a message",
      "separate tiredness from guidance before choosing words"
    ]);
  }
  if (value.includes("promise") && value.includes("smaller")) {
    return pickArea(seed, [
      "make the promise smaller and keep it completely",
      "reduce the promise until it can be kept cleanly",
      "choose a smaller promise with a real finish",
      "make a plain promise today",
      "shrink the promise until follow-through becomes visible"
    ]);
  }
  if (value.includes("private worry") && value.includes("scheduled action")) {
    return pickArea(seed, [
      "turn one private worry into a scheduled action",
      "give the private worry a visible appointment",
      "move one private worry into the calendar",
      "turn the hidden worry into one timed action",
      "schedule the worry as a task instead of carrying it"
    ]);
  }
  if (value.includes("unnecessary explanation")) {
    return pickArea(seed, [
      "remove one spare explanation from the plan",
      "let the plan work with fewer explanations",
      "cut one extra explanation before acting",
      "make the plan visible without another defense",
      "finish the useful part before explaining again",
      "keep the plan lean enough to follow"
    ]);
  }
  if ((value.includes("protect") && value.includes("useful work")) || value.includes("emotional noise")) {
    return pickArea(stableHash(`${seed}|${value}|useful-work-mentor-v1`), [
      "keep useful work inside one quiet boundary",
      "let useful work finish before emotion edits it",
      "give the useful task a clean edge before the mood speaks",
      "protect the work by closing one factual piece first",
      "keep the work steady while extra emotion waits"
    ]);
  }
  return value;
}

function workSignalPhrase(text, seed = 0, name = "") {
  const value = lowerFirst(safePhrase(text || "make the action plain enough to complete"));
  const salt = stableHash(`${seed}|${name}|${value}|work`);
  if (value.includes("useful draft") || (value.includes("draft") && value.includes("improv"))) {
    return pickArea(salt, [
      "finish one useful draft before improving it",
      "make the first draft usable before polishing",
      "close the useful draft before editing begins",
      "let the draft become real before it becomes refined",
      "put one workable version ahead of polish",
      "make the rough version visible before improving it",
      "finish the usable version before judging style"
    ]);
  }
  if (value.includes("practical question")) {
    const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    return pickArea(stableHash(`${seed}|${name}|${value}|practical-question-work-v2`) + nameOffset, [
      "answer the practical part first",
      "solve the factual part before the emotional one",
      "let the real-world question go first",
      "turn the practical question into the opening move",
      "start with the part that can be verified",
      "give the factual question the first clean answer",
      "put the useful question before the story"
    ]);
  }
  if (value.includes("planning") && value.includes("proving")) {
    return pickArea(stableHash(`${seed}|${name}|${value}|planning-proving-work-v2`) + stableHash(name), [
      "separate planning from proving",
      "let planning finish before proving begins",
      "keep the plan tied to facts before emotion edits it",
      "make planning useful instead of performative",
      "put the factual plan ahead of the proof loop",
      "let the next task answer before proving starts"
    ]);
  }
  if (value.includes("complete") && value.includes("task") && (value.includes("deadline") || value.includes("name"))) {
    const nameOffset = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    return pickArea(stableHash(`${seed}|${name}|${value}|named-deadline-work-v1`) + nameOffset, [
      "name the task and give it a deadline",
      "close the task with a label and time edge",
      "give the task a name, deadline, and finish",
      "make the task specific enough to close",
      "turn the task into one named finish"
    ]);
  }
  if (value.includes("depth") && value.includes("scattered")) {
    return pickArea(salt, [
      "choose depth over scattered effort",
      "give the deep task priority over scattered effort",
      "let one deeper task beat scattered movement",
      "make depth visible before attention splits"
    ]);
  }
  if (value.includes("protect") && value.includes("unnecessary explanation")) {
    return pickArea(salt, [
      "protect the work",
      "keep explanation outside",
      "time-box explanation",
      "finish before explaining",
      "close useful work",
      "make work visible"
    ]);
  }
  if (value.includes("enough information") || value.includes("close the loop")) {
    return pickArea(salt, [
      "close the loop that already has enough information",
      "finish the loop whose facts are already available",
      "close the task with facts already in hand",
      "complete the practical loop before asking for more context",
      "finish the open thread with the facts already in hand"
    ]);
  }
  if (value.includes("vague plan") || value.includes("visible appointment")) {
    return pickArea(salt, [
      "turn the vague plan into one visible appointment",
      "put the plan on tomorrow's calendar",
      "give the uncertain plan a time, place, and first action",
      "move the plan from thought into one scheduled block",
      "make the loose plan visible enough to keep",
      "give the plan a real appointment instead of another rehearsal",
      "turn the undefined plan into one dated action"
    ]);
  }
  return value;
}

function softenRepeatedThemePhrases(text) {
  const replacements = [
    ["creative visibility and unfinished drafts", "the creative pattern"],
    ["visible expression and first drafts", "the first-draft pattern"],
    ["family duty and private fatigue", "the family-duty pattern"],
    ["care at home and private depletion", "the home-care pattern"],
    ["recognition timing and visible effort", "the recognition pattern"],
    ["rest and the meaning still left open", "the rest-and-closure pattern"],
    ["energy rhythm and practical recovery", "the body-rhythm pattern"],
    ["ambition, visibility, and earned proof", "the visibility pattern"]
  ];
  let output = String(text || "");
  for (const [phrase, substitute] of replacements) {
    let seen = 0;
    output = output.replace(new RegExp(escapeRegex(phrase), "gi"), (match) => {
      seen += 1;
      if (seen <= 2) return match;
      return substitute;
    });
  }
  return output;
}

function avoidPressurePhrase(text, seed = 0, name = "") {
  const value = lowerFirst(safePhrase(text || "over-explaining"));
  const salt = `${seed}|${name}|${value}`;
  if (value.includes("discomfort") || (value.includes("fix") && value.includes("someone"))) {
    return pickArea(stableHash(`${salt}|avoid-discomfort-v2`), [
      "rushing toward repair before the real request is clear",
      "turning someone else's discomfort into your assignment",
      "making another person's discomfort your deadline",
      "treating discomfort as a command to rescue",
      "urgency borrowing care early",
      "answering discomfort before the boundary is visible",
      "taking over the repair before the need is named",
      "letting someone else's unease choose the pace"
    ]);
  }
  if (value.includes("checking") || value.includes("signs")) {
    return [
      "checking every small change for proof",
      "reading each minor shift as a verdict",
      "asking tiny changes to prove the outcome",
      "searching small details for confirmation",
      "turning little movements into evidence",
      "treating every delay like a message",
      "asking the day for one more sign",
      "letting small changes become a forecast",
      "using tiny shifts as emotional proof",
      "reopening the question through every detail",
      "asking the next detail to prove the whole answer",
      "turning each small sign into a private forecast"
    ][mod(stableHash(`${salt}|signs-v2`) + stableHash(name), 12)];
  }
  if (value.includes("explanation") && value.includes("decision")) {
    return pickArea(stableHash(`${salt}|decision-explanation-v2`), [
      "using explanation as a substitute for a decision",
      "explaining past the point where choice is needed",
      "turning one decision into another explanation",
      "letting explanation delay the clean choice",
      "making the explanation carry the choice too long",
      "asking another explanation to do the decision's work",
      "keeping the choice open through extra reasoning"
    ]);
  }
  if (value.includes("reopening a settled conversation") || value.includes("settled conversation")) {
    return pickArea(stableHash(`${salt}|settled-conversation-v1`) + stableHash(name), [
      "the reopened conversation",
      "the old conversation asking to return",
      "the settled talk reopening",
      "old conversation asking again",
      "old proof thread returning",
      "a closed conversation asking for another round"
    ]);
  }
  if (value.includes("access") || value.includes("available") || value.includes("availability") || value.includes("reachable")) {
    return pickArea(stableHash(`${salt}|availability-avoid-v2`), [
      "making constant access the test",
      "letting availability run ahead of the limit",
      "turning reachability into emotional proof",
      "asking access to prove care too early",
      "letting availability become the measure",
      "keeping the door open after timing is already clear",
      "using constant reachability as proof",
      "letting access replace a real boundary",
      "making availability carry the relationship test",
      "answering through access before timing is named",
      "letting the open door stand in for care",
      "making timing prove itself through reachability"
    ]);
  }
  if (value.includes("delay") && value.includes("verdict")) {
    return pickArea(seed, [
      "turning every delay into a private verdict",
      "letting delay pretend to be proof",
      "making waiting sound like rejection",
      "treating a slow answer as the whole answer"
    ]);
  }
  if (value.includes("tiredness") && value.includes("doubt")) {
    return pickArea(seed, [
      "turning tiredness into doubt",
      "letting fatigue rewrite the facts",
      "exhaustion acting like warning",
      "using a tired mood as the final judge"
    ]);
  }
  if (value.includes("small mess") || value.includes("whole identity")) {
    return pickArea(stableHash(`${salt}|small-mess-v3`) + stableHash(name), [
      "letting one small mess speak for the whole room",
      "making a small mess stand in for the whole self",
      "treating a loose detail like a full identity report",
      "giving one visible mess too much authority",
      "turning a small disorder into a larger self-story",
      "asking one messy detail to describe everything",
      "letting a loose corner become the room's verdict",
      "turning one unfinished detail into a self-verdict",
      "making a small disorder sound like a larger truth",
      "letting one untidy corner argue with self-respect",
      "asking a loose detail to explain the entire room",
      "letting small disorder become a private accusation"
    ]);
  }
  if (value.includes("mood") && (value.includes("responsible") || value.includes("whole day"))) {
    return pickArea(stableHash(`${salt}|mood-responsibility-v1`) + stableHash(name), [
      "letting one mood explain the whole day",
      "making a single mood carry the day",
      "turning one mood into the room's verdict",
      "asking one feeling to manage the whole day",
      "giving one mood responsibility for every detail",
      "letting the whole-day mood story take over"
    ]);
  }
  return value;
}

function monthStructure(context = {}, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  const pickStructure = (key, variants) => pickArea(stableHash(`${seed}|month-structure|${key}|${area}`), variants);
  if (area.includes("money")) return pickStructure("money", [
    "build a weekly money review before emotion gets to rename restraint as fear",
    "give money one weekly page before worry turns restraint into a verdict",
    "make the money review visible before emotion starts changing the numbers"
  ]);
  if (area.includes("relationship")) return pickStructure("relationship", [
    "give replies a visible timing rule before closeness becomes constant access",
    "make closeness answer through timing before every reply becomes proof",
    "let relationship pressure meet one weekly timing boundary"
  ]);
  if (area.includes("family")) return pickStructure("family", [
    "separate helpfulness from rescue through one repeating household or family limit",
    "let one family limit repeat before helpfulness becomes rescue again",
    "make household care visible without turning every duty into rescue"
  ]);
  if (area.includes("health")) return pickStructure("health", [
    "let food, sleep, and movement become the calendar before pressure becomes interpretation",
    "give the body one weekly rhythm before pressure starts explaining everything",
    "make rest, food, and movement visible before the mood gets to interpret the week"
  ]);
  if (area.includes("public") || area.includes("ambition")) return pickStructure("public", [
    "make visible work measurable before recognition gets to decide your confidence",
    "let public effort answer through proof before recognition becomes the judge",
    ambitionMonthStructure(seed, area)
  ]);
  if (area.includes("creative") || area.includes("visibility")) return pickStructure("creative", [
    "schedule imperfect expression before comparison drains the first version",
    "give the rough version a weekly doorway before comparison edits it into silence",
    "make one visible draft survive the week before the inner critic asks for polish"
  ]);
  if (area.includes("friendship") || area.includes("belonging")) return pickStructure("belonging", [
    "make belonging prove itself through timing, not constant availability",
    "let friendship show through rhythm before availability becomes the test",
    "give belonging one repeatable boundary before closeness starts asking for proof"
  ]);
  if (area.includes("sleep") || area.includes("closure")) return pickStructure("sleep", [
    "close one mental loop each week before sleep becomes the storage place",
    "give sleep one closed decision before the night starts holding unfinished work",
    "make closure visible before the mind brings the same tab to bed"
  ]);
  return pickStructure("default", [
    "turn the repeating pressure into one visible weekly system",
    "give the pressure one weekly container that can be reviewed",
    "make the recurring theme visible before the month turns it into mood"
  ]);
}

function ambitionMonthStructure(seed = 0, area = "") {
  return pickArea(stableHash(`${seed}|${area}|ambition-month-structure-v2`), [
    "give ambition one weekly finish before comparison gets a vote",
    "make one public effort measurable before recognition enters",
    "let visible work leave a weekly proof before comparison starts",
    "choose one ambition marker the week can verify before praise arrives",
    "give recognition timing a finished work cue to inspect"
  ]);
}

function reviewAnchor(context = {}, seed = 0) {
  const body = String(context.bodySignal || "").toLowerCase();
  if (body.includes("eat") || body.includes("food")) return "a meal and one written limit";
  if (body.includes("water") || body.includes("drink")) return "water and one clean sentence";
  if (body.includes("walk") || body.includes("movement")) return "a short walk and one clean sentence";
  if (body.includes("sleep")) return "an earlier closing time and one written limit";
  if (body.includes("message") || body.includes("screen")) {
    return pickArea(stableHash(`${seed}|${body}|screen-review-v3`), [
      `the ${body || "message"} cue and one clean reply`,
      screenReviewPauseLine(seed, body),
      "one phone-free pause and a smaller sentence",
      "the screen set aside and one practical line",
      "a delayed message window and one sentence with edges"
    ]);
  }
  if (body.includes("jaw") || body.includes("shoulder")) return "the shoulder or jaw cue and one written limit";
  return "one body cue and one written limit";
}

function screenReviewPauseLine(seed = 0, body = "") {
  const bodyText = String(body || "").toLowerCase();
  if (bodyText.includes("message")) return "a message pause and one reply with edges";
  if (bodyText.includes("screen")) return "one screen-free pause and a reply with edges";
  return pickArea(stableHash(`${seed}|${body}|screen-review-pause-v1`), [
    "a short screen pause and one reply with edges",
    "one screen pause and a practical reply",
    "a phone-free pause with one edged reply"
  ]);
}

function bodyPractice(text, seed = 0) {
  const value = lowerFirst(safePhrase(text || "let the body settle before choosing words"));
  if (!value) return "one body cue and one written limit";
  if (value.startsWith("do not ")) {
    const action = value.replace(/^do not\s+/i, "");
    if (action.includes("exhaustion")) {
      return [
        "checking exhaustion before treating it as truth",
        "letting exhaustion lose its vote before the reply",
        "declining the argument exhaustion wants to start",
        "placing one body fact between tiredness and decision",
        "resting before exhaustion gets to explain the whole day"
      ][mod(stableHash(`${seed}|${action}|exhaustion-practice`), 5)];
    }
    return [
      `declining the urge to ${action}`,
      `putting one pause before the habit to ${action}`,
      `letting the body settle before ${action}`,
      `using one written limit instead of trying to ${action}`
    ][mod(stableHash(`${seed}|${action}|do-not-practice`), 4)];
  }
  if (value.startsWith("eat ")) {
    const foodCue = value.replace(/^eat\b/i, "eating");
    return [
      foodCue,
      "putting food before the difficult conversation",
      "letting a meal come before the harder reply",
      "checking hunger before choosing the tone",
      "using food as the first boundary before the exchange"
    ][mod(stableHash(`${seed}|${value}|food-practice`), 5)];
  }
  if (value.includes("screen")) {
    return [
      "stepping away before the screen chooses the tone",
      "putting the screen down before words get selected",
      "leaving the screen before the reply gets a mood",
      "giving the eyes a break before choosing words",
      "using a screen pause before the reply"
    ][mod(stableHash(`${seed}|${value}|screen-practice-v2`), 5)];
  }
  if (value.includes("breath") && value.includes("movement")) {
    return [
      "starting with breath before judgment",
      "using food or movement before judgment",
      "letting breath check the first reaction",
      "placing movement before the verdict",
      "giving the body one cue before judgment"
    ][mod(stableHash(`${seed}|${value}|breath-movement`), 5)];
  }
  if (value.startsWith("leave ")) {
    const leaveCue = value.replace(/^leave\b/i, "leaving");
    if (value.includes("screen")) {
      return [
        leaveCue,
        "stepping away before the screen chooses the tone",
        "putting the screen down before words get selected",
        "leaving the screen before the reply gets a mood",
        "giving the eyes a break before choosing words"
      ][mod(stableHash(`${seed}|${value}|screen-practice`), 5)];
    }
    return leaveCue;
  }
  if (value.startsWith("walk ")) return value.replace(/^walk\b/i, "walking");
  if (value.startsWith("drink ")) {
    return [
      value.replace(/^drink\b/i, "drinking"),
      "taking water before treating a mood as guidance",
      "using water as the first check before interpretation",
      "pausing with water before deciding what the body means",
      "letting water slow the story before the next choice"
    ][mod(stableHash(`${seed}|${value}|water`), 5)];
  }
  if (value.startsWith("lower ")) return value.replace(/^lower\b/i, "lowering");
  if (value.startsWith("protect ")) {
    if (value.includes("sleep")) {
      return [
        "protecting sleep first",
        "closing the day before another check",
        "letting sleep outrank the extra review",
        "sleep first",
        "ending the check before sleep gets traded away"
      ][mod(stableHash(`${seed}|${value}|sleep-protect`), 5)];
    }
    return value.replace(/^protect\b/i, "protecting");
  }
  if (value.startsWith("notice ")) return value.replace(/^notice\b/i, "noticing");
  if (value.startsWith("step ")) return value.replace(/^step\b/i, "stepping");
  if (value.startsWith("start ")) return value.replace(/^start\b/i, "starting");
  if (value.startsWith("let ")) {
    if (value.includes("body") && value.includes("neutral")) {
      return [
        "giving the body one neutral pause",
        "letting the body settle before the reply",
        "placing one quiet body cue before the answer",
        "using a neutral pause before choosing words"
      ][mod(stableHash(`${seed}|${value}|neutral-body`), 4)];
    }
    return value.replace(/^let\b/i, "letting");
  }
  if (value.includes("protecting sleep") || value.includes("sleep matters")) {
    return [
      "protecting sleep first",
      "closing the day before another check",
      "letting sleep outrank the extra review",
      "sleep first",
      "ending the check before sleep gets traded away"
    ][mod(stableHash(`${seed}|${value}|sleep-check`), 5)];
  }
  return value;
}

function relationPhrase(text, seed = 0, name = "") {
  const value = lowerFirst(safePhrase(text || "do not turn another person's uncertainty into your assignment"));
  const salt = stableHash(`${seed}|${name}|${value}|relationship-v2`);
  if (value.includes("discomfort") || (value.includes("fix") && value.includes("someone"))) {
    return pickArea(stableHash(`${salt}|discomfort-v2`), [
      "notice discomfort without becoming the repair",
      "offer care without turning discomfort into your task",
      "let discomfort stay with the person carrying it",
      "keep another person's discomfort out of your job description",
      "do not rush to repair a feeling that is not yours",
      "let care stay present without taking over the discomfort",
      "answer pain with warmth, not automatic rescue",
      "keep support clear of the urge to fix everything"
    ]);
  }
  if (value.includes("uncertainty")) return pickArea(stableHash(`${salt}|uncertainty-v3`) + stableHash(name), [
    "leave uncertainty with the person who owns it",
    "do not carry another person's uncertainty as your assignment",
    "let unclear people keep the weight of being unclear",
    "answer only the part that belongs to you",
    "let the unclear answer stay outside your job",
    "keep another person's mixed signal from becoming your duty",
    "offer warmth without adopting the confusion"
  ]);
  if (value.includes("warmth")) return pickArea(salt, ["give warmth a time and a doorway", "time warmth cleanly", "keep warmth generous without permanent access", "let warmth stay kind without becoming constant access"]);
  if (value.includes("shorter")) return pickArea(stableHash(`${salt}|shorter-reply-v2`), [
    "shrink the reply",
    "answer today's part",
    "use fewer words",
    "let timing lead",
    "keep proof out",
    "choose the smaller answer"
  ]);
  if (value.includes("kind no")) return pickArea(salt, ["let a kind no protect trust before resentment starts", "use a kind no while trust is still intact", "make the no early enough that care can stay clean", "say no while the tone can still stay warm"]);
  if (value.includes("behavior")) return pickArea(stableHash(`${salt}|behavior-v2`), [
    "wait for behavior before treating words as proof",
    "let behavior confirm the promise before spending more trust",
    "ask actions to carry proof before words receive full credit",
    "let the promise earn trust through behavior first",
    "give behavior the job of proving what words began",
    "spend trust after behavior has carried the promise",
    "let steady action speak before trust gets extended",
    "ask behavior to make the promise visible"
  ]);
  if (value.includes("listening")) return pickArea(stableHash(`${salt}|listening-v3`), [
    listeningConsequencePhrase(seed, name),
    "hear the feeling without adopting the whole consequence",
    "keep listening present without becoming the rescue plan",
    "let the other person be heard without handing over the whole outcome",
    "receive the feeling, then leave the consequence where it belongs",
    "hear request, keep your part",
    "hear the point without becoming responsible for the aftermath",
    "let the feeling be heard before deciding what actually belongs to you"
  ]);
  if (value.includes("needed")) return pickArea(salt, ["do not confuse being needed with being chosen", "separate being useful from being chosen", "let neediness prove need, not commitment", "keep usefulness from pretending to be commitment"]);
  if (value.includes("closeness")) return pickArea(stableHash(`${salt}|closeness`), [
    "give closeness a doorway instead of leaving every window open",
    "let closeness enter through timing, not constant access",
    "keep closeness bounded",
    closenessTimedPhrase(seed, name),
    "let access wait for timing before closeness expands",
    "keep closeness protected by one honest boundary",
    "give access a time so closeness stays clean",
    "let timing protect closeness from constant availability",
    "keep the doorway clear before offering more access",
    "make closeness warm, timed, and easier to trust",
    "let the next boundary keep closeness honest",
    "give closeness a timed limit before access becomes automatic",
    "let access become earned before closeness widens",
    "keep closeness honest by giving access a clean edge",
    "make the next access point smaller than the feeling"
  ]);
  return value;
}

function listeningConsequencePhrase(seed = 0, name = "") {
  return pickArea(stableHash(`${seed}|${name}|listening-consequence-v2`), [
    "listen without carrying the whole consequence",
    "hear the feeling and leave the outcome where it belongs",
    "keep listening warm without adopting every result",
    "receive the point without making aftermath your duty",
    "let the request be heard before choosing your actual part"
  ]);
}

function closenessTimedPhrase(seed = 0, name = "") {
  return pickArea(stableHash(`${seed}|${name}|closeness-timed-v2`), [
    "make closeness warm, timed, and easier to trust",
    "give closeness a clear hour before access widens",
    "keep closeness honest with timing instead of constant access",
    "let closeness stay kind by giving access a clean edge",
    "make the next access point smaller than the feeling"
  ]);
}

function focusCue(context = {}, seed = 0) {
  const move = mentorMovePhrase(context.mentorMove || context.stabilizer || "make one promise visible", seed);
  const cue = cueFromPhrase(phraseVariant(move, seed, "focus"), "Make one promise visible");
  return trimCue(cue, seed);
}

function watchCue(context = {}, seed = 0, name = "") {
  const avoid = avoidPressurePhrase(context.avoid || "over-explaining under pressure", seed, name);
  const cue = cueFromPhrase(phraseVariant(avoid, seed, "watch"), "Over-explaining under pressure");
  return trimCue(cue, seed + stableHash(name));
}

function cueFromPhrase(text, fallback) {
  const value = String(text || fallback || "").replace(/[.!?]+$/g, "").trim();
  if (!value) return fallback;
  if (/^(make|answer|turn|let|choose|pause|remove|give|protect|finish|close|wait|decline|name)\b/i.test(value)) {
    return capitalize(value);
  }
  return capitalize(value);
}

function trimCue(text, seed = 0) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    const suffix = [
      "under pressure today",
      "asking for attention",
      "getting loud again",
      "needing a smaller edge",
      "before the next reply"
    ][mod(stableHash(`${seed}|${text}|cue-suffix-v2`), 5)];
    return `${text} ${suffix}`.trim();
  }
  if (words.length <= 12) return text;
  return words.slice(0, 12).join(" ");
}

function paidSeed(user = {}, context = {}) {
  return stableHash([
    user.id,
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    context.dailyArea,
    context.dailyLunarMansion?.name,
    context.dailyLunarMansion?.pada,
    context.dailyLunarDay?.name,
    context.dailyLunarDay?.paksha,
    context.attentionAnchor,
    context.emotionalKnot,
    context.decisionGate,
    context.relationalCaution,
    context.workSignal,
    context.bodySignal
  ].filter(Boolean).join("|"));
}

function formatPaidLunarMansion(mansion = {}) {
  if (!mansion?.name) return "unknown";
  return `${mansion.name} pada ${mansion.pada || "unknown"}`;
}

function formatPaidLunarDay(lunarDay = {}) {
  if (!lunarDay?.name) return "unknown";
  return `${lunarDay.paksha || "unknown"} ${lunarDay.name}`;
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function mod(value, length) {
  return ((value % length) + length) % length;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safePhrase(text) {
  return String(text || "")
    .replace(/\bmay be\b/gi, "is")
    .replace(/\bmay\b/gi, "can")
    .replace(/\bmight\b/gi, "can")
    .replace(/\bcould\b/gi, "can")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}

function capitalize(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function lowerFirst(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}
