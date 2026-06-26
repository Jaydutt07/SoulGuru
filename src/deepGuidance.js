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

  return {
    overview: pickOverview({ name, scene, area, anchor, move, caution, avoid, work, cost }, seed),
    thisWeek: pickThisWeek({ bodyStart, move, caution, avoid, work }, seed),
    thisMonth: pickThisMonth({ structure, area, anchor, avoid }, seed),
    practice: pickPractice({ review, bodyStart, move }, seed),
    focus: focusCue(context, seed),
    watch: watchCue(context, seed, name)
  };
}

export function buildPaidGuidanceFingerprint(user = {}, context = {}, date = "") {
  const seed = paidSeed(user, context);
  return [
    `scene=${capitalize(paidScene(context, seed))}`,
    `area=${readableArea(context.dailyArea, seed)}`,
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
  if (raw.includes("door") || raw.includes("shoes") || raw.includes("keys") || raw.includes("bag") || raw.includes("charger")) return pickScene("doorway", ["the doorway detail", "the keys or bag waiting near the exit", "the threshold cue", "the charger, shoes, or door cue asking for order"]);
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
    `The paid map begins with ${scene}, not with a dramatic breakthrough. Around ${area}, ${name} needs a structure that stops the habit of ${cost} from turning each small duty into a verdict. Give the returning detail a fixed place: a calendar slot, a written cost, and a finish line that can be seen by tonight. Keep ${avoid} away from the next explanation, especially if the room starts asking for reassurance before anything has actually changed. In relationships, ${caution}. In work, ${work}. This is how guidance becomes trackable: less emotional rent, more visible repair.`,
    `${overviewMapOpening(seed, scene, area)} ${overviewCostCrowdLine(seed, name, cost)} ${overviewInspectLine(seed, anchor)} ${overviewManagerLine(seed, avoid, caution)} ${overviewWorkPracticalClose(seed, work)}`,
    `${overviewMethodOpening(seed, scene, area)} For ${name}, the drain is ${cost}; ${overviewSmallDutyLine(seed, cost)} ${overviewVisibleSequenceLine(seed, anchor)} Keep ${avoid} out of the review. With people, ${caution}. With work, ${work}. ${overviewRecordClose(seed, area)}`,
    `${overviewHandleCycleLine(seed, { name, scene, area, cost, anchor, avoid, caution, work })}`,
    `${overviewNoticeOpening(seed, name, scene, area)} ${overviewRepairLine(seed, cost)} ${overviewPlanLine(seed, anchor)} ${overviewAvoidLine(seed, avoid)} ${overviewRelationshipLine(seed, caution)} ${overviewWorkLine(seed, work)} ${overviewThreeMonthClose(seed)}`,
    `${overviewDeepPlacementOpening(seed, scene, name, area)} ${overviewHabitCostLine(seed, cost)} ${overviewThreeMonthVisibleLine(seed, area)} ${overviewSmallPromiseLine(seed, anchor)} ${overviewRuleLine(seed, move)} Keep ${avoid} outside the review. With people, ${caution}. With work, ${work}. ${overviewCareProofLine(seed)}`,
    `${overviewEvidenceHandlingLine(seed, { name, scene, area, cost, anchor, move, avoid, caution, work })}`,
    `${overviewTestablePlaceLine(seed, name, scene, area)} ${overviewPressureRepeatLine(seed, cost)} ${overviewBodyNegotiationLine(seed, area)} ${overviewVisibleChainLine(seed, anchor)} ${overviewExplanationLine(seed, avoid, caution)} Let work follow ${work}. ${overviewSeventhDayLine(seed, area)}`
  ];
  const fingerprint = stableHash(`${seed}|${scene}|${area}|${anchor}|${work}|${cost}|${name}|overview-v4`);
  return templates[mod(seed + fingerprint + overviewSceneOffset(scene), templates.length)];
}

function overviewHandleCycleLine(seed, parts) {
  const { name, scene, area, cost, anchor, avoid, caution, work } = parts;
  return [
    `Let ${scene} be the place where ${name} stops carrying ${area} as a private mood and starts treating it as a pattern with handles. The cost is ${cost}; it asks for extra emotional payment long after the practical bill is clear. This paid cycle needs three anchors: ${anchor} written plainly, one boundary that can be repeated without apology, and one finish that proves the day is not only reacting. Keep ${avoid} from choosing the tone. In closeness, ${caution}. In work, ${work}. The guidance becomes real when the same correction is visible next week, not only understood today.`,
    `${capitalize(scene)} gives ${name} a place to separate ${area} from the mood around it. The cost is ${cost}, and it keeps charging attention after the real duty is already visible. Build the paid cycle around ${anchor}: write it plainly, choose the boundary that can repeat, and finish one part that proves the day is not only reacting. Keep ${avoid} away from the tone. With people, ${caution}. With work, ${work}. The proof should be visible enough to compare next week.`,
    `Use ${scene} as ${name}'s handle for ${area}. The expensive part is ${cost}; the practical bill around ${cost} is charging attention. For the next cycle, put ${anchor} where the day can see it, give one boundary a sentence that can repeat, and close the task that can show progress today. Keep ${avoid} out of the tone. Let closeness practice ${caution}. Let work follow ${work}. The same correction should be easier to see seven days from now.`,
    `${capitalize(scene)} is the practical entry point for ${name}: ${area} needs handles, not another private weather report. The cost is ${cost}, so the paid map should make ${anchor} visible, give one boundary a repeatable shape, and close one finish before the day starts defending itself. Keep ${avoid} from choosing the tone. In closeness, ${caution}. In work, ${work}. Next week should show evidence, not only understanding.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|handle-cycle-v2`), 4)];
}

function overviewEvidenceHandlingLine(seed, parts) {
  const { name, scene, area, cost, anchor, move, avoid, caution, work } = parts;
  return [
    `Start by handling ${scene} as evidence, not decoration. For ${name}, ${area} gets expensive when ${cost} starts pricing the facts before they are sorted. The paid map reduces the emotional tax: name ${anchor}, give the next answer a time window, and close the informed part of the issue. ${capitalize(move)} becomes the repeatable correction. If ${avoid} tries to hurry the moment, do less; make the next action cleaner. In relationships, ${caution}. In work, ${work}. A good month will feel less dramatic because it has fewer loose ends.`,
    `Treat ${scene} as evidence first. For ${name}, the pressure around ${area} grows when ${cost} moves faster than the facts. The paid map is practical: put ${anchor} in writing, give the next answer a time window, and finish the data-ready piece tied to ${anchor}. Let the repeatable correction be ${move}. If ${avoid} rushes the moment, reduce the action until it is clean. With people, ${caution}. With work, ${work}. The month improves when fewer pieces stay open.`,
    `Use ${scene} as the proof point. For ${name}, ${area} becomes costly when ${cost} starts speaking before the real information is complete. The paid map should name ${anchor}, give the next reply a time edge, and finish the part that can honestly close today. Repeat this correction: ${move}. If ${avoid} presses for speed, make the action smaller and clearer. In closeness, ${caution}. In work, ${work}. Fewer loose ends will make the month less dramatic.`,
    `${capitalize(scene)} is evidence, not background. For ${name}, the expensive pattern around ${area} is ${cost} before the facts have a clean place to land. The paid map asks for ${anchor} on paper, one answer window, and one close that does not need more information. Keep repeating ${move}. If ${avoid} tries to hurry the tone, choose the smaller action. Let relationships follow ${caution}. Let work follow ${work}. The month should become quieter because the open loops are fewer.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|evidence-handling-v2`), 4)];
}

function overviewUsefulEvidenceLine(seed, parts) {
  const { name, scene, area, anchor, cost, move, caution, work } = parts;
  return [
    `${capitalize(scene)} is useful evidence: ${area} has a shape, and ${anchor} shows where it gets louder. ${name}, the old response is ${cost}; the repair is not more availability, care, or persuasion. Put the recurring duty on paper, use this rule: ${move}, and close the part that is already ready. In relationships, ${caution}. In work, ${work}. The next review should be able to see what changed without asking the mood to explain it again.`,
    `Use ${scene} as the evidence point for ${area}. When ${anchor} stays unnamed, the pressure gets louder. For ${name}, the old response is ${cost}, then trying to solve discomfort with extra care or persuasion. The paid guidance is to stop paying attention to that loop. Write the duty, apply ${move}, and close the ready part. Let relationships practice ${caution}. Let work follow ${work}. Save the proof while it is still practical enough to repeat tomorrow.`,
    `${capitalize(scene)} shows ${name} where ${area} has become specific enough to handle. The pressure rises around ${anchor}; the old response is ${cost}, then overpaying with attention. Put the recurring duty on paper, let ${move} set the rule, and close what is ready without making the day prove itself. With people, ${caution}. With work, ${work}. The paid value is in the visible correction, not another private explanation.`,
    `Start with ${scene}; it gives ${area} a visible edge. ${name}, the pressure around ${anchor} grows when ${cost} tries to repair discomfort by adding more effort. The paid move is simpler: write the duty, repeat ${move}, and close the piece that is ready. Relationships should follow ${caution}. Work should stay plain through ${work}. Let the saved result show where effort became cleaner, smaller, and easier to trust.`
  ][mod(stableHash(`${seed}|${name}|${scene}|${area}|useful-evidence-v2`), 4)];
}

function overviewSceneOffset(scene) {
  const value = String(scene || "").toLowerCase();
  if (value.includes("task list") || value.includes("draft")) return 1;
  if (value.includes("calendar")) return 4;
  if (value.includes("receipt") || value.includes("payment")) return 2;
  if (value.includes("notebook")) return 3;
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
    `Use ${scene} as the first marker in the paid map for ${area}; it keeps the work practical.`,
    `${capitalize(scene)} gives the three-month map for ${area} a place to start without making the day dramatic.`
  ][mod(stableHash(`${seed}|${scene}|${area}|map-open`), 4)];
}

function overviewCostCrowdLine(seed, name, cost) {
  return [
    `${name}, the pattern is not lack of effort; it is ${cost} until the day becomes crowded with invisible accounting.`,
    `${name}, effort is not the missing piece; ${cost} is the part that quietly crowds the day.`,
    `${name}, the costly habit is ${cost}, especially when ordinary timing starts carrying private accounting.`,
    `${name}, the map begins where ${cost} turns the day into too many invisible calculations.`
  ][mod(stableHash(`${seed}|${name}|${cost}|crowd`), 4)];
}

function overviewInspectLine(seed, anchor) {
  return [
    `Use the next paid cycle to make the pressure inspectable: write ${anchor}, mark the cost, choose the part that closes before evening, and leave the rest outside the next conversation.`,
    `Make the next paid cycle visible: place ${anchor} on paper, mark its cost, finish one evening-sized piece, and leave the rest outside the next conversation.`,
    `The next cycle needs evidence around ${anchor}: name the price, close one useful part, and keep the next conversation lighter.`,
    `Build the paid cycle around ${anchor}: one written duty, one named cost, one part closed before evening, and one conversation left lighter.`
  ][mod(stableHash(`${seed}|${anchor}|inspect`), 4)];
}

function overviewManagerLine(seed, avoid, caution) {
  return [
    `Keep ${avoid} from becoming the manager. Let closeness follow this rule: ${caution}.`,
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
  return [
    `Make the next three months very visible.`,
    `Let the next three months leave visible evidence for ${area}.`,
    `Give the next three months a record that can be reviewed.`,
    `Use the next three months to make ${area} trackable.`
  ][mod(stableHash(`${seed}|${area}|three-month-visible`), 4)];
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
    `Let behavior make care easier to trust than another explanation would.`
  ][mod(stableHash(`${seed}|care-proof`), 4)];
}

function overviewRuleLine(seed, move) {
  return [
    `let ${move} become the rule before discussion begins.`,
    `use ${move} as the rule before the conversation gets crowded.`,
    `make ${move} visible before discussion starts changing the shape.`,
    `let the rule be ${move} before any longer conversation begins.`
  ][mod(stableHash(`${seed}|${move}|rule-line`), 4)];
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
    `Let work use this signal: ${work}.`,
    `For work, the next clean standard is ${work}.`,
    `In visible effort, keep returning to this: ${work}.`,
    `Let the practical side of the day follow ${work}.`
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
  const { bodyStart, move, caution, avoid, work } = parts;
  const templates = [
    `${weekPracticalBlockLine(seed, bodyStart)}`,
    `Give the week one rule that can be observed from the outside: ${move}. Pair it with ${bodyStart}, then ${weekBlockLine(seed, work, move)}. ${weekMessageLine(seed, avoid)}`,
    `${weekFirstRepairLine(seed, bodyStart, work, caution)}`,
    `${weekEvidenceLine(seed, bodyStart, avoid)}`
  ];
  return templates[mod(seed + 3, templates.length)];
}

function pickThisMonth(parts, seed) {
  const { structure, area, anchor, avoid } = parts;
  const templates = [
    `${capitalize(structure)}. ${monthTrackLine(seed, area)} ${monthProgressClose(seed, area)}`,
    `${monthVisibleReviewLine(seed, anchor, area, avoid)}`,
    `${monthSundayReviewLine(seed, structure)}`,
    `${monthDutyTaxLine(seed, area, avoid)}`
  ];
  return templates[mod(seed + 7, templates.length)];
}

function weekPracticalBlockLine(seed, bodyStart) {
  return [
    `Begin with ${bodyStart}, then protect one practical block before the day gathers too many opinions. Put the returning promise on paper, give it a start time, and keep the reply shorter than habit wants. If someone reaches for instant access, answer with timing and let the completed piece carry the proof.`,
    `Start the week through ${bodyStart}, then claim one block that belongs to visible work. Write the promise, choose the first time edge, and finish the part that can be seen. If a request arrives too quickly, answer with timing before explanation and let the finished detail do more of the speaking.`,
    `Let ${bodyStart} become the first gate, then give one practical block a beginning and an end. Put the returning duty where the day can see it, make the reply smaller than fear prefers, and finish a visible piece before another promise gets added.`,
    `Let ${bodyStart} settle the body first, then protect a work block with one written promise and one finish line. When someone asks for immediate access, answer with time, complete the visible piece, and let action carry more weight than extra explanation.`
  ][mod(stableHash(`${seed}|${bodyStart}|week-block`), 4)];
}

function weekEvidenceLine(seed, bodyStart, avoid) {
  return [
    `Let the next seven days test ${bodyStart}. Before a hard conversation, use that cue; before a hard task, name what finished means in one sentence. Keep ${avoid} outside the work. The rhythm should show where ${bodyStart} protected care and which proof can be used tomorrow.`,
    `Use the week as a proof cycle. Start difficult replies with ${bodyStart}, define the finish line before the task begins, and keep ${avoid} away from the room where work happens. Certainty can arrive later; repetition has to arrive first.`,
    `${weekDemandingExchangeLine(seed, bodyStart, avoid)}`,
    `Build seven days around one visible experiment. Use ${bodyStart} before the hardest reply, write what done means before the hardest task, and refuse to let ${avoid} manage the work. Care gets cleaner when the rhythm is observable.`
  ][mod(stableHash(`${seed}|${bodyStart}|${avoid}|week-evidence`), 4)];
}

function weekDemandingExchangeLine(seed, bodyStart, avoid) {
  return [
    `Let ${bodyStart} open the exchange. Name the finish line before ${avoid} enters, keep the work block plain, and save one written proof that tomorrow can use without reopening the debate. Close by noting where ${bodyStart} changed the tone, the timing, or the amount of explanation required.`,
    `Start the exchange through ${bodyStart}. Put the finish line where the task can see it, keep ${avoid} outside the work block, and leave tomorrow one small written result. The useful win is not a bigger explanation; it is one completed piece that still looks honest later.`,
    `Make ${bodyStart} the first fact for the demanding exchange. Give it one finish line, keep ${avoid} away from the next work block, and save proof small enough to repeat tomorrow. Let the week measure the result by what closed, what stayed kind, and what did not need another performance.`,
    `Let ${bodyStart} gather facts before the exchange gets crowded. The task needs one finish line, ${avoid} needs to stay outside the block, and tomorrow needs one proof it can reuse. Record the proof before the mood starts editing it into a larger story.`,
    `Place ${bodyStart} before the exchange, then write the finish line in one sentence. Keep ${avoid} away from the work block and leave the day with one proof, not another mood. The week should end with a result that is visible enough to repeat without extra force.`
  ][mod(stableHash(`${seed}|${bodyStart}|${avoid}|demanding-exchange-v2`), 5)];
}

function weekFirstRepairLine(seed, bodyStart, work, caution) {
  return [
    `Let the first repair stay practical. Start with ${bodyStart}, choose the task with enough facts, and let ${work} set the work standard. With people, practice this quietly: ${caution}. The week succeeds when one reply, one limit, and one finished duty can repeat without drama.`,
    `Make the first repair visible before it becomes emotional. Begin with ${bodyStart}, choose the task that already has enough facts, and let work follow ${work}. With people, keep the practice small: ${caution}. The week needs one repeatable reply, one limit, and one finished duty.`,
    `Start with the practical repair: ${bodyStart}, one task with enough facts, and a work signal of ${work}. Let people receive the smaller practice through ${caution}. The week improves when one reply and one limit can be repeated without turning into a performance.`,
    `Keep the first repair grounded in action. Use ${bodyStart}, choose the task with enough facts, and make ${work} the standard for visible effort. With people, practice ${caution}. The useful proof is one finished duty and one clean limit repeated calmly.`
  ][mod(stableHash(`${seed}|${bodyStart}|${work}|${caution}|first-repair`), 4)];
}

function monthTrackLine(seed, area) {
  return [
    `Track how ${area} changes names across work, money, family, rest, and communication. Review saved readings every seventh day, circle the repeating cost, and let one habit become the container that holds it.`,
    `Follow ${area} through the places it hides: timing, money, messages, rest, and duty. On the seventh day, save the evidence, name the cost, and choose one habit to contain it.`,
    `Watch ${area} move through ordinary scenes instead of waiting for one dramatic moment. Use each seventh-day review to mark the cost and decide which habit will hold the pressure next.`,
    `Let saved readings label the repeat inside ${area}. Each week, write the cost in one sentence and give the pressure one habit that can hold it.`
  ][mod(stableHash(`${seed}|${area}|month-track`), 4)];
}

function monthProgressClose(seed, area) {
  return [
    `For ${area}, progress shows up when the weekly system starts replacing the dramatic speech with evidence.`,
    `Let reviewable evidence around ${area} replace the dramatic speech.`,
    `The win in ${area} is a weekly system that keeps the pressure visible before it becomes a dramatic speech.`,
    `For ${area}, the weekly system should make repair visible before the mood asks for a bigger speech.`
  ][mod(stableHash(`${seed}|${area}|month-progress`), 4)];
}

function monthDutyTaxLine(seed, area, avoid) {
  return [
    `Use the month to separate duty from the emotional tax around ${area}. Each week, choose where attention became too expensive, remove one layer of ${avoid}, and keep one promise visible. By the end, the pattern should have fewer hiding places and a clearer repair.`,
    `Let ${area} show the difference between the real duty and the added tax. Once a week, name the costly spot, reduce ${avoid}, and protect one body cue. The pattern gets easier to catch when ${area} has a small repeatable review.`,
    `Make ${area} easier to inspect by separating the task from the emotional charge. Each week, mark where attention got expensive, remove one layer of ${avoid}, and keep a visible promise beside the review. The goal is fewer hiding places, not a bigger speech.`,
    `For ${area}, choose one weekly place where the real duty is being crowded by emotional tax. Name it, reduce ${avoid}, and keep one protected body cue in the review. By the last week, the pattern should be easier to interrupt.`
  ][mod(stableHash(`${seed}|${area}|${avoid}|duty-tax`), 4)];
}

function monthSundayReviewLine(seed, structure) {
  return [
    `${capitalize(structure)}. On Sunday, let ${structure} hold evidence; name the cost before mood enters and connect ${structure} to one practical habit. The review should end with a named next step.`,
    `${capitalize(structure)}. Each Sunday, measure what changed through proof: the repeated theme, the cost it charged, and the practical habit that can hold it next week. Add one visible adjustment so the month becomes a record, not a memory.`,
    `${capitalize(structure)}, then let the weekly review leave a trail. Save the reading that repeats, name the cost plainly, and attach the theme to one habit around time, money, rest, or communication. The trail should show what changed and what still needs a container.`,
    `${capitalize(structure)}. Use Sunday as the evidence point: what repeated, what it cost, and which practical habit made the pressure easier to hold. The month should leave a trail that can be inspected, adjusted, and repeated without needing a crisis.`
  ][mod(stableHash(`${seed}|${structure}|sunday`), 4)];
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
  const { review, bodyStart, move } = parts;
  const templates = [
    `${practiceSevenDayLine(seed, review, move)}`,
    `${practiceFactsLine(seed, move)} ${practiceRecordLine(seed, move)}`,
    `${practiceDemandingMessageLine(seed, bodyStart)}`,
    `${practiceMorningPromiseLine(seed, move)}`
  ];
  return templates[mod(seed + 11, templates.length)];
}

function practiceSevenDayLine(seed, review, move) {
  return [
    `For seven days, use ${review} before the first difficult reply. At night, write one line about what became lighter because the limit stayed visible, then choose tomorrow's first action from that evidence.`,
    `Use ${review} as the daily opening practice. Before sleep, record the one place where a visible limit changed the outcome, then let that proof decide the first small action for tomorrow.`,
    `For the next week, put the hardest reply after ${review}. Tie the night note to ${move}; let tomorrow start from that proof and one small decision.`,
    `Begin seven days with ${review} before a demanding message. When the day closes, name the detail that became lighter, save the proof, and let tomorrow start with one concrete repair.`
  ][mod(stableHash(`${seed}|${review}|seven-day`), 4)];
}

function practiceDemandingMessageLine(seed, bodyStart) {
  return [
    `Before the first demanding message, practice ${bodyStart} and write the clean version of your answer. After the day closes, note where a shorter explanation protected care and what made that possible.`,
    `Practice ${bodyStart} before the first message that wants too much from you. Write the clean answer, send only what belongs, and later record where less explanation kept care intact.`,
    `Before the demanding reply, let ${bodyStart} choose the sentence ${bodyStart} can keep. At night, let ${bodyStart} name what it protected; because ${bodyStart} did the holding, care stayed warm.`,
    `Before a difficult message, let ${bodyStart} settle the body and give the reply one clear job. When the day closes, record where fewer words preserved more trust.`
  ][mod(stableHash(`${seed}|${bodyStart}|demanding`), 4)];
}

function practiceMorningPromiseLine(seed, move) {
  return [
    `Each morning, choose one small promise and give it a finish line that can be seen. Before sleep, record whether it stayed clear, where it blurred, and which adjustment would make tomorrow easier to keep without adding another task.`,
    `Start the day with one promise small enough to complete. At night, note the proof: what stayed clear, where the line softened, and what tomorrow needs so the promise can hold its shape with less effort.`,
    `Choose one visible promise before the day gets crowded. Before bed, mark whether ${move} helped it hold, where it blurred, and which repair belongs to the next morning.`,
    `Give the morning one small promise with a visible end. When the day closes, record the moment it stayed intact, the place it blurred, and the support ${move} needs tomorrow.`
  ][mod(stableHash(`${seed}|${move}|morning-promise-v2`), 4)];
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
    `Let the proof show ${move}; save the fact before the story starts improving itself.`,
    `Name ${move} in a tired-night note, then keep the record small enough for busy days.`,
    `Stop after capturing evidence for ${move}; after ${move}, pick the action first and keep the note small.`,
    `Let ${move} teach through ${move}; save proof, stop early.`,
    `Give ${move} one dated line, then close the note before it turns into a second task.`,
    `Save the plain result of ${move}; tomorrow needs a usable fact, not a polished explanation.`,
    `Keep the record close to ${move}, so the next review can find proof without searching your mood.`
  ][mod(stableHash(`${seed}|${move}|record-v2`), 8)];
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
  if (lower.includes("money")) return pickArea(seed, ["money, restraint, and self-respect", "the money question and self-respect", "financial pressure and measured care"]);
  if (lower.includes("relationship")) return pickArea(seed, ["relationship timing", "closeness, timing, and unsaid needs", "relationship access and emotional pacing"]);
  if (lower.includes("family")) return pickArea(seed, ["family duty and private fatigue", "family care and hidden tiredness", "home responsibility and quiet resentment"]);
  if (lower.includes("health")) return pickArea(seed, ["body rhythm and recovery", "health rhythm and daily repair", "body timing and sustainable care"]);
  if (lower.includes("public") || lower.includes("ambition")) return pickArea(seed, ["visible work and delayed recognition", "public effort and slower recognition", "ambition, visibility, and earned proof"]);
  if (lower.includes("creative") || lower.includes("visibility")) return pickArea(seed, ["early visibility", "creative visibility and unfinished drafts", "expression, visibility, and the first version"]);
  if (lower.includes("friendship") || lower.includes("belonging")) return pickArea(seed, ["belonging pressure and social access", "friendship timing and access", "belonging, availability, and quiet truth"]);
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
  if (lower.includes("conversation")) return "the repeated inner conversation";
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
    return pickArea(salt, [
      "the moment a small delay starts sounding like rejection",
      "delay needing facts",
      "the waiting point that should not become a verdict",
      "the slow answer that needs a calmer reading",
      "the delay that should stay practical before it becomes personal"
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
  if (knot.includes("self-respect")) return pickArea(salt, ["letting another person's softness set the price of self-respect", "pricing self-respect through someone else's warmth", "letting softness elsewhere decide your boundary", "making another person's gentleness the cost of self-respect"]);
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
  return value;
}

function avoidPressurePhrase(text, seed = 0, name = "") {
  const value = lowerFirst(safePhrase(text || "over-explaining"));
  const salt = `${seed}|${name}|${value}`;
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
  const cue = cueFromPhrase(move, "Make one promise visible");
  return trimCue(cue);
}

function watchCue(context = {}, seed = 0, name = "") {
  const avoid = avoidPressurePhrase(context.avoid || "over-explaining under pressure", seed, name);
  const cue = cueFromPhrase(avoid, "Over-explaining under pressure");
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
    context.attentionAnchor,
    context.emotionalKnot,
    context.decisionGate,
    context.relationalCaution,
    context.workSignal,
    context.bodySignal
  ].filter(Boolean).join("|"));
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function mod(value, length) {
  return ((value % length) + length) % length;
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
