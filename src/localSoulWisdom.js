import { buildAstrologyContext, buildTransitDateForUser } from "./astrologyEngine.js";
import { buildParagraphArchitecture, cleanWisdomText, firstName, isLowQualityWisdom } from "./soulGuruPrompt.js";

export function getDailyWisdom(user, dateKey = getTodayKey(new Date(), user.birthTimezone || undefined), architectureKey = dateKey) {
  const context = buildAstrologyContext(user, buildTransitDateForUser(user, dateKey));
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
  let wisdom = buildSignatureWisdom(user, context, seed, architectureKey);
  for (let attempt = 1; isLowQualityWisdom(wisdom) && attempt <= 16; attempt += 1) {
    wisdom = buildSignatureWisdom(user, context, seed + attempt * 97, architectureKey);
  }
  if (isLowQualityWisdom(wisdom)) {
    wisdom = builders[seed % builders.length](user, context);
  }

  return {
    wisdom: normalizeLocalWisdom(wisdom),
    innerWeather: toCue(context.innerWeather),
    todayMove: toCue(context.decisionGate),
    release: toCue(avoidPhrase(context.avoid, seed + 31))
  };
}

export function getDailyFocus(user, dateKey = getTodayKey(new Date(), user.birthTimezone || undefined)) {
  const context = buildAstrologyContext(user, buildTransitDateForUser(user, dateKey));
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

function buildSignatureWisdom(user, context, seed, dateKey) {
  const name = firstName(user.name);
  const architecture = buildParagraphArchitecture(user, context, dateKey);
  const constraints = parseArchitectureConstraints(architecture);
  let fallback = "";

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const nextSeed = seed + attempt * 41;
    const scene = sceneSeed(context, nextSeed);
    const plan = buildArchitecturePlan({
      opening: openingLine(scene, context, nextSeed, name, constraints.openingBucket),
      nameInsight: nameLine(name, context, nextSeed + 3),
      action: actionLine(context, nextSeed + 7, name),
      body: bodyLine(context, nextSeed + 11, name),
      relation: relationLine(name, context, nextSeed + 13),
      closing: closingLine(context, nextSeed + 19, name, constraints.finalBucket),
      relationClose: relationCloseLine(context, nextSeed + 23, name, constraints.finalBucket),
      sentenceCount: constraints.sentenceCount,
      nameSentence: constraints.nameSentence,
      seed: nextSeed
    }).join(" ");

    fallback ||= plan;
    const wordCount = words(plan).length;
    if (wordCount >= 72 && wordCount <= 100 && matchesArchitectureConstraints(plan, name, constraints) && !isLowQualityWisdom(plan)) {
      return plan;
    }
  }

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const compactPlan = buildCompactArchitecturePlan({
      name,
      context,
      constraints,
      seed: seed + attempt * 53
    }).join(" ");
    const compactWordCount = words(compactPlan).length;
    if (compactWordCount >= 72 && compactWordCount <= 100 && matchesArchitectureConstraints(compactPlan, name, constraints) && !isLowQualityWisdom(compactPlan)) {
      return compactPlan;
    }
  }

  return fallback;
}

function buildArchitecturePlan({
  opening,
  nameInsight,
  action,
  body,
  relation,
  closing,
  relationClose,
  sentenceCount,
  nameSentence,
  seed
}) {
  const count = Math.min(6, Math.max(4, sentenceCount || 5));
  const plan = Array(count).fill(null);
  const nameIndex = Math.min(count - 2, Math.max(1, (nameSentence || 2) - 1));
  plan[0] = opening;
  plan[nameIndex] = nameInsight;
  plan[count - 1] = count === 4 ? relationClose : closing;

  const fillerGroups = [
    [action, body, relation],
    [body, action, relation],
    [relation, action, body],
    [action, relation, body],
    [body, relation, action],
    [relation, body, action]
  ];
  const fillers = fillerGroups[mod(seed, fillerGroups.length)];
  let fillerIndex = 0;

  for (let index = 1; index < count - 1; index += 1) {
    if (plan[index]) continue;
    plan[index] = fillers[fillerIndex % fillers.length];
    fillerIndex += 1;
  }

  return plan.map((line) => line || closing);
}

function buildCompactArchitecturePlan({
  name,
  context,
  constraints,
  seed
}) {
  const count = Math.min(6, Math.max(4, constraints.sentenceCount || 5));
  const plan = Array(count).fill(null);
  const nameIndex = Math.min(count - 2, Math.max(1, (constraints.nameSentence || 2) - 1));
  const scene = sceneSeed(context, seed + 101);
  plan[0] = compactOpeningLine(scene, constraints.openingBucket, seed + 103);
  plan[count - 1] = compactClosingLine(context, constraints.finalBucket, seed + 109);
  const usedLines = new Set(plan.filter(Boolean));

  let remainingImperatives = Number.isFinite(constraints.imperativeTarget)
    ? constraints.imperativeTarget - plan.filter((line) => sentenceOpeningBucket(line) === "imperative").length
    : 0;
  const nonNamePositions = [];
  for (let index = 1; index < count - 1; index += 1) {
    if (index !== nameIndex) nonNamePositions.push(index);
  }

  const nameNeedsImperative = remainingImperatives > nonNamePositions.length;
  plan[nameIndex] = compactNameLine(name, context, seed + 113, nameNeedsImperative, usedLines);
  usedLines.add(plan[nameIndex]);
  if (nameNeedsImperative) remainingImperatives -= 1;

  for (const [offset, index] of nonNamePositions.entries()) {
    const needsImperative = remainingImperatives > 0;
    plan[index] = compactFillerLine(context, seed + 127 + offset * 17, needsImperative, usedLines);
    usedLines.add(plan[index]);
    if (needsImperative) remainingImperatives -= 1;
  }

  return plan;
}

function compactOpeningLine(scene, preferredBucket = "", seed = 0) {
  const lowerScene = lowerFirst(scene);
  const subject = sceneStatementSubject(scene, seed);
  const pressure = scenePressure(scene, seed + 1);
  const lines = {
    condition: [
      `When ${lowerScene} returns, ${pressure} is the part asking to be handled.`,
      `Before ${lowerScene} collects more meaning, put the day back inside a timed action.`,
      `With ${lowerScene} in view, the next decision needs size, not extra interpretation.`
    ],
    scene: [
      `The detail around ${lowerScene} shows where attention has been paying too much rent.`,
      `That small interruption around ${lowerScene} points to the exact place to reduce pressure.`,
      `One overlooked fact in ${lowerScene} belongs in the hands, not in another explanation.`
    ],
    statement: [
      `${subject} is carrying more pressure than the situation can justify.`,
      `${subject} shows where delay has started acting like proof.`,
      `${subject} needs a clear container before the mind turns it into a case file.`
    ],
    imperative: [
      `Notice ${lowerScene} before it becomes evidence for a harsher story.`,
      `Use ${lowerScene} to choose the next handleable action, then stop widening the problem.`,
      `Keep ${lowerScene} close enough to act on, not close enough to overread.`
    ]
  };
  return pickDistinctLine(lines[preferredBucket] || lines.statement, seed, new Set(), lowerScene, preferredBucket);
}

function compactNameLine(name, context, seed, imperative, usedLines = new Set()) {
  const area = dailyAreaLabel(context.dailyArea);
  const need = compactNeed(context.coreNeed || context.innerWeather, seed);
  const cost = compactAvoid(context.avoid || context.emotionalKnot);
  const lines = imperative ? [
    `Give ${area} a measurable job for ${name}, then refuse the extra performance around it.`,
    `Make ${area} small enough for ${name} to complete without auditioning for approval.`,
    `Keep ${name}'s next move visible around ${area}, especially where ${cost} starts spending attention.`
  ] : [
    `${name} needs ${need} to become visible before ${area} borrows tone from everything else.`,
    `The private cost for ${name} is ${cost}, especially when ${area} has no clear container.`,
    `Around ${area}, ${name} is protecting ${need}, not trying to win every room.`
  ];
  return pickDistinctLine(lines, seed, usedLines, name, area, need);
}

function compactFillerLine(context, seed, imperative, usedLines = new Set()) {
  const area = dailyAreaLabel(context.dailyArea);
  const body = compactBodyAnchor(context.bodySignal);
  const avoid = compactAvoid(context.avoid || context.emotionalKnot);
  const window = timeBox(seed);
  const imperativeLines = [
    `Handle the ${window} task before the larger question gets another vote.`,
    "Keep the next reply short enough to be kept without resentment.",
    `Protect ${body} first, then let the decision shrink to the next page, call, or errand.`,
    `Finish the visible repair before ${avoid} starts measuring the whole day.`,
    "Reduce the work to the part that can close before the next meal.",
    "Choose the action that leaves less mess for tonight, then stop taking new evidence.",
    "Name the limit once, in plain words, before approval turns into a second job."
  ];
  const statementLines = [
    bodyTimingLine(body, seed),
    "A shorter reply can keep affection present without making every feeling your assignment.",
    `A finished ${window} task will carry the decision better than another private courtroom.`,
    `The habit of ${avoid} weakens when the next choice has a visible edge.`,
    relationshipTimingLine(seed),
    `${capitalize(area)} becomes easier to handle when the body is fed, watered, or rested first.`,
    `A kept limit gives ${area} shape before effort starts arguing for permission.`,
    `${capitalize(area)} needs a container that can be seen from the outside.`,
    compactAreaLine(context),
    silenceTimingLine(seed)
  ];
  return pickDistinctLine(imperative ? imperativeLines : statementLines, seed, usedLines, area, body, avoid);
}

function compactClosingLine(context, preferredBucket = "", seed = 0) {
  const close = closingEvidence(context, seed);
  const lines = {
    condition: [
      `When evening comes, let ${close} answer before the doubt asks for a hearing.`,
      "If pressure returns, answer it with the task already closed in your hands.",
      "With less performance, the day can end around something honestly completed.",
      "Before night, let the completed detail speak louder than the unsettled interpretation.",
      "After the practical repair is done, leave the larger meaning for tomorrow.",
      `When the next doubt arrives, point it toward ${close}.`
    ],
    scene: [
      "The closed tab, paid bill, sent reply, or cleared corner can be enough for tonight.",
      "One handled detail can hold the place of certainty until tomorrow.",
      "This practical finish deserves more respect than another perfect explanation."
    ],
    statement: [
      plainWorkClosingLine(seed, close),
      "A kept time, closed task, and rested body are enough to carry into evening.",
      "Completion deserves more respect than the doubt still asking questions."
    ],
    imperative: [
      "Let the finish stay modest, complete, and free from extra explanation.",
      `Keep ${close} visible, then stop reopening the larger question tonight.`,
      "Leave the day with a closed loop and one fewer explanation."
    ]
  };
  const bucketLines = lines[preferredBucket] || lines.statement;
  return pickDistinctLine(bucketLines, seed, new Set(), context.dailyArea, context.closingPermission);
}

function compactSceneSubject(scene) {
  const stripped = lowerFirst(scene).replace(/^(the|a|an|one|your|that|this)\s+/i, "");
  return `Pressure around ${stripped || "the nearest detail"}`;
}

function compactNeed(text, seed = 0) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("proof")) return "proof through follow-through";
  if (normalized.includes("honesty")) return "honesty without performance";
  if (normalized.includes("rest") || normalized.includes("quiet")) return "quiet that still has structure";
  if (normalized.includes("boundary") || normalized.includes("limit")) return "a limit that can be kept";
  if (normalized.includes("belong")) return "belonging without self-abandonment";
  return pickLine([
    "room to move slowly",
    "a cleaner inner rule",
    "support that does not perform",
    "one choice with a clear edge"
  ], seed, normalized);
}

function compactBodyAnchor(text) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("sleep")) return "sleep";
  if (normalized.includes("water") || normalized.includes("drink")) return "water";
  if (normalized.includes("food") || normalized.includes("meal") || normalized.includes("eat")) return "food";
  if (normalized.includes("walk") || normalized.includes("movement") || normalized.includes("breath")) return "breath and movement";
  if (normalized.includes("jaw") || normalized.includes("shoulder")) return "the jaw and shoulders";
  return "the body";
}

function compactAvoid(text) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("checking") || normalized.includes("signs")) return "checking every small change";
  if (normalized.includes("worth") || normalized.includes("exhaustion")) return "proving worth through exhaustion";
  if (normalized.includes("explain")) return "over-explaining";
  if (normalized.includes("delay")) return "turning delay into a verdict";
  if (normalized.includes("perfect")) return "chasing the perfect mood";
  if (normalized.includes("urgency") || normalized.includes("urgent")) return "obeying urgency";
  if (normalized.includes("defend")) return "defending too early";
  return "over-reading the moment";
}

function avoidPhrase(text, seed = 0) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("checking") || normalized.includes("signs")) {
    return pickLine([
      "checking every small change",
      "turning tiny shifts into proof",
      "scanning ordinary details for hidden signals",
      "asking each small change to explain the whole day",
      "reading every shift as a verdict"
    ], seed, normalized);
  }
  if (normalized.includes("delay") && normalized.includes("verdict")) {
    return pickLine([
      "turning delay into a verdict",
      "letting a slow reply judge the whole day",
      "making delay sound larger than it is",
      "treating waiting as proof",
      "using delay as a private scorecard"
    ], seed, normalized);
  }
  if (normalized.includes("explain")) {
    return pickLine([
      "over-explaining",
      "using extra words to manage the room",
      "explaining past the useful point",
      "turning explanation into control",
      "answering the atmosphere instead of the request"
    ], seed, normalized);
  }
  return fragment(text);
}

function needPhrase(text, seed = 0) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("permission") && normalized.includes("finish")) {
    return pickLine([
      "permission to finish before polishing",
      "room to close the first version",
      "freedom to complete before improving",
      "a finish line that does not demand perfection",
      "support for ending the task before decorating it"
    ], seed, normalized);
  }
  if (normalized.includes("boundary") || normalized.includes("speech")) {
    return pickLine([
      "one boundary that does not need a speech",
      "a limit that can stand without performance",
      "a clear edge around what you can offer",
      "a simple no that still leaves warmth intact",
      "a boundary small enough to keep"
    ], seed, normalized);
  }
  return fragment(text);
}

function edgePhrase(text, seed = 0) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("protect peace") && normalized.includes("cold")) {
    return pickLine([
      "protect peace without freezing your warmth",
      "keep peace available without turning distant",
      "hold peace with warmth still intact",
      "protect quiet without making yourself unreachable",
      "let peace have a shape without becoming hard"
    ], seed, normalized);
  }
  if (normalized.includes("smallest action")) {
    return pickLine([
      "make one action visible enough to respect",
      "give the smallest action a visible edge",
      "let the first action become clear enough to trust",
      "make the next action concrete enough to count",
      "turn the smallest action into something visible"
    ], seed, normalized);
  }
  return fragment(text);
}

function actionPhrase(text, seed = 0) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("visible task") && normalized.includes("emotional debate")) {
    return pickLine([
      "finish the visible task before the feeling asks for court",
      "complete the task you can see before debating the mood",
      "move the visible task first and let the emotion answer later",
      "handle the task in front of you before the inner debate expands",
      "close the visible task before the feeling starts negotiating"
    ], seed, normalized);
  }
  if (normalized.includes("message") && normalized.includes("simplifying")) {
    return pickLine([
      "send the message after cutting it to the useful part",
      "simplify the message before sending it",
      "make the reply shorter before it leaves your hands",
      "send only the answer that can stay true",
      "trim the message before the mood edits it"
    ], seed, normalized);
  }
  return fragment(text);
}

function compactAreaLine(context) {
  const area = String(context.dailyArea || "").toLowerCase();
  if (area.includes("learning") || area.includes("scattered")) {
    return "Scattered attention settles when the page, timer, and task agree.";
  }
  if (area.includes("public") || area.includes("ambition") || area.includes("recognition")) {
    return "Delayed recognition needs a submitted piece, not another argument with effort.";
  }
  if (area.includes("money")) {
    return "A money choice becomes cleaner when value and price stop sharing a chair.";
  }
  if (area.includes("relationship")) {
    return "Closeness gets cleaner when timing matters as much as tenderness.";
  }
  if (area.includes("family")) {
    return "Family care becomes lighter when duty is shaped before resentment gathers.";
  }
  if (area.includes("health") || area.includes("body")) {
    return "The body gives clearer instructions once pressure stops pretending to be urgency.";
  }
  return "The practical part becomes easier when it is named before the story expands.";
}

function sceneStatementSubject(scene, seed = 0) {
  const normalized = String(scene || "").toLowerCase();
  if (normalized.includes("half-closed") && normalized.includes("conversation")) {
    return pickLine([
      "The half-closed door before the conversation",
      "Doorway conversation pressure",
      "The door left half-closed before words"
    ], seed, scene);
  }
  if (/\b(bag|keys|charger)\b/.test(normalized)) {
    return pickLine([
      "Keys gathered late",
      "The bag and charger delay",
      "The late key-and-charger detail"
    ], seed, scene);
  }
  if (/\b(pen|decision|written|line)\b/.test(normalized)) {
    return pickLine([
      "The pen beside the decision",
      "The unwritten line",
      "Decision pressure beside the page"
    ], seed, scene);
  }
  if (/\b(meal|food|breakfast|lunch)\b/.test(normalized)) {
    return pickLine([
      "The delayed first meal",
      "Meal timing",
      "The postponed food cue"
    ], seed, scene);
  }
  const category = sceneCopyCategory(scene);
  const subjects = {
    water: ["Water before judgment", "The bedside glass", "First-sip discipline"],
    calendar: ["Calendar hesitation", "Appointment pressure", "The delayed square"],
    notebook: ["Notebook silence", "The waiting line", "Pen pressure"],
    kitchen: ["Kitchen-counter evidence", "The delayed meal", "Cooling-cup patience"],
    money: ["Wallet arithmetic", "Receipt pressure", "The payment pause"],
    room: ["Desk-corner pressure", "The open drawer", "Room-level disorder"],
    door: ["Door delay", "Keys gathered late", "The errand threshold"],
    body: ["Mirror honesty", "Shoulder-level resistance", "Jaw-tight timing"],
    conversation: ["Unsent-sentence pressure", "Conversation timing", "Held-back wording"],
    task: ["List pressure", "Draft resistance", "The unnamed task"],
    worry: ["Mental-tab pressure", "The returning thought", "Worry in its familiar chair"]
  };
  return pickLine(subjects[category] || ["The nearest detail", "Practical pressure", "The overlooked cue"], seed, scene);
}

function scenePressure(scene, seed = 0) {
  const category = sceneCopyCategory(scene);
  const phrases = {
    water: ["the body asking to decide after care", "the morning needing sequence before meaning"],
    calendar: ["the appointment needing a real slot", "the delayed commitment asking for a smaller promise"],
    notebook: ["the thought needing ink instead of rehearsal", "the unfinished line asking for a decision"],
    kitchen: ["the routine asking to be fed before it is judged", "the first task needing a surface cleared"],
    money: ["the money question asking for numbers instead of worry", "the price, promise, or delay needing separation from self-worth"],
    room: ["the room asking for ten minutes of visible order", "the private mess asking for shape before interpretation"],
    door: ["movement before another inner meeting", "preparation instead of postponement"],
    body: ["the body refusing a yes that arrives too quickly", "the pause asking to be respected before agreement"],
    conversation: ["timing instead of force", "a reply smaller than the fear"],
    task: ["the list needing a named first item", "the draft asking to become real before it becomes good"],
    worry: ["the thought needing a closing ritual", "the old loop asking for a practical receipt"]
  };
  return pickLine(phrases[category] || ["the practical part asking for shape", "the pressure asking for a smaller container"], seed, scene);
}

function sceneCopyCategory(text) {
  const normalized = String(text || "").toLowerCase();
  if (/\b(water|glass|drink)\b/.test(normalized)) return "water";
  if (/\b(calendar|appointment|deadline|time)\b/.test(normalized)) return "calendar";
  if (/\b(notebook|page|pen|line|written|write)\b/.test(normalized)) return "notebook";
  if (/\b(kitchen|counter|tea|cup|meal|food|breakfast|lunch)\b/.test(normalized)) return "kitchen";
  if (/\b(wallet|receipt|payment|bill|price|money)\b/.test(normalized)) return "money";
  if (/\b(chair|room|desk|drawer|laundry|bed|domestic)\b/.test(normalized)) return "room";
  if (/\b(shoes|door|keys|bag|charger|errand)\b/.test(normalized)) return "door";
  if (/\b(mirror|shoulder|shoulders|jaw|body|breath)\b/.test(normalized)) return "body";
  if (/\b(conversation|sentence|call|answer|agree|yes|say|reply|word|words|unsent|send)\b/.test(normalized)) return "conversation";
  if (/\b(list|task|item|draft|work|promise)\b/.test(normalized)) return "task";
  if (/\b(tab|worry|thought|mind)\b/.test(normalized)) return "worry";
  return "general";
}

function timeBox(seed = 0) {
  return pickLine(["22-minute", "28-minute", "35-minute", "45-minute", "55-minute", "70-minute", "90-minute"], seed);
}

function closingEvidence(context, seed = 0) {
  const area = dailyAreaLabel(context.dailyArea);
  const details = [
    "the calendar slot kept",
    "the reply left short and true",
    "the oldest task named and closed",
    "the payment checked without self-punishment",
    "the first meal, water, or rest protected",
    "the draft made real before it was judged",
    "the limit stated without a speech",
    `the visible edge around ${area}`
  ];
  return pickLine(details, seed, area, context.stabilizer, context.workSignal);
}

function buildTaskFirstWisdom(user, context) {
  return `${sceneSeed(context)} points to the task that needs a cleaner shape. ${firstName(user.name)}, put ${context.workSignal} where it can be seen, then stop asking the mood to approve it. ${capitalize(context.emotionalKnot)} can turn a simple duty into a private test. Use ${context.stabilizer}, keep ${context.avoid} away from the next decision, and let one finished detail make the day feel less negotiable.`;
}

function buildBodyFirstWisdom(user, context) {
  return `${sceneSeed(context)} is the first clue, but the body gets the first vote. ${firstName(user.name)}, ${context.bodySignal} before explanations take over. ${capitalize(context.innerWeather)} becomes easier to trust when ${context.coreNeed} is treated as a real need, not a luxury. Give one practical task a clean finish, keep the conversation shorter than the worry around it, and let ${context.relationshipMirror} guide your pace without taking over your worth.`;
}

function buildRelationshipFirstWisdom(user, context) {
  return `${sceneSeed(context)} makes the relationship tone easier to read. ${capitalize(context.relationshipMirror)}, and that detail matters more than another long explanation. ${firstName(user.name)}, ${context.innerWeather} is not a weakness, but it does need direction. Do not spend the best part of the day managing ${context.avoid}; ${context.decisionGate} instead. By tonight, the plain choice becomes the one you respect most.`;
}

function buildQuietAuthorityWisdom(user, context) {
  return `${sceneSeed(context)} is where quiet authority can begin. ${firstName(user.name)}, protect the part of the day that still belongs to you. ${capitalize(context.timingTone)}, especially if ${context.emotionalKnot} starts making everything urgent. ${capitalize(context.workSignal)}. Then step back from ${context.avoid}; the cleaner choice is not the loudest one, it is the one you can stand behind after the mood passes.`;
}

function buildPressureReleaseWisdom(user, context) {
  return `${sceneSeed(context)} can make ${context.avoid} louder than it deserves. ${firstName(user.name)}, use ${context.stabilizer} as your private rule. If a conversation starts pulling you into defense, remember that ${context.relationshipMirror}. Finish the visible task, care for the body before the difficult moment, and let one completed action answer the doubt that words keep reopening.`;
}

function buildSceneFirstWisdom(user, context) {
  return `${sceneSeed(context)} can show you exactly where attention is leaking. ${firstName(user.name)}, do not turn ${context.emotionalKnot} into the manager of the whole day. ${capitalize(context.personalEdge)} by making one action physical: write it, send it, clean it, close it. When ${context.relationshipMirror}, respond with proportion. Your peace gets stronger when it has a shape.`;
}

function buildCoreNeedWisdom(user, context) {
  return `${sceneSeed(context)} shows why ${context.coreNeed} is not too much to ask from this day. ${firstName(user.name)}, the risk is not sensitivity; it is letting ${context.avoid} decide how much of yourself to spend. Give the body first priority: ${context.bodySignal}, then ${context.decisionGate}. A small, well-kept limit will protect more progress than proving your intention again.`;
}

function buildPersonalEdgeWisdom(user, context) {
  return `${sceneSeed(context)} is where the old rhythm tries to collect evidence. ${firstName(user.name)}, ${context.innerWeather} needs a practical container: ${context.stabilizer}. ${capitalize(context.personalEdge)} before the day turns it into a verdict. If ${context.relationshipMirror}, let that soften your reaction without erasing your position. A repeatable choice matters more than a dramatic breakthrough.`;
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
    return "Recognition is moving slower than your effort, but the work still needs one visible finish line.";
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

function sceneSeed(context, seed = stableHash(`${context.openingScene}-${context.dailyArea}`)) {
  const raw = String(context.openingScene || context.dailyScene || "one practical detail near you").toLowerCase();
  const variants = sceneVariants(raw);
  return capitalize(variants[mod(seed, variants.length)]);
}

function openingLine(scene, context, seed, salt = "", preferredBucket = "") {
  const lowerScene = lowerFirst(scene);
  const subject = sceneStatementSubject(scene, seed);
  const pressure = scenePressure(scene, seed + 2);
  const window = timeBox(seed + 3);
  const lines = [
    `Before you pass ${lowerScene} again, ${pressure} needs a ${window} answer.`,
    `When your attention lands on ${lowerScene}, let ${pressure} become the work.`,
    `Keep ${lowerScene} in view until the problem fits inside the next timed action.`,
    `Notice ${lowerScene} before the mind hires it as evidence against you.`,
    openingInstructionLine(scene, seed),
    `Use ${lowerScene} to begin with facts before the feeling starts editing them.`,
    stayWithSceneLine(lowerScene, seed),
    `Let ${lowerScene} mark the work that belongs to this hour, then leave the larger story outside.`,
    `Treat ${lowerScene} as a handle for the next decision, not a private courtroom.`,
    sceneExplanationLine(scene, seed),
    `Give ${lowerScene} a real use before worry turns it into a symbol.`,
    subjectPhysicalActionLine(subject, seed),
    returningSubjectLine(subject, seed),
    subjectVerdictLine(subject, seed)
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, scene, context.dailyArea, context.coreNeed, context.personalEdge);
}

function nameLine(name, context, seed) {
  const edge = edgePhrase(context.personalEdge || context.emotionalKnot || "turning a workable moment into a verdict", seed);
  const need = needPhrase(context.coreNeed || context.innerWeather || "room to move slowly", seed);
  const area = dailyAreaLabel(context.dailyArea);
  const edgeInstruction = lowerFirst(edge);
  const cost = compactAvoid(context.avoid || context.emotionalKnot);
  const lines = [
    `${name} needs to ${edgeInstruction}; let ${area} stay smaller than a test nobody assigned.`,
    delayCostLine(area, name, need, seed),
    containerAskLine(area, name, seed),
    `Give today's need a specific shape, ${name}, before the same problem changes costume again.`,
    sharperWorkLine(name, edgeInstruction, seed),
    delayHandledLine(area, name, seed),
    `Give ${area} a practical container, ${name}, while ${cost} is still small enough to interrupt.`,
    visibleChoiceLine(name, seed),
    timedNameActionLine(name, edgeInstruction, seed),
    `Separate ${need} from the noise around ${area}, ${name}, before you answer anything urgent.`,
    realNeedLine(area, name, need, seed),
    `Before ${area} becomes heavier than it has to be, ${name} needs to ${edgeInstruction}.`,
    `The real pressure around ${area}, ${name}, is ${cost}; give it a limit that can be checked.`,
    solveAreaLine(name, area, need, seed),
    `Under ${area}, ${name} is paying for ${cost}; put the cost where it can be seen.`,
    areaImperfectionLine(name, area, need, seed),
    `The honest work for ${name} is not a bigger mood; it is ${need} with a visible next use.`,
    `When ${area} gets noisy, ${name} needs ${need} before the next promise is made.`
  ];
  return pickLine(lines, seed, name, need, edge, area);
}

function dailyAreaLabel(area) {
  const lower = String(area || "").toLowerCase();
  if (lower.includes("money")) return "a money choice";
  if (lower.includes("relationship")) return "relationship timing";
  if (lower.includes("family")) return "family responsibility";
  if (lower.includes("health")) return "your body rhythm";
  if (lower.includes("public") || lower.includes("ambition")) return "the visible work";
  if (lower.includes("creative") || lower.includes("visibility")) return "your creative voice";
  if (lower.includes("friendship") || lower.includes("belonging")) return "belonging pressure";
  if (lower.includes("sleep") || lower.includes("closure")) return "private closure";
  if (lower.includes("learning") || lower.includes("discipline")) return "scattered attention";
  if (lower.includes("home")) return "home rhythm";
  if (lower.includes("conversation")) return "the repeated inner conversation";
  return "this part of life";
}

function actionLine(context, seed, salt = "") {
  const action = actionPhrase(context.decisionGate || context.mentorMove || context.stabilizer || "complete the nearest useful task", seed);
  const work = fragment(context.workSignal || "finish one practical detail");
  const body = fragment(context.bodySignal || "let the body settle before choosing words");
  const bodyAction = bodyInfinitiveClause(body);
  const avoid = avoidPhrase(context.avoid || "over-explaining", seed);
  const window = timeBox(seed);
  const close = closingEvidence(context, seed);
  const lines = [
    `Set a ${window} block to ${action}, then close the page, tab, or note that keeps reopening.`,
    `Make the next task visible: ${work}, then ${action}.`,
    `Check the body first through this rule: ${body}, with ${avoid} kept out of the room.`,
    `Give the next ${window} block a clear edge: ${action}, then stop auditioning the choice for applause.`,
    `Give the work a place by choosing to ${work}, while the extra possibilities stay unopened for now.`,
    actionBeforeMoodLine(action, seed),
    `Shrink the decision until it has today's size: ${action}.`,
    `Treat the body's vote as useful data by choosing to ${bodyAction}, then complete the nearest piece of work without dramatizing it.`,
    `Turn the insight into motion: ${work}, then let ${close} be enough for this block.`,
    `Give the action a time and place by choosing to ${action}.`,
    bodyLeadActionLine(body, seed),
    `Reduce the work to a visible movement: ${work}, and let the rest wait its turn.`
  ];
  return pickLine(lines, seed, salt, action, work, body, avoid, context.dailyArea, context.openingScene, context.coreNeed);
}

function bodyLine(context, seed, salt = "") {
  const body = fragment(context.bodySignal || "let the body settle before choosing words");
  const cue = bodyCueClause(body);
  const bodyMove = bodyMoveClause(body);
  const bodyPractice = bodyPracticeClause(body, stableHash([seed, context.openingScene, context.dailyArea, context.bodySignal].filter(Boolean).join("|")));
  const weather = innerWeatherClause(context.innerWeather || "the mood is asking for less noise");
  const avoid = avoidPhrase(context.avoid || "over-explaining", seed);
  const lines = [
    `Let ${cue} set the sequence before ${avoid} begins making the day louder.`,
    `The day becomes more useful when ${bodyPractice} comes before any final interpretation.`,
    `Keep the body in the room today: ${bodyMove}, then let the mind make a smaller claim.`,
    `Treat ${weather} as information, then let ${bodyPractice} set the timing.`,
    `Before the pressure gets a story, make the body real through ${bodyPractice}.`,
    bodyFirstConsiderationLine(avoid, seed),
    bodyInterpretationLine(bodyPractice, seed),
    bodyCareDecisionLine(seed, context),
    bodySequenceLine(bodyPractice, seed)
  ];
  return pickLine(lines, seed, salt, body, cue, weather, avoid, context.openingScene, context.dailyArea);
}

function areaImperfectionLine(name, area, need, seed = 0) {
  return pickLine([
    `${name} can leave ${area} unfinished long enough for ${need} to get a practical place to land.`,
    `${name} does not need to perfect ${area}; ${need} needs a visible next use first.`,
    `Let ${area} stay workable for ${name} while ${need} receives a clear task.`,
    `${name} can stop polishing ${area} and give ${need} somewhere useful to land.`,
    `${name} needs ${area} to become smaller before ${need} turns into another performance.`
  ], seed, name, area, need);
}

function delayCostLine(area, name, need, seed = 0) {
  return pickLine([
    `Before delay starts charging attention around ${area}, ${name} needs ${need}.`,
    `Before ${area} makes waiting feel like a bill, ${name} needs ${need}.`,
    `Before delay grows teeth around ${area}, ${name} needs ${need}.`,
    `Before waiting becomes the whole story around ${area}, ${name} needs ${need}.`,
    `Before ${area} turns one pause into a private cost, ${name} needs ${need}.`
  ], seed, area, name, need);
}

function bodyCareDecisionLine(seed = 0, context = {}) {
  return pickLine([
    "Food first, then the decision; hunger should not get to argue as instinct.",
    "Water and a slower breath can move the choice out of emergency mode.",
    "Rest deserves a vote before the mind turns pressure into a verdict.",
    "A fed body can answer the day without making every delay personal.",
    "The next decision needs a cared-for body more than another private hearing.",
    "A short walk or meal can make the useful answer easier to hear."
  ], seed, context.openingScene, context.dailyArea, context.bodySignal);
}

function relationLine(name, context, seed) {
  const relation = relationClause(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising", seed);
  const avoid = avoidPhrase(context.avoid || "over-explaining", seed);
  const lines = [
    `With other people, ${relation}; affection does not require unlimited access.`,
    conversationPullLine(seed, relation, avoid),
    `In the next conversation, ${lowerFirst(relation)}, so your pace softens without erasing your position.`,
    nextExchangeLine(seed),
    `Respond from proportion: kind, brief, and clear enough that resentment has less room.`,
    `Do not confuse care with staying open to every demand that arrives without timing.`,
    `If someone needs an answer, give one that respects both warmth and timing.`,
    `Let the next reply be useful and short enough to remain true.`,
    `Let the relationship stay simple here: ${lowerFirst(relation)}, while everything else waits its turn.`,
    relationshipLimitLine(avoid, seed),
    `Keep the door open only as far as your body can honestly support.`,
    kinderAnswerLine(seed)
  ];
  return pickLine(lines, seed, name, relation, avoid, context.dailyArea);
}

function relationCloseLine(context, seed, salt = "", preferredBucket = "") {
  const relation = relationClause(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising", seed);
  const permission = fragment(context.closingPermission || "one small finish can be enough");
  const close = closingEvidence(context, seed);
  const relationInstruction = lowerFirst(relation).replace(/^let\s+/i, "");
  const lines = [
    `Let the next reply stay plain: ${relationInstruction}, then keep the rest of the day modest and workable.`,
    `With other people, ${relation}; the day can still end with one useful detail finished.`,
    `Keep the answer simple enough to keep, and let ${close} count without decoration.`,
    `When the room asks for more explanation, ${relation}, and leave with one less loose end.`,
    `${capitalize(permission)}; let affection have timing without another performance.`,
    `A shorter answer and one closed task will support you better than solving the whole emotional weather.`,
    `Timed access will serve better than another performance.`,
    `Work closed and the reply shortened are enough to carry into evening.`
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, relation, permission, context.dailyArea);
}

function bodyTimingLine(body, seed = 0) {
  const anchor = compactBodyAnchor(body);
  return pickLine([
    `The body gives better timing when ${anchor} gets handled before the story grows.`,
    `The next choice lands cleaner after ${anchor} has been treated as real information.`,
    `${capitalize(anchor)} belongs early in the choice; pressure should not get the first microphone.`,
    `The decision gets less dramatic when ${anchor} is cared for first.`,
    `A practical body cue around ${anchor} can make the next answer easier to keep.`
  ], seed, body, anchor);
}

function relationshipTimingLine(seed = 0) {
  return pickLine([
    "With other people, access works better when timing is named before tenderness gets stretched.",
    "With other people, warmth needs a doorway before availability turns into resentment.",
    "With other people, closeness stays kinder when the hour and the limit are both visible.",
    "With other people, care holds better when the reply has a shape instead of an open tab.",
    "With other people, affection can stay present without making access endless."
  ], seed);
}

function silenceTimingLine(seed = 0) {
  return pickLine([
    "Plain timing can keep closeness warm without making silence do the wrong job.",
    "A timed answer protects affection better than leaving silence to explain everything.",
    "Closeness stays cleaner when silence is allowed to rest instead of punish.",
    "Good timing can keep warmth present without turning quiet into a test.",
    "A visible hour and a brief reply keep care from becoming constant access."
  ], seed);
}

function realNeedLine(area, name, need, seed = 0) {
  return pickLine([
    `The real need under ${area}, ${name}, is ${need}; give it one visible request.`,
    `${name} can protect ${need} under ${area} by giving support a shape instead of a performance.`,
    `Under ${area}, ${name} needs ${need} to become practical enough for someone to meet.`,
    `The quieter need for ${name} is ${need}; place it inside one request, time, or task.`,
    `${name} does not need to defend ${need}; it needs a form the day can actually hold.`
  ], seed, area, name, need);
}

function visibleChoiceLine(name, seed = 0) {
  return pickLine([
    `${name} protects the real need by giving the choice a visible edge before the argument grows.`,
    `${name} can make the choice visible early, while the argument is still small.`,
    `The real need gets safer when a visible choice gives ${name} a handle.`,
    `${name} protects the useful part by moving the choice out of the private debate.`,
    `A visible choice gives ${name} less to defend and more to complete.`
  ], seed, name);
}

function bodyInterpretationLine(bodyPractice, seed = 0) {
  return pickLine([
    `After ${bodyPractice}, the decision has a cleaner floor.`,
    `Let ${bodyPractice} happen before the decision gets oversized.`,
    `The next answer gets easier to trust once ${bodyPractice} is no longer postponed.`,
    `${capitalize(bodyPractice)} gives the mind less room to invent a crisis.`,
    `A decision made after ${bodyPractice} is less likely to borrow urgency.`
  ], seed, bodyPractice);
}

function relationshipLimitLine(avoid, seed = 0) {
  return pickLine([
    `When ${avoid} starts steering, answer only the piece that has a time and a real request.`,
    `If ${avoid} reaches for the wheel, ${relationshipLimitAction(seed)}.`,
    `Let ${avoid} lose authority by naming when you are available and what is actually being asked.`,
    `Where ${avoid} gets loud, make the answer smaller: one time, one limit, no extra defense.`,
    `Once ${avoid} tries to manage the room, keep the reply brief and survivable.`,
    `Give ${avoid} less room by answering the request instead of the atmosphere around it.`
  ], seed, avoid);
}

function relationshipLimitAction(seed = 0) {
  return pickLine([
    "name one available time and leave the reply unpolished",
    "choose the limit you can keep after the mood changes",
    "answer the request before you start managing the whole room",
    "make the reply shorter and let the boundary do its job",
    "put one edge around access before the explanation grows"
  ], seed);
}

function openingInstructionLine(scene, seed = 0) {
  return pickLine([
    `${scene} can return the day to the next thing that can be handled.`,
    `${scene} turns useful when it points to one action instead of another interpretation.`,
    `${scene} gives the pressure a handle if you let it stay ordinary.`,
    `${scene} is enough of a starting point; make it practical before it becomes symbolic.`,
    `${scene} moves the day toward a timed action instead of a larger story.`
  ], seed, scene);
}

function sceneExplanationLine(scene, seed = 0) {
  return pickLine([
    `${scene} shows where explanation has stopped doing useful work.`,
    `${scene} points to the place where fewer words would help more.`,
    `${scene} makes the pressure easier to handle when it stays practical.`,
    `${scene} belongs to the moment where action needs to replace rehearsal.`,
    `${scene} names the spot where the day wants a smaller answer.`
  ], seed, scene);
}

function subjectVerdictLine(subject, seed = 0) {
  return pickLine([
    `${subject} is carrying less weight than the story gathering around it.`,
    `${subject} deserves a practical answer before it becomes a private judgment.`,
    `${subject} is smaller than the meaning the mind keeps adding to it.`,
    `${subject} needs one ordinary use, not a larger case against the day.`,
    `${subject} should become a handle before it turns into evidence.`
  ], seed, subject);
}

function subjectPhysicalActionLine(subject, seed = 0) {
  const lowerSubject = lowerFirst(subject);
  return pickLine([
    `${subject} loses force once the next action has a visible edge.`,
    `A visible move gives ${lowerSubject} less room to grow.`,
    `${subject} softens when the practical step can be touched, sent, finished, or cleared.`,
    `The next action takes authority away from ${lowerSubject}.`,
    `${subject} stops growing when the next move is made physical.`
  ], seed, subject, lowerSubject);
}

function sharperWorkLine(name, edgeInstruction, seed = 0) {
  return pickLine([
    `The sharper work for ${name} is to ${edgeInstruction} before the moment starts collecting extra meaning.`,
    `${name}'s harder task is to ${edgeInstruction} while the next move still has a clear edge.`,
    `For ${name}, the useful discipline is to ${edgeInstruction} before pressure starts rewriting the scene.`,
    `${name} gets more freedom by choosing to ${edgeInstruction} while the choice is still practical.`,
    `The private work for ${name} is to ${edgeInstruction}; keep the moment from becoming a trial.`
  ], seed, name, edgeInstruction);
}

function timedNameActionLine(name, edgeInstruction, seed = 0) {
  return pickLine([
    `The urge to ${edgeInstruction}, ${name}, needs a timer more than another inner argument.`,
    `${name}, put ${edgeInstruction} into the next available block before the mind reopens the debate.`,
    `For ${name}, ${edgeInstruction} works better as a scheduled move than as another private rehearsal.`,
    `The useful answer for ${name} is to ${edgeInstruction} with a time limit and no courtroom afterward.`,
    `${name} can turn the urge to ${edgeInstruction} into one visible action before the story grows.`
  ], seed, name, edgeInstruction);
}

function delayHandledLine(area, name, seed = 0) {
  return pickLine([
    `A delay around ${area} can be handled without giving it authority over the whole day for ${name}.`,
    `${name} can meet the delay around ${area} without letting it become a personal verdict.`,
    `The delay inside ${area} needs a response from ${name}, not a scorecard for the day.`,
    `A slower turn around ${area} does not get to measure the whole day for ${name}.`,
    `${name} can answer the delay in ${area} with one practical move instead of a private trial.`
  ], seed, area, name);
}

function containerAskLine(area, name, seed = 0) {
  return pickLine([
    `${name} can give ${area} shape; let ${area} move before mood approval.`,
    `${area} is asking ${name} for shape, not a flawless inner state.`,
    `The useful request around ${area}, ${name}, is structure rather than a perfect mood.`,
    `${name} can give ${area} a container without proving readiness first.`,
    `Around ${area}, the work for ${name} is a visible container, not emotional polish.`
  ], seed, area, name);
}

function solveAreaLine(name, area, need, seed = 0) {
  return pickLine([
    `${name} does not have to solve ${area} by feeling ready; ${need} only needs a usable place to land.`,
    `${area} needs a time and place from ${name}, not a mood that feels complete.`,
    `${name} can give ${area} one practical holder while ${need} catches up.`,
    `Feeling ready is not required here; ${name} can give ${area} a time, place, and edge.`,
    `${name} can stop trying to solve ${area} internally and give ${need} a visible slot.`
  ], seed, name, area, need);
}

function actionBeforeMoodLine(action, seed = 0) {
  return pickLine([
    `Before the day scatters, ${action}; let the mood catch up to something already shaped.`,
    `Before attention splinters, ${action}; let the inner weather respond to evidence.`,
    `Before attention looks for ten exits, ${action}; give the hour something finished to hold.`,
    `Before the feeling asks for the final word, ${action}; make the practical part visible.`,
    `Before everything asks for a verdict, ${action}; make the day respond to motion first.`,
    `Before the story expands, ${action}; give the next hour proof it can hold.`,
    `Before the mind reopens the case, ${action}; let the practical part speak first.`
  ], seed, action);
}

function bodySequenceLine(bodyPractice, seed = 0) {
  return pickLine([
    `${capitalize(bodyPractice)} changes the timing before the decision gets oversized.`,
    `${capitalize(bodyPractice)} helps the next move arrive from care instead of pressure.`,
    `${capitalize(bodyPractice)} makes the decision easier to keep after the mood passes.`,
    `${capitalize(bodyPractice)} gives the practical answer somewhere firm to land.`,
    `${capitalize(bodyPractice)} lets the next choice come from a body that has been included.`,
    `${capitalize(bodyPractice)} keeps the decision from borrowing urgency it has not earned.`,
    `${capitalize(bodyPractice)} moves the answer out of the body's alarm system.`,
    `${capitalize(bodyPractice)} makes the next reply less dependent on pressure.`,
    `${capitalize(bodyPractice)} gives the mind fewer false signals to defend.`
  ], seed, bodyPractice);
}

function bodyFirstConsiderationLine(avoid, seed = 0) {
  return pickLine([
    `Consider the body first; ${avoid} can make the day sound larger than it is.`,
    `Give the body an early vote before ${avoid} starts enlarging the problem.`,
    `The practical body cue matters because ${avoid} can turn a small moment into weather.`,
    `Care for the body first so ${avoid} has less room to narrate the day.`,
    `The day shrinks to its real size when the body is considered before ${avoid}.`
  ], seed, avoid);
}

function bodyLeadActionLine(body, seed = 0) {
  return pickLine([
    `Let the body lead the timing through this move: ${body}, then choose the practical part with less noise.`,
    `Use the body as the first clock: ${body}, then handle only the piece that is actually ready.`,
    `Let ${body} set the order before the practical answer gets oversized.`,
    `Give the body its vote through this move: ${body}, then make the next action plain.`,
    `Start with the body cue, ${body}, and let the practical piece follow without a speech.`
  ], seed, body);
}

function stayWithSceneLine(lowerScene, seed = 0) {
  return pickLine([
    `Stay with ${lowerScene} until the next useful action has edges.`,
    `Stay near ${lowerScene} long enough to choose what can close before the next meal.`,
    `Let ${lowerScene} reduce the problem to one thing your hands can finish.`,
    `Keep ${lowerScene} ordinary until it points to the nearest workable move.`,
    `Use ${lowerScene} as the limit: handle one part, then stop widening the question.`
  ], seed, lowerScene);
}

function returningSubjectLine(subject, seed = 0) {
  return pickLine([
    `${subject} keeps returning because the practical answer has not been given a slot.`,
    `${subject} is back because attention needs somewhere smaller to land.`,
    `${subject} keeps showing up where a decision has been left without a handle.`,
    `${subject} has less to say once the next move gets a time and place.`,
    `${subject} is asking for action before it becomes another private argument.`
  ], seed, subject);
}

function conversationPullLine(seed = 0, relation = "", avoid = "") {
  return pickLine([
    "If a conversation asks for more, answer the real request before the fear adds extra pages.",
    "When a conversation keeps widening, let the reply stay useful, brief, and warm.",
    conversationExplanationLine(seed, relation, avoid),
    "When the exchange gets hungry for detail, return to the sentence that actually helps.",
    "If more words are requested, give the answer that can still feel true after evening."
  ], seed, relation, avoid);
}

function nextExchangeLine(seed = 0) {
  return pickLine([
    "The next exchange gets easier when the answer stops trying to manage every reaction.",
    "The next conversation can stay brief when the answer handles only what was asked.",
    "The next reply can respect the request without managing the whole atmosphere.",
    "The next exchange needs the useful answer, not a performance around everyone's reaction.",
    "The next conversation becomes lighter when the reply stops doing extra emotional work.",
    "Leave the extra explanation outside the room; the exchange will have more air.",
    "Keep warmth in the reply; leave performance out.",
    "The exchange will hold better when the answer stays brief and true."
  ], seed);
}

function kinderAnswerLine(seed = 0) {
  return pickLine([
    "The kinder answer is short enough to keep after the mood changes.",
    "A kind answer should not leave resentment doing the cleanup later.",
    "The answer that can be kept without self-punishment is the one to trust.",
    "Kindness works better when the reply does not secretly invoice you later.",
    "The useful answer protects care without making you pay for it afterward."
  ], seed);
}

function conversationExplanationLine(seed = 0, relation = "", avoid = "") {
  const pressure = compactAvoid(avoid || relation);
  return pickLine([
    `If more explanation is requested, answer the part that belongs to ${pressure}.`,
    "If someone keeps asking for detail, give the sentence that can be kept without resentment.",
    "When more explanation is pulled from you, offer the useful part and stop decorating it.",
    "If the room wants another version, return to the request that is actually present.",
    "When the reply starts expanding, keep the human part warm and the extra defense out."
  ], seed, relation, avoid, pressure);
}

function smallRepairClosingLine(seed = 0) {
  return pickLine([
    "Protect the repair you can finish, then let the quiet afterward count.",
    "Keep the repair small enough to complete, and leave the remaining noise outside it.",
    "Let one repair stay plain; the day does not need a dramatic ending to improve.",
    "Finish the repair that is in reach, then let the unfinished story lose volume.",
    "Give the small repair a clean ending before another explanation takes its place."
  ], seed);
}

function repeatedLoopClosingLine(seed = 0) {
  return pickLine([
    "Close the loop before it asks for a new costume.",
    "Let the loop end before it requests another rehearsal.",
    "Stop the loop while the answer is still plain enough to keep.",
    "Leave the repeated question closed once the practical piece is done.",
    "End the return trip before the mind asks for fresh evidence."
  ], seed);
}

function plainWorkableClosingLine(seed = 0) {
  return pickLine([
    "A plain, workable finish can carry this evening.",
    "Let workable beat impressive where the day actually needs relief.",
    "A plain finish can serve better than a performance of control.",
    "Workable deserves the first chair; impressive can wait outside.",
    "Let the useful thing stay plain enough to repeat."
  ], seed);
}

function bodyBelievesClosingLine(seed = 0) {
  return pickLine([
    "The body trusts what stays finished more than what gets explained perfectly.",
    "A finished thing reaches the body faster than another polished explanation.",
    "The body can rest around completion before it rests around perfect wording.",
    "What stays finished will speak to the body more clearly than another explanation.",
    "The body believes repetition, closure, and care before it believes a perfect speech."
  ], seed);
}

function concreteEvidenceClosingLine(seed = 0) {
  return pickLine([
    "Let the evidence stay practical: one limit, one closed task, one less braced body.",
    "Keep the proof concrete enough to see, finish, or feel in the body.",
    "A kept limit, closed task, or softer body can be enough evidence for tonight.",
    "Let practical proof count before the mind asks for another argument.",
    "The evidence can stay modest: something closed, something kept, something less tense."
  ], seed);
}

function plainWorkClosingLine(seed = 0, close = "") {
  return pickLine([
    `Plain work around ${close} can carry enough truth for tonight.`,
    `${capitalize(close)} can hold more weight than another polished explanation.`,
    "Let the practical finish count before the mind asks for prettier evidence.",
    "The plain finish deserves trust before another explanation gets invited in.",
    "Work that is closed, visible, and modest can carry the evening."
  ], seed, close);
}

function keptPromiseClosingLine(seed = 0) {
  return pickLine([
    "Let the quiet after a kept promise count without asking it to perform.",
    "A promise kept quietly can be enough evidence for the evening.",
    "Once the promise is kept, do not make the silence prove anything extra.",
    "The space after follow-through deserves to stay undecorated.",
    "Let the completed promise lower the volume without another speech."
  ], seed);
}

function keptPromiseTrustLine(seed = 0) {
  return pickLine([
    "Finish it; explanation can wait.",
    "A kept promise gives the mind less room to request perfect wording.",
    "Follow-through can earn trust without asking the mood to approve it first.",
    "You can let the completed promise matter more than the perfect explanation.",
    "The promise you keep will do more than another explanation rehearsed alone."
  ], seed);
}

function bodyCueClause(text) {
  const value = fragment(text);
  if (!value) return "the body's practical cue";
  if (/^do not\b/i.test(value)) {
    return `the cue to ${lowerFirst(value).replace(/^do not\b/i, "avoid")}`;
  }
  if (/^(eat|leave|walk|sleep|drink|lower|protect|notice|step|start|let)\b/i.test(value)) {
    return `the cue to ${lowerFirst(value)}`;
  }
  return `the body cue to ${lowerFirst(value)}`;
}

function bodyMoveClause(text) {
  const value = fragment(text);
  if (!value) return "let the body settle before choosing words";
  if (/^do not\b/i.test(value)) {
    return lowerFirst(value).replace(/^do not\b/i, "avoid");
  }
  if (/^sleep matters more than\b/i.test(value)) {
    return lowerFirst(value).replace(/^sleep matters\b/i, "let sleep matter");
  }
  return lowerFirst(value);
}

function bodyInfinitiveClause(text) {
  const value = fragment(text);
  if (!value) return "let the body settle before choosing words";
  if (/^do not\b/i.test(value)) {
    return lowerFirst(value).replace(/^do not\b/i, "avoid");
  }
  if (/^sleep matters more than\b/i.test(value)) {
    return lowerFirst(value).replace(/^sleep matters\b/i, "let sleep matter");
  }
  if (/^(eat|leave|walk|drink|lower|protect|notice|step|start|let)\b/i.test(value)) {
    return lowerFirst(value);
  }
  return `honor ${lowerFirst(value)}`;
}

function bodyPracticeClause(text, seed = 0) {
  const value = fragment(text);
  if (!value) return "letting the body settle before choosing words";
  if (/^drink water before calling it intuition\b/i.test(value)) {
    return pickLine([
      "drinking water before trusting the first interpretation",
      "letting water come before the meaning-making",
      "using water as the first answer before naming a signal",
      "drinking first so the body gets a vote before the story",
      "pausing for water before treating the feeling as guidance",
      "taking the glass seriously before the mind names the pressure",
      "letting one drink interrupt the rush to interpret",
      "putting water between the first reaction and the answer",
      "giving thirst a practical answer before calling the mood wise",
      "using the next sip to slow the verdict down",
      "letting the body be hydrated before the thought becomes instruction",
      "answering thirst before letting instinct run the meeting"
    ], seed, value);
  }
  const replacements = [
    [/^do not negotiate\b/i, "not negotiating"],
    [/^eat\b/i, "eating"],
    [/^leave\b/i, "leaving"],
    [/^walk\b/i, "walking"],
    [/^sleep matters\b/i, "letting sleep matter"],
    [/^drink\b/i, "drinking"],
    [/^lower\b/i, "lowering"],
    [/^protect\b/i, "protecting"],
    [/^notice\b/i, "noticing"],
    [/^step\b/i, "stepping"],
    [/^start\b/i, "starting"],
    [/^let\b/i, "letting"]
  ];
  const match = replacements.find(([pattern]) => pattern.test(value));
  if (match) return lowerFirst(value).replace(match[0], match[1]);
  return `honoring ${lowerFirst(value)}`;
}

function innerWeatherClause(text) {
  const value = fragment(text);
  if (!value) return "the mood asking for less noise";
  if (value.includes(",")) {
    return lowerFirst(value).replace(/\s*,\s*/g, " and ");
  }
  if (/^(restless|sensitive|tired|sharp|protective|drawn|more|quietly)\b/i.test(value)) {
    return `the fact that you are ${lowerFirst(value)}`;
  }
  return lowerFirst(value);
}

function relationClause(text, seed = 0) {
  const value = fragment(text)
    .replace(/\bmay be\b/gi, "is")
    .replace(/\bmay\b/gi, "can");
  const normalized = value.toLowerCase();
  if (normalized.includes("listening inform")) {
    return pickLine([
      "listen without making the whole problem yours",
      "take in the signal without volunteering for every consequence",
      "let the words teach you something without handing them the wheel"
    ], seed, value);
  }
  if (normalized.includes("uncertainty")) {
    return pickLine([
      "leave another person's uncertainty on their side of the table",
      "answer the part that belongs to you and stop carrying the rest",
      "do not turn someone else's uncertainty into your assignment"
    ], seed, value);
  }
  if (normalized.includes("shorter")) {
    return pickLine([
      "use the shorter reply before fear starts decorating it",
      "say the clean version and stop before fear adds ornaments",
      "let the reply stay brief enough to remain true"
    ], seed, value);
  }
  if (normalized.includes("warmth")) {
    return pickLine([
      "give warmth a time and a doorway",
      "keep access timed without making affection disappear",
      "let closeness arrive with shape instead of constant availability"
    ], seed, value);
  }
  return value;
}

function sceneVariants(raw) {
  if (raw.includes("half-closed") && raw.includes("conversation")) {
    return [
      "a door half-closed before the conversation",
      "the half-closed door before words",
      "the door left half-closed while the conversation waits"
    ];
  }
  if (raw.includes("water glass")) {
    return [
      "the water by the bed",
      "a half-finished glass near the bed",
      "the first sip of water"
    ];
  }
  if (raw.includes("calendar")) {
    return [
      "one calendar square",
      "the appointment you keep moving",
      "a date on the calendar"
    ];
  }
  if (raw.includes("notebook")) {
    return [
      "the unfinished notebook line",
      "a blank page",
      "the pen waiting nearby"
    ];
  }
  if (/\bpen\b/.test(raw) || raw.includes("decision you already understand")) {
    return [
      "the pen waiting beside the decision",
      "a decision you already understand",
      "the line you have not written yet"
    ];
  }
  if (raw.includes("kitchen counter")) {
    return [
      "the kitchen counter before the first practical task",
      "one object on the kitchen counter",
      "the counter you keep passing"
    ];
  }
  if (raw.includes("wallet") || raw.includes("receipt") || raw.includes("payment")) {
    return [
      "the wallet or receipt in reach",
      "a small payment decision",
      "the bill near you"
    ];
  }
  if (raw.includes("chair")) {
    return [
      "the chair where the same worry returns",
      "the chair where overthinking usually sits",
      "that repeated worry in its familiar chair"
    ];
  }
  if (raw.includes("shoes") || raw.includes("door")) {
    return [
      "the shoes by the door",
      "a door half-closed",
      "the errand waiting near the doorway"
    ];
  }
  if (raw.includes("desk")) {
    return [
      "one desk corner",
      "the visible mess on the desk",
      "the workspace before a bigger plan"
    ];
  }
  if (raw.includes("meal")) {
    return [
      "the delayed first meal",
      "breakfast sliding later",
      "the meal you keep postponing"
    ];
  }
  if (raw.includes("list")) {
    return [
      "the list that grew overnight",
      "one line on the list",
      "the task list with one real promise inside it"
    ];
  }
  if (raw.includes("cup")) {
    return [
      "the cooling cup",
      "tea going quiet beside you",
      "the cup cooling nearby"
    ];
  }
  if (raw.includes("bag") || raw.includes("keys") || raw.includes("charger")) {
    return [
      "the bag gathered too late",
      "keys and charger gathered late",
      "the bag, keys, or charger by the door"
    ];
  }
  if (raw.includes("mirror")) {
    return [
      "the mirror moment before agreement",
      "the mirror before the quick yes",
      "the pause at the mirror"
    ];
  }
  if (raw.includes("tab")) {
    return [
      "the old mental tab",
      "one thought left open too long",
      "the unfinished tab in your mind"
    ];
  }
  if (raw.includes("sentence")) {
    return [
      "the sentence left unsent",
      "a quiet room after held-back words",
      "the words you did not send"
    ];
  }
  if (raw.includes("laundry") || raw.includes("drawer")) {
    return [
      "folded laundry and an open drawer",
      "the drawer left open",
      "a domestic drawer detail you keep passing"
    ];
  }

  return [
    raw || "one practical detail near you",
    "one ordinary detail is trying to return your attention",
    "the nearest unfinished thing is smaller than the story around it"
  ];
}

function closingLine(context, seed, salt = "", preferredBucket = "") {
  const close = closingEvidence(context, seed);
  const lines = [
    `${capitalize(close)} will change the room before it changes the whole story.`,
    "A closed loop can stand in for the certainty the mind keeps requesting.",
    `By evening, let ${close} carry more weight than the mood you refused to obey.`,
    `The useful evidence today is ${close}, not another explanation with better lighting.`,
    closingPermissionLine(context.closingPermission, seed),
    "A specific finish will do more for your confidence than another hour of private negotiation.",
    bodyBelievesClosingLine(seed),
    "Leave the day with one less loose end and one fewer explanation than usual.",
    plainWorkableClosingLine(seed),
    smallRepairClosingLine(seed),
    keptPromiseTrustLine(seed),
    "One handled detail is enough to remind the day that you are participating.",
    "Let the finish be modest; the nervous system believes repetition more than intensity.",
    concreteEvidenceClosingLine(seed),
    repeatedLoopClosingLine(seed),
    plainWorkClosingLine(seed, close),
    keptPromiseClosingLine(seed)
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, context.dailyArea, context.closingPermission, context.innerWeather, context.personalEdge);
}

function closingPermissionLine(permission, seed = 0) {
  const phrase = fragment(permission || "one small finish can be enough");
  if (!phrase) return "Let the larger question wait until one small finish has had time to count.";
  if (/self-respect can be quiet/i.test(phrase)) {
    return pickLine([
      "Self-respect does not need to raise its voice to be final.",
      "A quiet self-respecting answer can still close the matter.",
      "Self-respect can stay gentle and still refuse to reopen the door.",
      "The final answer can be quiet without becoming weak.",
      "A quiet limit is still a limit when it is kept."
    ], seed, phrase);
  }
  if (/^(one|a)\b/i.test(phrase)) {
    return `${capitalize(phrase)}; let that stand before you reopen the larger question.`;
  }
  return `${capitalize(phrase)}.`;
}

function parseArchitectureConstraints(architecture) {
  return {
    sentenceCount: Number(String(architecture || "").match(/^(\d+) sentences?/)?.[1] || 5),
    nameSentence: Number(String(architecture || "").match(/first name plus [^;]+ in sentence (\d+)/)?.[1] || 0),
    openingBucket: String(architecture || "").match(/Opening bucket:\s*([a-z]+)/i)?.[1]?.toLowerCase() || "",
    finalBucket: String(architecture || "").match(/Final bucket:\s*([a-z]+)/i)?.[1]?.toLowerCase() || "",
    imperativeTarget: Number(String(architecture || "").match(/Imperative target:\s*(\d+)/i)?.[1] || Number.NaN)
  };
}

function matchesArchitectureConstraints(text, name, constraints) {
  const sentences = splitSentences(text);
  if (constraints.sentenceCount && sentences.length !== constraints.sentenceCount) return false;
  if (constraints.nameSentence) {
    const nameIndex = sentences.findIndex((sentence) => countWord(sentence, name) > 0);
    if (nameIndex !== constraints.nameSentence - 1) return false;
  }
  if (constraints.openingBucket && sentenceOpeningBucket(sentences[0]) !== constraints.openingBucket) return false;
  if (constraints.finalBucket && sentenceOpeningBucket(sentences.at(-1)) !== constraints.finalBucket) return false;
  if (Number.isFinite(constraints.imperativeTarget)) {
    const imperativeCount = sentences.filter((sentence) => sentenceOpeningBucket(sentence) === "imperative").length;
    if (imperativeCount !== constraints.imperativeTarget) return false;
  }
  return true;
}

function linesForBucket(lines, preferredBucket) {
  if (!preferredBucket) return lines;
  const filtered = lines.filter((line) => sentenceOpeningBucket(line) === preferredBucket);
  return filtered.length ? filtered : lines;
}

function splitSentences(text) {
  return String(text || "")
    .trim()
    .match(/[^.!?]+[.!?]+/g)
    ?.map((sentence) => sentence.trim()) || [];
}

function sentenceOpeningBucket(sentence) {
  const normalized = String(sentence || "").toLowerCase().trim();
  if (/^(answer|begin|check|choose|close|decline|do|drink|eat|finish|give|handle|keep|leave|let|make|name|notice|protect|put|reduce|respond|schedule|send|separate|set|shrink|stand|stop|take|treat|use|wait|walk|write)\b/.test(normalized)) {
    return "imperative";
  }
  if (/^(before|after|by evening|if|when|where|with)\b/.test(normalized)) {
    return "condition";
  }
  if (/^[a-z]+,\b/.test(normalized)) {
    return "name";
  }
  if (/^(a|an|the|one|your|that|this)\b/.test(normalized)) {
    return "scene";
  }
  return "statement";
}

function countWord(text, word) {
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function normalizeLocalWisdom(text) {
  return cleanWisdomText(text, text, 100);
}

function fragment(text) {
  return String(text || "").replace(/[.!?]+$/g, "").trim();
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

function lowerFirst(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function pickLine(lines, ...parts) {
  return lines[mod(stableHash(parts.filter(Boolean).join("|")), lines.length)];
}

function pickDistinctLine(lines, seed, usedLines = new Set(), ...parts) {
  const start = mod(stableHash([seed, ...parts].filter(Boolean).join("|")), lines.length);
  for (let offset = 0; offset < lines.length; offset += 1) {
    const candidate = lines[mod(start + offset, lines.length)];
    if (!usedLines.has(candidate)) return candidate;
  }
  return lines[start];
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

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mod(value, length) {
  return ((value % length) + length) % length;
}
