export function buildFallbackDeepGuidance(user = {}, context = {}) {
  const name = firstName(user.name);
  const seed = paidSeed(user, context);
  const scene = paidScene(context, seed);
  const area = readableArea(context.dailyArea, seed);
  const anchor = anchorPhrase(context.attentionAnchor || context.dailyScene || "one practical detail that keeps returning", seed, name);
  const move = mentorMovePhrase(context.mentorMove || context.stabilizer || "make the promise smaller and keep it completely", seed);
  const caution = relationPhrase(context.relationalCaution || context.relationshipMirror, seed);
  const avoid = avoidPressurePhrase(context.avoid || "over-explaining", seed, name);
  const bodyStart = bodyPractice(context.bodySignal, seed);
  const work = workSignalPhrase(context.workSignal || "make the action plain enough to complete", seed, name);
  const cost = paidCost(context, seed, name);
  const structure = monthStructure(context, seed);
  const review = reviewAnchor(context);

  return polishFallbackDeepGuidance({
    overview: pickOverview({ name, scene, area, anchor, move, caution, avoid, work, cost }, seed),
    thisWeek: pickThisWeek({ bodyStart, move, caution, avoid, work, name }, seed),
    thisMonth: pickThisMonth({ structure, area, anchor, avoid, name }, seed),
    practice: pickPractice({ review, bodyStart, move, name }, seed),
    focus: focusCue(context, seed),
    watch: watchCue(context, seed, name)
  }, name);
}

function polishFallbackDeepGuidance(guidance, name = "") {
  return {
    overview: polishGuidanceText(guidance.overview),
    thisWeek: removeSupportName(polishGuidanceText(guidance.thisWeek), name),
    thisMonth: removeSupportName(polishGuidanceText(guidance.thisMonth), name),
    practice: removeSupportName(polishGuidanceText(guidance.practice), name),
    focus: polishGuidanceText(guidance.focus),
    watch: polishGuidanceText(guidance.watch)
  };
}

function polishGuidanceText(text) {
  return String(text || "")
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
    .replace(/\s+/g, " ")
    .trim();
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

function paidScene(context = {}, seed = 0) {
  const raw = String(context.openingScene || context.dailyScene || context.attentionAnchor || "").toLowerCase();
  const pickScene = (key, variants) => pickArea(stableHash(`${seed}|scene|${key}|${raw}`), variants);
  if (raw.includes("water") || raw.includes("glass")) return pickScene("water", ["the water glass beside the first decision", "the first sip before the day speeds up", "the glass waiting near the work surface", "the small water break before the reply"]);
  if (raw.includes("calendar") || raw.includes("appointment") || raw.includes("deadline")) return pickScene("calendar", ["the calendar square that keeps shifting", "the appointment box asking for a cleaner boundary", "the deadline line that needs one honest shape", "the marked deadline"]);
  if (raw.includes("notebook") || raw.includes("page") || raw.includes("pen") || raw.includes("written")) return pickScene("notebook", ["the notebook line waiting beside the day", "the half-written page near the morning", "the pen mark that keeps asking for a finish", "the written line that needs fewer explanations"]);
  if (raw.includes("kitchen") || raw.includes("counter") || raw.includes("meal") || raw.includes("cup") || raw.includes("tea")) return pickScene("kitchen", ["the cup cooling near the counter", "the kitchen surface after the first meal", "the tea mark beside an unfinished thought", "the counter corner where the day pauses", "the plate or cup that keeps pulling attention back"]);
  if (raw.includes("wallet") || raw.includes("receipt") || raw.includes("payment") || raw.includes("money") || raw.includes("bill")) return pickScene("money", ["the receipt or small payment decision", "the bill line that needs a plain choice", "the wallet detail that should not become a mood", "the account note asking for one clean answer"]);
  if (raw.includes("chair") || raw.includes("room") || raw.includes("desk") || raw.includes("drawer") || raw.includes("laundry")) return pickScene("room", ["the room detail you keep passing", "the desk corner holding one unfinished loop", "the chair or drawer asking for a visible decision", "the room cue that keeps returning without words"]);
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
  if (raw.includes("list") || raw.includes("task") || raw.includes("draft") || raw.includes("work") || raw.includes("promise")) return pickScene("task", ["the task list with one unnamed item", "the draft line that should be made real", "the promise on the list without a finish", "the work note asking for a visible ending"]);
  if (raw.includes("tab") || raw.includes("worry") || raw.includes("thought") || raw.includes("mind")) return pickScene("mind", ["the mental tab that keeps reopening", "the thought loop asking for a written edge", "the worry line that needs a practical container", "the private tab that should be closed on paper"]);
  return pickScene("ordinary", ["one ordinary detail near the work", "the small cue waiting beside the next task", "the practical detail that keeps returning", "the unnoticed place where the day asks for order"]);
}

function pickOverview(parts, seed) {
  const { name, scene, area, anchor, move, caution, avoid, work, cost } = parts;
  const templates = [
    `${overviewPlainMarkerLine(seed, scene, area)} ${overviewCostSizeLine(seed, name, cost)} ${overviewContainerLine(seed, anchor)} Keep ${avoid} away from the next reply. In relationships, ${caution}; in work, ${work}. ${overviewProgressLine(seed, area)}`,
    `${capitalize(scene)} gives ${name} a practical doorway into ${area}. ${overviewEffortLine(seed, cost)} ${overviewVisibleAnchorLine(seed, anchor)} Let this rule lead: ${move}. Keep ${avoid} away from the next reply. In closeness, ${caution}. In work, ${work}. ${overviewEvidenceClose(seed, area, name)}`,
    `Begin at ${scene}; ${overviewEvidenceWeightLine(seed, name, area)} ${overviewTimingDrainLine(seed, cost)} ${overviewInspectableSequenceLine(seed, anchor)} Keep ${avoid} out of the decision. With people, ${caution}. With work, ${work}. ${overviewUrgencyClose(seed, area)}`,
    `${overviewUsefulEvidenceLine(seed, { name, scene, area, anchor, cost, move, caution, work })}`,
    `${overviewPaidMapLine(seed, { name, scene, area, cost, avoid, caution, work })}`,
    `${overviewMapOpening(seed, scene, area)} ${overviewCostCrowdLine(seed, name, cost)} ${overviewInspectLine(seed, anchor, name)} ${overviewManagerLine(seed, avoid, caution)} ${overviewWorkPracticalClose(seed, work)}`,
    `${overviewMethodOpening(seed, scene, area)} For ${name}, the drain is ${cost}; ${overviewSmallDutyLine(seed, cost)} ${overviewVisibleSequenceLine(seed, anchor)} Keep ${avoid} out of the review. With people, ${caution}. With work, ${work}. ${overviewRecordClose(seed, area)}`,
    `${overviewHandleCycleLine(seed, { name, scene, area, cost, anchor, avoid, caution, work })}`,
    `${overviewNoticeOpening(seed, name, scene, area)} ${overviewRepairLine(seed, cost)} ${overviewPlanLine(seed, anchor)} ${overviewAvoidLine(seed, avoid)} ${overviewRelationshipLine(seed, caution)} ${overviewWorkLine(seed, work)} ${overviewThreeMonthClose(seed)}`,
    `${overviewDeepPlacementOpening(seed, scene, name, area)} ${overviewHabitCostLine(seed, cost)} ${overviewThreeMonthVisibleLine(seed, area)} ${overviewSmallPromiseLine(seed, anchor)} ${overviewRuleLine(seed, move)} Keep the review clear of ${avoid}. With people, ${caution}. With work, ${work}. ${overviewCareProofLine(seed)}`,
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
    `Use ${scene} as ${name}'s handle for ${area}. The expensive part is ${cost}; the practical bill around ${cost} is charging attention. For the next cycle, put ${anchor} where the day can see it, give one boundary a sentence that can repeat, and close the task that can show progress today. Keep ${avoid} out of the tone. Let closeness practice ${caution}. Let work follow ${work}. The same correction should be easier to see seven days from now.`,
    `${capitalize(scene)} is the practical entry point for ${name}: ${area} needs handles, not another private weather report. The cost is ${cost}, so the paid map should make ${anchor} visible, give one boundary a repeatable shape, and close one finish before the day starts defending itself. Keep ${avoid} from choosing the tone. In closeness, ${caution}. In work, ${work}. Next week should show evidence, not only understanding.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|handle-cycle-v2`), 4)];
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
    `The paid map begins with ${scene}, not with a dramatic breakthrough. Around ${area}, ${name} needs a structure that stops ${cost} from turning each small duty into a verdict. Give the returning detail a fixed place: a calendar slot, a written cost, and a finish line that can be seen by tonight. Keep ${avoid} away from the next explanation, especially when the room asks for proof before the practical evidence exists. In relationships, ${caution}. In work, ${work}. Trackable guidance means less emotional rent and more visible repair.`,
    `Start the paid map at ${scene}. For ${name}, ${area} needs a structure because ${cost} keeps making ordinary duties sound personal. Put the returning detail in three places: calendar, written cost, visible finish line. Keep ${avoid} away from the next explanation when reassurance tries to arrive before evidence. With people, ${caution}. With work, ${work}. Add one dated proof before sleep, then compare it with tomorrow's first action. The repair becomes trackable when the same small proof can be found and repeated.`,
    `${capitalize(scene)} is the first point in ${name}'s paid map. Around ${area}, the expensive habit is ${cost}; it turns a practical duty into a private verdict unless the detail gets a fixed place. Use a calendar slot, a written cost, and one finish line before tonight. Keep ${avoid} outside the explanation when the room wants comfort before anything has moved. Let relationships follow ${caution}. Let work follow ${work}. Guidance becomes useful when the repair leaves evidence.`,
    `Let ${scene} hold the opening of the paid map for ${name}. The pressure around ${area} grows when ${cost} makes each duty feel like a judgment. Give the returning detail a calendar slot, a written price, and a visible close before the next explanation gets invited. If ${avoid} starts asking for reassurance too early, return to the proof that can be completed today. In closeness, ${caution}. In work, ${work}. The point is a repeatable repair, not a dramatic breakthrough, and the next review should be able to see it.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|${cost}|paid-map-v2`), 4)];
}

function overviewEvidenceHandlingLine(seed, parts) {
  const { name, scene, area, cost, anchor, move, avoid, caution, work } = parts;
  const moveRule = phraseVariant(move, seed, "overview-rule");
  return [
    `Start by handling ${scene} as evidence, not decoration. For ${name}, ${area} gets expensive when ${cost} starts pricing the facts before they are sorted. The three-month map reduces the emotional tax: name ${anchor}, give the next answer a time window, and close the informed part of the issue. ${capitalize(moveRule)} becomes the repeatable correction. If ${avoid} tries to hurry the moment, do less; make the next action cleaner. In relationships, ${caution}. In work, ${work}. A good month will feel less dramatic because it has fewer loose ends.`,
    `Treat ${scene} as evidence first. For ${name}, the pressure around ${area} grows when ${cost} moves faster than the facts. The three-month map is practical: put ${anchor} in writing, give the next answer a time window, and finish the data-ready piece tied to ${anchor}. Let the repeatable correction be: ${moveRule}. If ${avoid} rushes the moment, reduce the action until it is clean. With people, ${caution}. With work, ${work}. The month improves when fewer pieces stay open.`,
    `Use ${scene} as the proof point. For ${name}, ${area} becomes costly when ${cost} starts speaking before the real information is complete. The three-month map should name ${anchor}, give the next reply a time edge, and finish the part that can honestly close today. Repeat this correction: ${moveRule}. If ${avoid} presses for speed, make the action smaller and clearer. In closeness, ${caution}. In work, ${work}. Fewer loose ends will make the month less dramatic.`,
    `${capitalize(scene)} is evidence, not background. For ${name}, the expensive pattern around ${area} is ${cost} before the facts have a clean place to land. The three-month map asks for ${anchor} on paper, one answer window, and one close that does not need more information. Keep repeating this correction: ${moveRule}. If ${avoid} tries to hurry the tone, choose the smaller action. In relationships, ${caution}. For work, ${work}. The month should become quieter because the open loops are fewer.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|evidence-handling-v2`), 4)];
}

function overviewUsefulEvidenceLine(seed, parts) {
  const { name, scene, area, anchor, cost, move, caution, work } = parts;
  const moveRule = phraseVariant(move, seed, "overview-rule");
  return [
    `${capitalize(scene)} is useful evidence: ${area} has a shape, and ${anchor} shows where it gets louder. ${name}, the old response is ${cost}; the repair is not more availability, care, or persuasion. Put the recurring duty on paper, use this rule: ${moveRule}, and close the part that is already ready. In relationships, ${caution}. In work, ${work}. The next review should be able to see what changed without asking the mood to explain it again.`,
    `Use ${scene} as the evidence point for ${area}. When ${anchor} stays unnamed, the pressure gets louder. For ${name}, the old response is ${cost}, then trying to solve discomfort with extra care or persuasion. The guidance is to stop paying attention to that loop. Write the duty, apply this correction: ${moveRule}, and close the ready part. In relationships, ${caution}. For work, ${work}. Save the proof while it is still practical enough to repeat tomorrow.`,
    `${capitalize(scene)} shows ${name} where ${area} has become specific enough to handle. The pressure rises around ${anchor}; the old response is ${cost}, then overpaying with attention. Put the recurring duty on paper, let this rule lead: ${moveRule}, and close what is ready without making the day prove itself. With people, ${caution}. With work, ${work}. The real value is in the visible correction, not another private explanation.`,
    `Start with ${scene}; it gives ${area} a visible edge. ${name}, the pressure around ${anchor} grows when ${cost} tries to repair discomfort by adding more effort. The next move is simpler: write the duty, repeat this correction: ${moveRule}, and close the piece that is ready. In relationships, ${caution}. For work, ${work}. Let the saved result show where effort became cleaner, smaller, and easier to trust.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|useful-evidence-v2`), 4)];
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
    `The reading becomes useful when ${area} leaves evidence for the seventh-day review.`,
    `${capitalize(area)} gets day-seven proof.`,
    `The useful test is whether ${area} gives the next review something visible to inspect.`,
    `Let the seventh-day review find evidence in ${area}, not another mood to interpret.`
  ][mod(stableHash(`${seed}|${area}|seventh-day`), 4)];
}

function overviewTestablePlaceLine(seed, name, scene, area) {
  return [
    `For ${name}, ${scene} tests ${area} through one practical detail.`,
    `For ${name}, ${scene} is the small proof-point where ${area} can stop staying abstract.`,
    `${capitalize(scene)} matters because it turns ${area} into one visible detail ${name} can work with.`,
    `Use ${scene} as ${name}'s test surface for ${area}; the pattern needs evidence before interpretation.`,
    `${capitalize(scene)} gives ${area} a handle, so ${name} can change one visible detail instead of carrying the whole mood.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|testable-place`), 5)];
}

function overviewEvidenceWeightLine(seed, name, area) {
  return [
    `that ordinary detail shows ${name} where the facts around ${area} cannot carry ${area}'s extra weight anymore.`,
    `${name} can see there how ${area} asks for interpretation before the real duty is clear.`,
    `the useful signal shows ${name} where meaning around ${area} starts arriving before the facts settle.`,
    `that small cue shows ${name} where ${area} needs evidence before another explanation.`,
    `${area} becomes easier to handle when ${name} treats this detail as proof, not atmosphere.`
  ][mod(stableHash(`${seed}|${name}|${area}|evidence-weight`), 5)];
}

function overviewPlainMarkerLine(seed, scene, area) {
  return [
    `${capitalize(scene)} gives the pressure around ${area} a practical address before it spreads through the day.`,
    `Treat ${scene} as the marker for ${area}; it shows where attention is leaving the real task.`,
    `Use ${scene} to locate ${area} before the pressure turns into a mood.`,
    `${capitalize(scene)} is the ordinary place where ${area} asks to be made visible.`,
    `Start with ${scene}; the useful signal is how ${area} pulls attention away from the next clean step.`
  ][mod(stableHash(`${seed}|${scene}|${area}|plain-marker`), 5)];
}

function overviewCostSizeLine(seed, name, cost) {
  return [
    `${name}, the cost is ${cost}, and the next duty should be measured by facts rather than emotional weight.`,
    `${name}, the expensive part is ${cost}; it makes the next task feel personal before the evidence is complete.`,
    `${name}, the pattern costs energy through ${cost}, so the repair has to be practical before it becomes emotional.`,
    `${name}, ${cost} is the tax on the day; the paid map starts by making that tax visible.`,
    `${name}, the pressure grows through ${cost}, then asks for reassurance when the work actually needs a container.`
  ][mod(stableHash(`${seed}|${name}|${cost}|cost-size`), 5)];
}

function overviewTimingDrainLine(seed, cost) {
  return [
    `The drain is ${cost}, which makes timing feel personal even when the next step is practical.`,
    `The timing problem belongs to ${cost}; let the practical step answer ${cost} before emotion adds a price.`,
    `The cost pattern is ${cost}, especially when timing starts carrying more meaning than the next action.`,
    `What drains the day is ${cost}; the next practical step should not have to prove emotional safety.`
  ][mod(stableHash(`${seed}|${cost}|timing-drain`), 4)];
}

function overviewInspectableSequenceLine(seed, anchor) {
  return [
    `For the paid cycle, build a sequence that can be inspected: write ${anchor}, choose one reply window, and close a task before the mind reopens it.`,
    `Mark ${anchor}: cue for ${anchor}, reply time for ${anchor}, closed proof.`,
    `Let ${anchor} carry the sequence: write it down, give the next reply a window, and close one task before the case reopens.`,
    `The paid cycle needs visible order around ${anchor}: written cue, timed reply, finished task, and no reopened case before evening.`
  ][mod(stableHash(`${seed}|${anchor}|inspectable-sequence`), 4)];
}

function overviewUrgencyClose(seed, area) {
  return [
    `The aim is to stop using urgency as proof and start using structure as care, week after week.`,
    `For ${area}, the aim is structure that keeps urgency from pretending to be proof.`,
    `The week improves when ${area} receives structure before urgency gets to argue.`,
    `Let structure carry ${area}; urgency does not need to become the proof.`
  ][mod(stableHash(`${seed}|${area}|urgency-close`), 4)];
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
    `By the end of the cycle, ${area} should have a record the body can trust, not only a feeling to chase.`,
    `Let the next reviews prove that ${area} can be steadied through action, timing, and visible follow-through.`,
    `The paid work is to make ${area} easier to inspect: less emotional accounting around ${area}, more finished detail.`
  ][mod(stableHash(`${seed}|${area}|${name}|evidence`), 4)];
}

function overviewEffortLine(seed, cost) {
  return [
    `The issue is not effort; it is ${cost} until the day starts treating small duties like emotional debt.`,
    `The pressure is not a lack of trying; ${cost} makes the next ordinary task feel more expensive than it is.`,
    `What needs care is the cost pattern: ${cost}, especially when the next duty starts carrying extra meaning.`,
    `The real drain is ${cost}; effort improves only when the cost stops hiding inside every small task.`
  ][mod(stableHash(`${seed}|${cost}|effort`), 4)];
}

function overviewVisibleAnchorLine(seed, anchor) {
  return [
    `Put ${anchor} where it can be seen, attach one time limit, and finish the piece that already has enough facts.`,
    `Give ${anchor} a visible place, one clean boundary, and a finish line that can survive the mood changing.`,
    `Move ${anchor} out of the mind and into the day: one written line, one time edge, one finished detail.`,
    `Set ${anchor} in front of you, choose the first useful limit, and close the part that no longer needs discussion.`
  ][mod(stableHash(`${seed}|${anchor}|visible`), 4)];
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
    `${name}, the pattern is not lack of effort; it is ${cost} until the day becomes crowded with invisible accounting.`,
    `${name}, effort is not the missing piece; ${cost} is the part that quietly crowds the day.`,
    `${name}, the costly habit is ${cost}, especially when ordinary timing starts carrying private accounting.`,
    `${name}, the map begins where ${cost} turns the day into too many invisible calculations.`
  ][mod(stableHash(`${seed}|${name}|${cost}|crowd`), 4)];
}

function overviewInspectLine(seed, anchor, name = "") {
  return [
    `Use the next paid cycle to make the pressure inspectable: write ${anchor}, mark the cost, choose the part that closes before evening, and leave the rest outside the next conversation.`,
    `Make the next paid cycle visible: place ${anchor} on paper, mark its cost, finish one evening-sized piece, and leave the rest outside the next conversation.`,
    overviewAnchorEvidenceLine(seed, anchor, name),
    `Use ${anchor} as the paid-cycle handle: one written duty, one named cost, one part closed before evening, and one conversation left lighter.`
  ][mod(stableHash(`${seed}|${name}|${anchor}|inspect-v2`), 4)];
}

function overviewAnchorEvidenceLine(seed, anchor, name = "") {
  return [
    `Put ${anchor} on paper. Close one part. In the next exchange, use the written fact and leave the heat outside.`,
    `Let ${anchor} produce evidence in the next cycle: write the cost, close one useful part, and leave the next conversation easier to carry.`,
    `Build evidence around ${anchor} by naming the price, finishing one useful piece, and keeping the next exchange smaller than the worry.`,
    `Use ${anchor} as the proof point: write the cost, close one practical part, and let the next conversation stay lighter because the work is visible.`,
    `Let ${anchor} become the factual edge: name the cost, finish the ready piece, and let the next reply borrow calm from the completed work.`,
    `Give ${anchor} a written place first. Then close the piece that can move today and keep the next exchange tied to the visible result.`
  ][mod(stableHash(`${seed}|${name}|${anchor}|anchor-evidence-v3`), 6)];
}

function overviewManagerLine(seed, avoid, caution) {
  return [
    `If the tone gets crowded, return closeness to ${caution} before ${avoid} takes over.`,
    `Do not let ${avoid} manage the tone. For closeness, return to this rule: ${caution}.`,
    `When ${avoid} tries to take charge, give closeness a cleaner rule: ${caution}.`,
    `Keep ${avoid} out of the manager role; let closeness stay guided by ${caution}.`
  ][mod(stableHash(`${seed}|${avoid}|${caution}|manager`), 4)];
}

function overviewWorkPracticalClose(seed, work) {
  return [
    `Let work stay practical through this signal: ${work}. The win is a trackable rhythm, not a perfect mood.`,
    `For work, keep returning to ${work}. The paid cycle succeeds when rhythm becomes visible before mood has to approve it.`,
    `Let the practical side follow ${work}. The real win is a rhythm that can be tracked, saved, and repeated.`,
    `Use ${work} as the work signal; let the saved record carry ${work}, not a temporary mood.`
  ][mod(stableHash(`${seed}|${work}|practical-close`), 4)];
}

function overviewMethodOpening(seed, scene, area) {
  return [
    `Use ${scene} as the entry point, because ${area} needs a method that can be repeated without becoming emotional theater.`,
    `Start from ${scene}; give ${area} a practical loop the body can repeat tomorrow.`,
    `Let ${scene} open the map, because ${area} is asking for a method the body can recognize again tomorrow.`,
    `Begin with ${scene}; the pressure around ${area} needs a usable method, not another private reading of the mood.`
  ][mod(stableHash(`${seed}|${scene}|${area}|method`), 4)];
}

function overviewVisibleSequenceLine(seed, anchor) {
  return [
    `The deeper guidance is to build the sequence around ${anchor}: body first, then the written promise, then the task that can be closed before the next review.`,
    `Make ${anchor} the sequence: settle the body, write the promise, and close the task before the next review gets a chance to reopen it.`,
    `The sequence starts with ${anchor}: body cue, written promise, finished task, then a review that does not reopen the case.`,
    `Build the visible order through ${anchor}: body first, promise on paper, one task closed before the next review.`
  ][mod(stableHash(`${seed}|${anchor}|sequence`), 4)];
}

function overviewSmallDutyLine(seed, cost) {
  return [
    `${cost} makes the smallest duty feel like evidence about love, value, or timing.`,
    `under ${cost}, even a small duty can start sounding like proof about timing or worth.`,
    `the pattern turns a small duty into evidence before the day has enough facts.`,
    `the pattern gives one small duty more meaning than the facts can support.`
  ][mod(stableHash(`${seed}|${cost}|small-duty`), 4)];
}

function overviewRecordClose(seed, area) {
  return [
    `Three months of this turns scattered insight into a record the body can trust.`,
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

function overviewHabitCostLine(seed, cost) {
  return [
    `The habit that costs the most is ${cost}, especially when a small duty starts sounding like a verdict on worth, loyalty, or timing.`,
    `${cost} is the costly habit; it turns small duties into verdicts before the facts are finished.`,
    `The expensive habit is ${cost}, mostly because ordinary duties begin carrying worth, loyalty, or timing.`,
    `What costs the most is ${cost}; it makes a practical duty sound more final than it is.`
  ][mod(stableHash(`${seed}|${cost}|habit-cost`), 4)];
}

function overviewThreeMonthVisibleLine(seed, area) {
  const areaCue = phraseVariant(area, seed, "overview-area");
  return [
    `Make the next three months very visible.`,
    `Let the next three months leave visible evidence for ${areaCue}.`,
    `Give the next three months a record that can be reviewed.`,
    `Use the next three months to make ${areaCue} trackable.`
  ][mod(stableHash(`${seed}|${areaCue}|three-month-visible`), 4)];
}

function overviewSmallPromiseLine(seed, anchor) {
  return [
    `Write ${anchor}, choose the smallest promise that can close today, and`,
    `Put ${anchor} on paper, choose the promise small enough to finish today, and`,
    `Make ${anchor} visible, choose one promise with a real finish today, and`,
    `Name ${anchor}, shrink the promise until it can close today, and`
  ][mod(stableHash(`${seed}|${anchor}|small-promise`), 4)];
}

function overviewCareProofLine(seed) {
  return [
    `The point is to make care easier to prove through behavior.`,
    `Care becomes believable when behavior can carry the proof.`,
    `The useful proof is behavior that can be repeated without pressure.`,
    `Let behavior make care easier to trust than another explanation would.`,
    `Trust becomes steadier when the proof is visible in action.`,
    `The repair works when care has evidence, not just better wording.`,
    `Let the next review find proof in behavior instead of another defense.`,
    `A repeated action should make the promise easier to believe.`
  ][mod(stableHash(`${seed}|care-proof-v2`), 8)];
}

function overviewRuleLine(seed, move) {
  const moveCue = phraseVariant(move, seed, "overview-rule");
  return [
    `${moveCue} before the discussion gets more expensive.`,
    `use ${moveCue} as the rule before the conversation gets crowded.`,
    `${moveCue} before discussion starts changing the shape.`,
    `${moveCue} before the longer explanation takes over.`,
    `make ${moveCue} the first move, then keep the conversation practical.`,
    `${moveCue} before the room asks for more words.`
  ][mod(stableHash(`${seed}|${moveCue}|rule-line-v2`), 6)];
}

function overviewBodyNegotiationLine(seed, area) {
  return [
    `For ${area}, the body needs proof after the choice, not another negotiation.`,
    `Once the choice is plain, let ${area} stop asking the body to reargue it.`,
    `${area} can settle when the body sees one action for ${area}, then stops rearguing it.`,
    `Put one action inside ${area}; if the body reopens ${area}, answer with proof.`,
    `The repair is to give ${area} a visible answer before the body turns it into another argument.`,
    `When ${area} has a clean next step, the body does not need to carry the whole debate.`
  ][mod(stableHash(`${seed}|${area}|body-negotiation-v3`), 6)];
}

function overviewPressureRepeatLine(seed, cost) {
  return [
    `The pressure is not random; it repeats through ${cost}.`,
    `The pressure repeats through ${cost}, then looks for a place to settle.`,
    `Answer the evidence around ${cost}; do not let the private argument grow.`,
    `The pattern returns through ${cost}, so the repair has to be visible.`
  ][mod(stableHash(`${seed}|${cost}|pressure-repeat`), 4)];
}

function overviewVisibleChainLine(seed, anchor) {
  return [
    `For this paid cycle, build one visible chain around ${anchor}: cue, timed response, finished duty, and a saved note about what changed.`,
    `Let ${anchor} become the visible chain: write the cue, time the response, finish the duty, and save the evidence.`,
    `The paid cycle needs a chain anchored in ${anchor}: one cue, one response window, one finished duty, and one saved note.`,
    `Build the chain through ${anchor}: written cue first, timed response second, finished duty third, saved evidence last.`
  ][mod(stableHash(`${seed}|${anchor}|visible-chain`), 4)];
}

function overviewExplanationLine(seed, avoid, caution) {
  return [
    `Keep ${avoid} out of the explanation; use ${caution} as the closeness rule.`,
    `Do not let ${avoid} explain the whole day. Let closeness take its shape from ${caution}.`,
    `When ${avoid} tries to explain everything, return closeness to this rule: ${caution}.`,
    `Keep the explanation smaller than ${avoid}; let closeness stay guided by ${caution}.`
  ][mod(stableHash(`${seed}|${avoid}|${caution}|explanation`), 4)];
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

function overviewPlanLine(seed, anchor) {
  return [
    `Put ${anchor} on paper, give it a start and stop, then protect the first finished step before another person or worry edits the plan.`,
    `Write ${anchor} where the day can see it, choose one time boundary, and close the piece that already has enough facts.`,
    `Give ${anchor} a day slot: choose one time for ${anchor}, close its smallest part, and stop.`,
    `Give ${anchor} a named place, then complete the smallest useful part before the mind starts adding extra conditions.`
  ][mod(stableHash(`${seed}|${anchor}|plan`), 4)];
}

function overviewAvoidLine(seed, avoid) {
  return [
    `If ${avoid} appears, slow the reply and let the next action become simpler.`,
    `When ${avoid} tries to lead, reduce the explanation and make the boundary more visible.`,
    `Keep ${avoid} from setting the pace; answer with timing, not performance.`,
    `If ${avoid} starts managing the room, return to the one action that can be finished today.`
  ][mod(stableHash(`${seed}|${avoid}|avoid`), 4)];
}

function overviewRelationshipLine(seed, caution) {
  return [
    `Let relationships use this caution: ${caution}.`,
    `For closeness, practice this without turning it into a speech: ${caution}.`,
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

function overviewThreeMonthClose(seed) {
  return [
    `Over three months, the aim is a record of kept promises, not a rush of intensity.`,
    `By the seventh-day reviews, the win should be visible evidence rather than a passing sense of relief.`,
    `The guidance becomes trustworthy when the same correction can be repeated in an ordinary week.`,
    `A useful paid cycle leaves fewer loose ends and more proof that care has a structure.`
  ][mod(stableHash(`${seed}|close`), 4)];
}

function pickThisWeek(parts, seed) {
  const { bodyStart, move, caution, avoid, work, name } = parts;
  const bodyCue = phraseVariant(bodyStart, seed, "week-body");
  const moveCue = phraseVariant(move, seed, "week-move");
  const cautionCue = phraseVariant(caution, seed, "week-caution");
  const avoidCue = phraseVariant(avoid, seed, "week-avoid");
  const workCue = phraseVariant(work, seed, "week-work");
  const templates = [
    `${weekPracticalBlockLine(seed, bodyCue)}`,
    `Give the week one rule that can be observed from the outside: ${moveCue}. Pair it with ${bodyCue}, then ${weekBlockLine(seed, workCue, moveCue)}. ${weekMessageLine(seed, avoidCue)}`,
    `${weekFirstRepairLine(seed, bodyCue, workCue, cautionCue, name)}`,
    `${weekEvidenceLine(seed, bodyCue, avoidCue, name)}`
  ];
  return templates[mod(seed + 3, templates.length)];
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

function weekPracticalBlockLine(seed, bodyStart) {
  return [
    `Begin with ${bodyStart}, then protect one practical block before the day gathers too many opinions. Put the returning promise on paper, give it a start time, and keep the reply shorter than habit wants. If someone reaches for instant access, answer with timing and let the completed piece carry the proof.`,
    `Start the week through ${bodyStart}, then ${weekVisibleWorkLine(seed, bodyStart)} ${weekQuickRequestLine(seed, bodyStart)}`,
    `Let ${bodyStart} become the first gate, then give one practical block a beginning and an end. Put the returning duty where the day can see it, make the reply smaller than fear prefers, and finish a visible piece before another promise gets added.`,
    `Let ${bodyStart} settle the body first, then protect a work block with one written promise and one finish line. When someone asks for immediate access, answer with time, complete the visible piece, and let action carry more weight than extra explanation. Save the proof before the next request arrives.`
  ][mod(stableHash(`${seed}|${bodyStart}|week-block`), 4)];
}

function weekVisibleWorkLine(seed, bodyStart) {
  return [
    `claim one visible work block, write the promise, choose the first time edge, and finish the part that can be seen before another request enters.`,
    `give one work block a visible edge: write the promise, choose the time, and close the useful piece while it is still simple.`,
    `make one block belong to visible work by writing the promise, naming the time, and closing the ready piece before explanation expands.`,
    `put one block around the work, define the promise, and close the part that already has enough facts before the day negotiates.`,
    `turn one work block into proof: name the promise, choose the first hour, and close the part that can be checked tonight.`,
    `give the practical block three markers: a promise on paper, a chosen time, and one finished piece the body can recognize.`,
    `keep one block small enough to finish: promise named, time protected, useful part closed before the next message pulls attention.`,
    `make the work visible through three plain marks: what is promised, when it begins, and which useful piece closes first.`
  ][mod(stableHash(`${seed}|${bodyStart}|visible-work-v2`), 8)];
}

function weekQuickRequestLine(seed, bodyStart) {
  return [
    `When a request comes too fast, answer with time first and let the finished detail speak next.`,
    `If someone reaches before the work is visible, give a time window and let the completed piece carry the answer.`,
    `When urgency asks for access, name the timing first; the finished detail can do the warmer work after that.`,
    `If the next request rushes the room, slow the answer and let one completed piece carry more proof than extra wording.`,
    `When a message tries to interrupt the block, give it a time and return to the piece that can close.`,
    `If access is demanded too early, offer timing first; let the finished work provide the rest of the answer.`,
    `When the room wants an immediate reply, protect the block and let one closed detail speak calmly afterward.`,
    `If urgency reaches for the whole day, answer with one time window and keep the finished piece as proof.`
  ][mod(stableHash(`${seed}|${bodyStart}|quick-request-v2`), 8)];
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
    if (wantsBodyCue) return pick(["the first quiet hour", "a protected first hour", "quiet before the first answer"]);
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
    if (wantsPracticeNoun) return pick(["the worry placed in a dated slot", "one appointment for the concern", "the concern moved into one scheduled place"]);
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
    if (wantsBodyCue) return pick(["water before deciding", "one water pause", "a glass of water before interpretation"]);
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
    if (wantsChip) return pick(["Old conversation reopening", "Answered conversation returning", "Settled talk reopening"]);
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
    return pick(["keep the waiting point factual", "let the delay keep its real size", "answer the wait with facts first"]);
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
  if (!shortCore) {
    return wantsChip
      ? pickArea(seed, ["Pattern made smaller", "Pressure given shape", "Cleaner visible rule"])
      : pickArea(seed, ["the pressure made smaller", "one visible rule for the pressure", "the pattern named before it spreads"]);
  }
  if (wantsChip) {
    const chip = core.join(" ");
    return wordsForCue(chip);
  }
  return pickArea(seed, [
    `${shortCore} gets one visible boundary`,
    `reduce ${shortCore} to one next action`,
    `make ${shortCore} concrete before it spreads`,
    `name the pressure around ${shortCore} early`,
    `give ${shortCore} a practical container`,
    `turn ${shortCore} into one repeatable step`
  ]);
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
    `Use the week as a proof cycle. Start difficult replies with ${bodyStart}, define the finish line before the task begins, and keep ${avoid} away from the room where work happens. Certainty can arrive later; repetition has to arrive first, with one saved example the next morning can trust.`,
    `${weekDemandingExchangeLine(seed, bodyStart, avoid, name)}`,
    `Use one experiment the day can see. Before the hardest reply, begin with ${bodyStart}; before the hardest task, write what done means. Keep ${avoid} away from the measured work. ${weekCompareClose(seed, bodyStart)}`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${avoid}|week-evidence-v2`), 4)];
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
    `Let the next seven days test ${bodyStart}. Before a hard conversation, use that cue; before a hard task, write one sentence that defines done. Keep ${avoid} outside the work so ${result} can leave proof for tomorrow, with one dated example saved before sleep.`,
    `Use seven days to test ${bodyStart}. Before the hard conversation, pause there; before the hard task, mark the smallest acceptable finish. Keep ${avoid} outside the block and let ${result} show what changed in one saved note.`,
    `Let ${bodyStart} lead one week of practice. Before the hard conversation, use the cue; before the hard task, name the finish line plainly. Keep ${avoid} out of the measured work and save proof that ${result} helped.`,
    `Give the week a visible test through ${bodyStart}. The hard conversation gets the cue first, the hard task gets one definition of done, and ${avoid} stays outside the work until ${result} leaves evidence. Save the result before the next request arrives.`
  ][mod(stableHash(`${seed}|${bodyStart}|${avoid}|seven-day-test`), 4)];
}

function weekDemandingExchangeLine(seed, bodyStart, avoid, name = "") {
  return [
    `Let ${bodyStart} open the exchange. Name the finish line before ${avoid} enters, keep the work block plain, and save one written proof that tomorrow can use without reopening the debate. Close by noting where ${bodyStart} changed the tone, the timing, or the amount of explanation required.`,
    `Start the exchange through ${bodyStart}. Put the finish line where the task can see it, keep ${avoid} outside the work block, and leave one written result for tomorrow morning. The useful win is not a bigger explanation; it is one finished piece that stays honest when the day checks it tomorrow.`,
    `Make ${bodyStart} the first fact for the demanding exchange. Give it one finish line, keep ${avoid} away from the next work block, and save proof small enough to repeat tomorrow. Let the week measure the result by what closed, what stayed kind, and what did not need another performance.`,
    `Let ${bodyStart} gather facts before the exchange gets crowded. The task needs one finish line, ${avoid} needs to stay outside the block, and tomorrow needs one proof it can reuse. Record the proof before the mood starts editing it into a larger story.`,
    `Place ${bodyStart} before the exchange, then write the finish line in one sentence. Keep ${avoid} away from the work block and leave the day with one proof, not another mood. The week should end with a result that is visible enough to repeat without extra force.`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${avoid}|demanding-exchange-v3`), 5)];
}

function weekFirstRepairLine(seed, bodyStart, work, caution, name = "") {
  return [
    `Start with ${bodyStart}. Pick one task with facts, ${weekWorkConcreteLine(seed, work)}, and keep the relationship practice concrete: ${caution}. By evening, the proof should be simple: one reply sent, one limit kept, and one duty closed without turning the whole day into an explanation.`,
    `Make the first repair visible before it becomes emotional. Begin with ${bodyStart}, choose the task that already has enough facts, and use this work standard: ${work}. With people, keep the practice small: ${caution}. The week needs one repeatable reply, one limit, and one finished duty.`,
    `Start with the practical repair: ${bodyStart}, one task with enough facts, and a work signal of ${work}. Let people receive the smaller practice through ${caution}. The week improves when one reply and one limit can be repeated without turning into a performance.`,
    `Keep the first repair grounded in action. Use ${bodyStart}, choose the task with enough facts, and make ${work} the standard for visible effort. With people, practice ${caution}. The useful proof is one finished duty and one clean limit repeated calmly.`,
    `Let ${bodyStart} set the first edge. Choose the task with enough facts, ${weekWorkConcreteLine(seed, work)}, and keep closeness tied to ${caution}. The week should leave one reply, one limit, and one completed duty.`,
    `${weekRepairOpeningLine(seed, bodyStart)} Put one fact-ready task in front, let the work signal be ${work}, and let the relationship practice stay as small as ${caution}. ${weekNightProofLine(seed, work)}`
  ][mod(stableHash(`${seed}|${name}|${bodyStart}|${work}|${caution}|first-repair-v2`), 6)];
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
    `Track how ${area} changes names across work, money, family, rest, and communication. Review saved readings every seventh day, circle the repeating cost, and let one habit become the container that holds it.`,
    `Follow ${area} through the places it hides: timing, money, messages, rest, and duty. On the seventh day, save the evidence, name the cost, and choose one habit to contain it.`,
    monthOrdinarySceneLine(seed, area, name),
    `Let saved readings label the repeat inside ${area}. Each week, write the cost in one sentence and give the pressure one habit that can hold it.`
  ][mod(stableHash(`${seed}|${name}|${area}|month-track-v2`), 4)];
}

function monthOrdinarySceneLine(seed, area, name = "") {
  return [
    `Give ${area} a seven-day ledger. Note the ordinary examples, name the cost once, and choose the habit that keeps next week lighter.`,
    `Follow ${area} through small scenes rather than one dramatic moment. At each seventh-day review, mark the cost and choose the habit that can hold the pressure next.`,
    `Let ${area} be tracked through daily evidence, not a single breakthrough. Every seventh day, name the cost and choose the habit that keeps the pressure contained.`,
    `Use ordinary scenes to track ${area}. On each seventh day, save the evidence, write the cost, and choose the habit that will carry the next week.`,
    `Let ${area} keep a weekly receipt: one ordinary example, one named cost, and one habit chosen before the next review begins.`,
    `Review ${area} by examples, not intensity. Save the clearest scene, name what it charged, and choose the smallest habit that can hold the next week.`
  ][mod(stableHash(`${seed}|${name}|${area}|ordinary-scene-v3`), 6)];
}

function monthProgressClose(seed, area, name = "") {
  return [
    `For ${area}, progress shows up when the weekly system starts replacing the dramatic speech with evidence.`,
    `Let reviewable evidence around ${area} replace the dramatic speech.`,
    monthEarlyRepairClose(seed, area, name),
    `For ${area}, the weekly system should make repair visible before the mood asks for a bigger speech.`
  ][mod(stableHash(`${seed}|${name}|${area}|month-progress-v2`), 4)];
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
    `Use the month to separate duty from the emotional tax around ${area}. Each week, mark where the charge grew, answer ${avoid} with one visible rule, and keep one promise visible. By the end, the pattern should have fewer hiding places and a clearer repair.`,
    `Let ${area} show the difference between the real duty and the added tax. Once a week, name the costly spot, reduce ${avoid}, and protect one body cue. The pattern gets easier to catch when ${area} has a small repeatable review.`,
    monthChargeReviewLine(seed, area, avoid, name),
    `For ${area}, choose one weekly place where the real duty is being crowded by emotional tax. Name it, reduce ${avoid}, and keep one protected body cue in the review. By the last week, the pattern should be easier to interrupt.`,
    `Let ${area} separate the duty from the extra emotional charge. Once a week, write the real task, reduce ${avoid}, and keep the repair tied to one visible promise. The last review should show which pressure became easier to catch before it borrowed the whole mood.`,
    `Use four weeks to split ${area} into two columns: the real duty and the pressure added around it. Let the second column show where ${avoid} entered, then choose a small rule that interrupts it next time. Add one note each week so the record shows what moved, not how loud it felt.`
  ][mod(stableHash(`${seed}|${name}|${area}|${avoid}|duty-tax-v2`), 6)];
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

function monthSundayReviewLine(seed, structure, name = "") {
  return [
    `${capitalize(structure)}. On Sunday, let ${structure} hold evidence; name the cost before mood enters and connect ${structure} to one practical habit. The review should end with a named next step.`,
    `${capitalize(structure)}. Each Sunday, measure what changed through proof: the repeated theme, the cost it charged, and the practical habit that can hold it next week. Add one visible adjustment so the month becomes a record, not a memory.`,
    `${capitalize(structure)}, then let the weekly review leave a trail. Save the reading that repeats, name the cost plainly, and attach the theme to one habit around time, money, rest, or communication. The trail should show what changed and what still needs a container.`,
    `${capitalize(structure)}. Use Sunday to record the repeat, the cost, and the habit that helped the pressure stay contained. Add one dated example beside the note, then use the fourth review to choose the first habit for next week.`,
    `${capitalize(structure)}. Let each Sunday collect one dated proof, one named cost, and one habit that makes the next week easier to enter. Keep the note close to a real scene so the review can change behavior, not only describe pressure.`,
    `${capitalize(structure)}. Keep the weekly review plain: what repeated, what it charged, and which habit made the pressure easier to hold. Add one dated example before the fourth note points to the next change, so the month becomes usable evidence.`
  ][mod(stableHash(`${seed}|${name}|${structure}|sunday-v2`), 6)];
}

function monthVisibleReviewLine(seed, anchor, area, avoid) {
  return [
    `Use one weekly review for ${area}. Put ${area} beside ${anchor}; let the calendar mark ${area}'s heavy place and name when ${avoid} tried to take over. Then ${monthCorrectionLine(seed, avoid)}. Catch ${area} before it needs a crisis.`,
    `Set the review before the week hardens. Keep ${anchor} near the calendar, name where ${area} asked for attention it did not need, and catch how ${avoid} first entered. Then ${monthCorrectionLine(seed, avoid)}. ${monthEarlyReviewClose(seed, area)}`,
    `For ${area}, save one note each week around ${anchor}; name where ${area} became louder than the facts and when ${avoid} tried to lead. Then ${monthCorrectionLine(seed, avoid)}. A pattern loses power when it has a timestamp and a next action.`,
    `Use the calendar as a witness instead of a judge. Each week, write ${anchor}, mark where ${area} became costly, and notice where ${avoid} tried to take the steering wheel. Then ${monthCorrectionLine(seed, avoid)}. ${monthSmallPressureClose(seed, area)}`,
    `For ${area}, keep a weekly page. Start with ${anchor}, add where ${area} got expensive, and write the entry point for ${avoid}. Then ${monthCorrectionLine(seed, avoid)}. Keep it brief for ${area}, specific for ${avoid}, and easy to repeat next week.`,
    `Treat each week as a checkpoint. Save ${anchor}, underline the moment ${area} pulled attention away from facts, and name the first sign of ${avoid}. Then ${monthCorrectionLine(seed, avoid)}. For ${area}, the pressure weakens when it is caught before it becomes the atmosphere.`,
    `Give the next four Sundays a single question: where did ${area} become louder than the real duty? Keep ${anchor} in view, note how ${avoid} pressed for control, and ${monthCorrectionLine(seed, avoid)}. This turns the month into evidence rather than memory.`,
    `Make one saved reading the weekly marker. Compare it with ${anchor}, name the pressure around ${area}, and catch the first sentence where ${avoid} wanted control. Then ${monthCorrectionLine(seed, avoid)}. Let one clean adjustment belong to ${area}; keep the review practical.`
  ][mod(stableHash(`${seed}|${anchor}|${area}|${avoid}|month-visible-v2`), 8)];
}

function monthEarlyReviewClose(seed, area) {
  return [
    `Let the evidence for ${area} arrive early, while the review can still stay practical.`,
    `Bring ${area} to the review early, before the pattern asks for a bigger scene.`,
    `Use the first proof around ${area} before the month turns it into a story.`,
    `Keep the review close to ${area}, where the evidence is still fresh enough to redirect.`,
    `Review ${area} early, while one clean correction can still change the week.`
  ][mod(stableHash(`${seed}|${area}|early-review`), 5)];
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
    `${practiceDemandingMessageLine(seed, bodyCue)}`,
    `${practiceMorningPromiseLine(seed, moveCue, name)}`
  ];
  return templates[mod(seed + 11, templates.length)];
}

function practiceSevenDayLine(seed, review, move, name = "") {
  return [
    `For seven days, use ${review} before the first difficult reply. At night, write one line about what became lighter because the limit stayed visible, then choose tomorrow's first action from that evidence.`,
    `Use ${review} as the daily opening practice. Before sleep, record the one place where a visible limit changed the outcome, then let that proof decide the first small action for tomorrow.`,
    `For the next week, put the hardest reply after ${review}. Tie the night note to ${move}; let tomorrow start from that proof and one small decision.`,
    `${practiceConcreteRepairClose(seed, review, name)}`
  ][mod(stableHash(`${seed}|${name}|${review}|seven-day-v2`), 4)];
}

function practiceConcreteRepairClose(seed, review, name = "") {
  return [
    `Begin seven days with ${review} before a demanding message. When the day closes, name the detail that became lighter, save the proof, and choose tomorrow's first repair from that evidence.`,
    `Use ${review} before the message that asks too much. At night, save the lighter detail, name what helped, and let morning start from the smallest useful correction.`,
    `For one week, place ${review} before the hardest message. Close the day by saving the proof, naming the lighter detail, and choosing one repair small enough to repeat tomorrow.`,
    `Begin the seven-day practice with ${review}. When evening comes, record the lighter detail and the proof beside it, then give tomorrow one repair that can be started without debate.`,
    `Put ${review} before the hardest message for one week. End each day with the detail that softened, the proof that stayed visible, and one repair that can begin early tomorrow.`,
    `Let ${review} lead the difficult reply for seven days. At night, save the useful proof, name the lighter detail, and choose the next repair before the mood edits the record.`
  ][mod(stableHash(`${seed}|${name}|${review}|concrete-repair-v3`), 6)];
}

function practiceDemandingMessageLine(seed, bodyStart) {
  return [
    `Before the first demanding message, practice ${bodyStart} and write the clean version of your answer. After the day closes, note where a shorter explanation protected care and what made that possible.`,
    `Practice ${bodyStart} before the first message that wants too much from you. Write the clean answer, send only what belongs, and later record where less explanation kept care intact.`,
    `Before the demanding reply, put ${bodyStart} first and choose one sentence the body can keep. At night, name what stayed protected: timing, warmth, or the amount of explanation required.`,
    `Before a difficult message, let ${bodyStart} settle the body and give the reply one clear job. ${practiceBodyResultClose(seed, bodyStart)}`
  ][mod(stableHash(`${seed}|${bodyStart}|demanding`), 4)];
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
    `Each morning, choose one small promise and give it a finish line that can be seen. Before sleep, record whether it stayed clear, where it blurred, and which adjustment would make tomorrow easier to keep without adding another task.`,
    `Start with a promise the day can complete before night. Record what stayed clear, where the line softened, and what tomorrow needs so the promise can hold its shape with less effort.`,
    `Choose one promise the day can see before it gets crowded. Before bed, mark whether ${move} helped it hold, then name the blur and the repair for tomorrow.`,
    `${practicePromiseOpeningLine(seed, move)} ${practicePromiseCloseLine(seed, move)}`,
    `Let the first promise stay small enough to finish by evening. Record the place where ${move} supported it, then choose tomorrow's repair before another task gets added.`,
    `Put one promise on paper before the day starts bargaining. Before sleep, name what held, what slipped, and how ${move} should enter tomorrow with one practical support already chosen.`,
    `Give the day one promise that has a visible edge. Close with the kept part, the weak part, and the exact support ${move} needs next.`,
    `Choose a promise with a real end point, not a heroic version of the day. At night, record whether ${move} made it easier to keep, then choose the smallest support for tomorrow.`
  ][mod(stableHash(`${seed}|${name}|${move}|morning-promise-v4`), 8)];
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
    `choose a two-hour block where ${work} gets a real finish before new promises enter`,
    `use one protected block where ${move} becomes visible before the next request arrives`,
    `put a timed edge around ${work}`,
    `pick one block for ${work}, then close the open item in the form it needs`,
    `make one visible block answer the pressure before another promise joins the list`
  ][mod(stableHash(`${seed}|${work}|${move}`), 5)];
}

function weekMessageLine(seed, avoid) {
  return [
    `If a message pulls you toward ${avoid}, answer the factual need and keep the surplus outside.`,
    `When ${avoid} starts shaping a reply, ${weekReplyCorrectionLine(seed, avoid)}`,
    `If ${avoid} tries to turn the message into a performance, choose timing over extra explanation.`,
    `When a reply begins carrying ${avoid}, make it shorter, clearer, and easier to keep.`,
    `If the screen invites ${avoid}, step back until the next sentence can carry one job.`
  ][mod(stableHash(`${seed}|${avoid}|message`), 5)];
}

function weekReplyCorrectionLine(seed, avoid) {
  return [
    `wait for the practical sentence and send only that.`,
    `write the plain purpose first, then delete the extra defense.`,
    `move the answer to a quieter moment before choosing words.`,
    `answer the factual need before adding any emotional explanation.`,
    `let the reply shrink until one honest job remains.`,
    `name the real request on paper before touching the send button.`,
    `choose the timing first, then make the words carry less strain.`,
    `keep the sentence close to the action it can actually complete.`
  ][mod(stableHash(`${seed}|${avoid}|reply-correction`), 8)];
}

function practiceHandledLine(seed, move) {
  return [
    `what changed by nightfall after ${move}`,
    `where ${move} kept one detail closed`,
    `where ${move} left one loop closed around ${move} instead of running privately`,
    `what became easier to repeat because ${move} stayed small`,
    `which promise held after ${move} replaced extra explanation`
  ][mod(stableHash(`${seed}|${move}`), 5)];
}

function practiceFactsLine(seed, move) {
  const handled = practiceHandledLine(seed, move);
  return [
    `After ${move}, note the repeat, its cost, and ${handled}.`,
    `At night, let ${handled} name the return and price.`,
    `Before sleep, capture what came back, what it charged you, and ${handled}.`,
    `At the end of the day, record the recurring moment, the cost, and ${handled}.`,
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
    `Put that repair in one dated line, then close the note before it turns into a second task.`,
    `Save the plain result of ${move}; tomorrow needs a usable fact, not a polished explanation.`,
    `Keep the record close to ${move}, so the next review can find proof without searching your mood.`,
    `Write the result in one practical line and leave the rest for tomorrow's action.`,
    `Save the evidence while it is plain; the next review needs a fact, not a performance.`
  ][mod(stableHash(`${seed}|${move}|record-v3`), 10)];
}

function monthCorrectionLine(seed, avoid) {
  const pressure = lowerFirst(safePhrase(avoid || "over-explaining"));
  return [
    `pick the smallest correction that keeps ${pressure} from managing the next week`,
    `answer ${pressure} with one next-week adjustment that can be seen`,
    `write the counter-move you will use before ${pressure} takes the steering wheel again`,
    `name the boundary, reply, or schedule change that interrupts ${pressure} next time`,
    `turn the review into one exact action before ${pressure} gets another opening`,
    `give the next week one visible rule that answers ${pressure} early`
  ][mod(stableHash(`${seed}|${pressure}|month`), 6)];
}

function readableArea(area, seed = 0) {
  const lower = String(area || "").toLowerCase();
  if (lower.includes("unfinished work")) return pickArea(seed, ["unfinished work and personal authority", "the unfinished work pattern", "personal authority and open tasks", "the open-duty pressure", "work left open and self-trust"]);
  if (lower.includes("money")) return pickArea(seed, ["money, restraint, and self-respect", "the money question and self-respect", "financial pressure and measured care"]);
  if (lower.includes("relationship")) return pickArea(seed, ["relationship timing", "closeness, timing, and unsaid needs", "relationship access and emotional pacing"]);
  if (lower.includes("family")) return pickArea(seed, ["family duty and private fatigue", "family care and hidden tiredness", "home responsibility and quiet resentment"]);
  if (lower.includes("health")) return pickArea(seed, ["body rhythm and recovery", "health rhythm and daily repair", "body timing and sustainable care"]);
  if (lower.includes("public") || lower.includes("ambition")) return pickArea(seed, ["visible work and delayed recognition", "public effort and slower recognition", "ambition, visibility, and earned proof"]);
  if (lower.includes("creative") || lower.includes("visibility")) return pickArea(seed, ["early visibility", "creative visibility and unfinished drafts", "expression, visibility, and the first version"]);
  if (lower.includes("friendship") || lower.includes("belonging")) return pickArea(seed, ["belonging pressure and social access", "friendship timing and access", "belonging and clean access"]);
  if (lower.includes("sleep") || lower.includes("closure")) return pickArea(seed, ["closure, sleep, and unfinished meaning", "sleep, closure, and the open loop", "rest and the meaning still left open"]);
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
  if (lower.includes("home")) return pickArea(seed, ["home rhythm and emotional privacy", "home order and private pressure", "domestic rhythm and inner privacy"]);
  if (lower.includes("conversation")) return pickArea(seed, [
    "the repeated inner conversation",
    "the inner conversation that keeps returning",
    "the private dialogue loop",
    "the recurring conversation with yourself",
    "the thought-conversation asking for a finish"
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
    return pickArea(salt, [
      "the unnamed task asking for a finish",
      "the task that needs a visible name",
      "the work item that should stop gathering weight",
      "the task asking for a smaller edge",
      "the open duty that needs one clean label"
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
  if (value.includes("conversation") && value.includes("clean time")) {
    return pickArea(salt, [
      "the conversation that needs a clean time, not a louder tone",
      "the talk that needs a time boundary before it needs intensity",
      "the conversation asking for a doorway instead of volume",
      "the reply window that can keep the conversation honest",
      "the conversation that should be scheduled before it gets heavier"
    ]);
  }
  if (value.includes("promise") && value.includes("smaller")) {
    return pickArea(salt, [
      "the promise that becomes easier once it is made smaller",
      "the smaller promise that can actually hold its shape",
      "the promise asking for a tighter finish line",
      "the commitment that needs fewer words and clearer edges",
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

function pickArea(seed, variants) {
  return variants[mod(seed, variants.length)];
}

function paidCost(context = {}, seed = 0, name = "") {
  const knot = String(context.emotionalKnot || "").toLowerCase();
  const salt = stableHash(`${seed}|${name}|${knot}|cost`);
  if (knot.includes("delay")) return pickArea(salt, ["treating delay as rejection", "letting waiting sound like refusal", "turning a slow answer into proof", "hearing delay as a verdict before the facts arrive"]);
  if (knot.includes("responsibility")) return pickArea(salt, ["using responsibility as proof of love", "making duty prove affection", "treating responsibility as the receipt for care", "letting obligation stand in for tenderness"]);
  if (knot.includes("self-respect")) return pickArea(salt, [
    "letting another person's softness set the price of self-respect",
    "pricing self-respect through someone else's warmth",
    "letting another person's tone steer the limit",
    "allowing someone else's tone to steer the limit",
    "making another person's gentleness the cost of self-respect",
    "waiting for outside softness before honoring the limit",
    "asking another person's warmth to approve self-respect",
    "letting the boundary depend on someone else's tenderness",
    "making self-respect wait for a kinder room"
  ]);
  if (knot.includes("unfinished work")) return pickArea(salt, ["turning unfinished work into a private verdict", "making the unfinished piece feel personal", "letting an open task judge your worth", "treating an unfinished piece as the whole story"]);
  if (knot.includes("available")) return pickArea(salt, ["staying reachable past the point where care still feels honest", "remaining available after care has lost its clean shape", "treating constant access as proof of care", "letting availability continue after honesty has thinned"]);
  if (knot.includes("certainty")) return pickArea(salt, ["asking uncertain people to become your proof", "using uncertain people as the source of certainty", "waiting for unclear people to steady the day", "making someone else's clarity carry your proof"]);
  if (knot.includes("understood")) return understoodCostPhrase(salt);
  return "letting a practical duty become emotional negotiation";
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
    "while the useful sentence waits",
    "instead of choosing the shape"
  ][mod(stableHash(`${seed}|close`), 5)];
  return `${opening} ${middle} ${close}`;
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
  return value;
}

function workSignalPhrase(text, seed = 0, name = "") {
  const value = lowerFirst(safePhrase(text || "make the action plain enough to complete"));
  const salt = stableHash(`${seed}|${name}|${value}|work`);
  if (value.includes("practical question")) {
    return pickArea(salt, [
      "answer the practical question first",
      "solve the factual part before the emotional one",
      "let the real-world question go first",
      "turn the practical question into the opening move",
      "start with the part that can be verified",
      "give the practical question the first clean answer"
    ]);
  }
  if (value.includes("planning") && value.includes("proving")) {
    return pickArea(salt, [
      "separate planning from proving",
      "let planning finish before proving begins",
      "keep the plan factual before it becomes personal",
      "make planning useful instead of performative"
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
      "protect the work from unnecessary explanation",
      "keep unnecessary explanation outside the work",
      "let the work stay protected from extra explanation",
      "give the work a boundary before explanation expands",
      "finish the work before explaining it again",
      "make the work visible before adding another explanation"
    ]);
  }
  if (value.includes("enough information") || value.includes("close the loop")) {
    return pickArea(salt, [
      "close the loop that already has enough information",
      "finish the loop whose facts are already available",
      "close the task that no longer needs more proof",
      "complete the practical loop before asking for more context",
      "finish the open thread with the facts already in hand"
    ]);
  }
  if (value.includes("vague plan") || value.includes("visible appointment")) {
    return pickArea(salt, [
      "turn the vague plan into one visible appointment",
      "put the plan on the calendar before it grows new doubts",
      "give the uncertain plan a time, place, and first action",
      "move the plan from thought into one scheduled block",
      "make the loose plan visible enough to keep",
      "give the plan a real appointment instead of another rehearsal",
      "turn the undefined plan into one dated action"
    ]);
  }
  return value;
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
      "letting urgency borrow your care before facts arrive",
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
      "asking the day for another sign",
      "letting small changes become a forecast",
      "using tiny shifts as emotional proof",
      "reopening the question through every detail"
    ][mod(stableHash(`${salt}|signs`), 10)];
  }
  if (value.includes("explanation") && value.includes("decision")) {
    return pickArea(seed, [
      "using explanation as a substitute for a decision",
      "explaining past the point where choice is needed",
      "turning one decision into another explanation",
      "letting explanation delay the clean choice"
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
    return pickArea(stableHash(`${salt}|small-mess-v2`), [
      "letting one small mess speak for the whole room",
      "making a small mess speak for the whole self",
      "treating a loose detail like a full identity report",
      "letting one visible mess become too personal",
      "turning a small disorder into a larger self-story",
      "asking one messy detail to describe everything",
      "letting a loose corner become the story of the room",
      "turning one unfinished detail into a self-verdict",
      "making a small disorder sound like a larger truth"
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
    "give ambition a measurable weekly finish before comparison enters the room"
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

function reviewAnchor(context = {}) {
  const body = String(context.bodySignal || "").toLowerCase();
  if (body.includes("eat") || body.includes("food")) return "a meal and one written limit";
  if (body.includes("water") || body.includes("drink")) return "water and one clean sentence";
  if (body.includes("walk") || body.includes("movement")) return "a short walk and one clean sentence";
  if (body.includes("sleep")) return "an earlier closing time and one written limit";
  if (body.includes("message") || body.includes("screen")) return "ten screen-free minutes and one clean sentence";
  if (body.includes("jaw") || body.includes("shoulder")) return "the shoulder or jaw cue and one written limit";
  return "one body cue and one written limit";
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
        "giving sleep the first boundary",
        "ending the check before sleep gets traded away"
      ][mod(stableHash(`${seed}|${value}|sleep-protect`), 5)];
    }
    return value.replace(/^protect\b/i, "protecting");
  }
  if (value.startsWith("notice ")) return value.replace(/^notice\b/i, "noticing");
  if (value.startsWith("step ")) return value.replace(/^step\b/i, "stepping");
  if (value.startsWith("start ")) return value.replace(/^start\b/i, "starting");
  if (value.startsWith("let ")) return value.replace(/^let\b/i, "letting");
  if (value.includes("protecting sleep") || value.includes("sleep matters")) {
    return [
      "protecting sleep first",
      "closing the day before another check",
      "letting sleep outrank the extra review",
      "giving sleep the first boundary",
      "ending the check before sleep gets traded away"
    ][mod(stableHash(`${seed}|${value}|sleep-check`), 5)];
  }
  return value;
}

function relationPhrase(text, seed = 0) {
  const value = lowerFirst(safePhrase(text || "do not turn another person's uncertainty into your assignment"));
  if (value.includes("discomfort") || (value.includes("fix") && value.includes("someone"))) {
    return pickArea(stableHash(`${seed}|${value}|discomfort-v2`), [
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
  if (value.includes("uncertainty")) return pickArea(seed, ["leave uncertainty with the person who owns it", "do not carry another person's uncertainty as your assignment", "let unclear people keep the weight of being unclear"]);
  if (value.includes("warmth")) return pickArea(seed, ["give warmth a time and a doorway", "time warmth cleanly", "keep warmth generous without permanent access"]);
  if (value.includes("shorter")) return pickArea(seed, ["keep the clean reply shorter than fear prefers", "make the reply clean before it becomes convincing", "answer the part that belongs to today and leave the rest"]);
  if (value.includes("kind no")) return pickArea(seed, ["let a kind no protect trust before resentment starts", "use a kind no while trust is still intact", "make the no early enough that care can stay clean"]);
  if (value.includes("behavior")) return pickArea(stableHash(`${seed}|${value}|behavior-v2`), [
    "wait for behavior before treating words as proof",
    "let behavior confirm the promise before spending more trust",
    "ask actions to carry proof before words receive full credit",
    "let the promise earn trust through behavior first",
    "give behavior the job of proving what words began",
    "spend trust after behavior has carried the promise",
    "let steady action speak before trust gets extended",
    "ask behavior to make the promise visible"
  ]);
  if (value.includes("listening")) return pickArea(seed, ["listen without volunteering for every consequence", "hear the feeling without adopting the whole consequence", "let listening stay present without becoming rescue"]);
  if (value.includes("needed")) return pickArea(seed, ["do not confuse being needed with being chosen", "separate being useful from being chosen", "let neediness prove need, not commitment"]);
  if (value.includes("closeness")) return pickArea(stableHash(`${seed}|${value}|closeness`), [
    "give closeness a doorway instead of leaving every window open",
    "let closeness enter through timing, not constant access",
    "keep closeness bounded",
    "make closeness timely instead of constantly available",
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

function focusCue(context = {}, seed = 0) {
  const move = mentorMovePhrase(context.mentorMove || context.stabilizer || "make one promise visible", seed);
  const cue = cueFromPhrase(phraseVariant(move, seed, "focus"), "Make one promise visible");
  return trimCue(cue);
}

function watchCue(context = {}, seed = 0, name = "") {
  const avoid = avoidPressurePhrase(context.avoid || "over-explaining under pressure", seed, name);
  const cue = cueFromPhrase(phraseVariant(avoid, seed, "watch"), "Over-explaining under pressure");
  return trimCue(cue);
}

function cueFromPhrase(text, fallback) {
  const value = String(text || fallback || "").replace(/[.!?]+$/g, "").trim();
  if (!value) return fallback;
  if (/^(make|answer|turn|let|choose|pause|remove|give|protect|finish|close|wait|decline|name)\b/i.test(value)) {
    return capitalize(value);
  }
  return capitalize(value);
}

function trimCue(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length < 4) return `${text} under pressure today`.trim();
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
