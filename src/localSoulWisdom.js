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
    release: toCue(context.avoid)
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

  const compactPlan = buildCompactArchitecturePlan({
    name,
    context,
    constraints,
    seed
  }).join(" ");
  const compactWordCount = words(compactPlan).length;
  if (compactWordCount >= 72 && compactWordCount <= 100 && matchesArchitectureConstraints(compactPlan, name, constraints) && !isLowQualityWisdom(compactPlan)) {
    return compactPlan;
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
  const subject = compactSceneSubject(scene);
  const lines = {
    condition: [
      `When ${lowerScene} pulls attention, keep the day inside one choice you can handle by hand.`,
      `Before ${lowerScene} becomes a symbol, bring the day back to one ordinary repair.`,
      `With ${lowerScene} in view, the next honest action matters more than the whole mood.`
    ],
    scene: [
      `The detail of ${lowerScene} points to one repair that belongs to today, not the whole story.`,
      `That ordinary detail around ${lowerScene} brings the day back to one repair.`,
      `One small signal in ${lowerScene} belongs to action, not the whole story.`
    ],
    statement: [
      `${subject} points to one repair that belongs to today, not the whole story.`,
      `Attention returning to ${lowerScene} is asking for handling, not another private trial.`,
      `Unfinished business around ${lowerScene} is smaller than the meaning forming around it.`
    ],
    imperative: [
      `Notice ${lowerScene} before the mind turns it into evidence against the whole day.`,
      `Use ${lowerScene} as the first handle, then let the larger mood wait outside.`,
      `Keep ${lowerScene} ordinary long enough for one practical choice to appear.`
    ]
  };
  return pickDistinctLine(lines[preferredBucket] || lines.statement, seed, new Set(), lowerScene, preferredBucket);
}

function compactNameLine(name, context, seed, imperative, usedLines = new Set()) {
  const area = dailyAreaLabel(context.dailyArea);
  const need = compactNeed(context.coreNeed || context.innerWeather, seed);
  const lines = imperative ? [
    `Give ${area} a smaller job, ${name}, before the day starts sounding like a test.`,
    `Make ${area} practical for ${name} before pressure turns it into a larger story.`,
    `Keep ${area} inside one honest container, ${name}, while the rest waits its turn.`
  ] : [
    `For ${name}, ${need} needs one practical shape before ${area} starts sounding like a test.`,
    `Under ${area}, ${name} needs ${need} more than another inner debate.`,
    `Around ${area}, ${name} can protect ${need} through one observable choice.`
  ];
  return pickDistinctLine(lines, seed, usedLines, name, area, need);
}

function compactFillerLine(context, seed, imperative, usedLines = new Set()) {
  const area = dailyAreaLabel(context.dailyArea);
  const body = compactBodyAnchor(context.bodySignal);
  const avoid = compactAvoid(context.avoid || context.emotionalKnot);
  const imperativeLines = [
    "Handle one useful task before the larger story asks for another meeting.",
    "Keep the next reply short enough to remain kind, honest, and complete.",
    "Protect the body's timing first, then let the decision become smaller.",
    "Finish one ordinary repair before you measure the whole day again.",
    "Reduce the work to one move that can be done before the next meal.",
    "Choose the plain action first, then let the emotional weather report later.",
    "Name the limit once, then stop decorating it for easier approval."
  ];
  const statementLines = [
    `The body steadies when ${body} gets attention before interpretation.`,
    "A shorter reply can keep warmth present without making every feeling your assignment.",
    "One finished task will carry the decision better than another hour of circling.",
    `The habit of ${avoid} gets quieter when the next choice has a clear edge.`,
    "With other people, warmth needs timing before access becomes resentment.",
    `Your energy returns faster when ${area} is handled before the mood is explained.`,
    `A practical boundary gives ${area} shape before effort starts arguing with mood.`,
    `${capitalize(area)} needs a clean container, not another argument with the mood.`,
    compactAreaLine(context),
    "Plain timing can protect warmth without turning silence into punishment."
  ];
  return pickDistinctLine(imperative ? imperativeLines : statementLines, seed, usedLines, area, body, avoid);
}

function compactClosingLine(context, preferredBucket = "", seed = 0) {
  const lines = {
    condition: [
      "When evening comes, count the handled detail before you believe the unfinished mood.",
      "If pressure returns, answer it with the task already finished in your hands.",
      "With less performance, the day can end around one thing honestly completed.",
      "Before night, let the completed task answer louder than the unsettled mood.",
      "After the practical repair is done, leave the larger interpretation for tomorrow.",
      "When the next doubt arrives, point it toward the evidence already handled."
    ],
    scene: [
      "The finished detail can be enough evidence for tonight, even if the mood stays unfinished.",
      "One ordinary repair can hold the place of certainty until tomorrow.",
      "This practical finish deserves more respect than another perfect explanation."
    ],
    statement: [
      "Plain evidence will carry more truth tonight than another perfect explanation.",
      "Finished work and a cleaner reply are enough to carry into evening.",
      "Ordinary completion deserves more respect than the mood still asking questions."
    ],
    imperative: [
      "Let the finish stay modest, complete, and free from extra explanation.",
      "Keep the proof ordinary, then stop reopening the larger question tonight.",
      "Leave the day with one clean ending and one fewer explanation."
    ]
  };
  const bucketLines = lines[preferredBucket] || lines.statement;
  return pickDistinctLine(bucketLines, seed, new Set(), context.dailyArea, context.closingPermission);
}

function compactSceneSubject(scene) {
  const stripped = lowerFirst(scene).replace(/^(the|a|an|one|your|that|this)\s+/i, "");
  return `Pressure around ${stripped || "one ordinary detail"}`;
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

function compactAreaLine(context) {
  const area = String(context.dailyArea || "").toLowerCase();
  if (area.includes("learning") || area.includes("scattered")) {
    return "Scattered attention settles when one object receives one honest job.";
  }
  if (area.includes("public") || area.includes("ambition") || area.includes("recognition")) {
    return "Delayed recognition needs one finished piece, not another argument with effort.";
  }
  if (area.includes("money")) {
    return "A money choice becomes cleaner when value and price stop sharing a chair.";
  }
  if (area.includes("relationship")) {
    return "The relationship tone improves when timing matters as much as tenderness.";
  }
  if (area.includes("family")) {
    return "Family care becomes lighter when duty is shaped before resentment gathers.";
  }
  if (area.includes("health") || area.includes("body")) {
    return "The body gives clearer instructions once pressure stops pretending to be urgency.";
  }
  return "The practical part becomes easier when it is named before the mood expands.";
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
  const lines = [
    `Before you pass ${lowerScene} again, give it one job instead of a whole argument.`,
    `When your attention lands on ${lowerScene}, the useful part is the detail you can handle by hand.`,
    `Keep ${lowerScene} in view until the day becomes about one kept action, not the whole mood.`,
    `Notice ${lowerScene} before the mind hires it as evidence against you.`,
    `${scene} can pull the day back into reach if you let it stay ordinary.`,
    `Use ${lowerScene} to begin with facts before the feeling starts editing them.`,
    `Stay with ${lowerScene} until the day narrows to the action you can actually finish.`,
    `Let ${lowerScene} mark the repair that belongs to this hour, not the whole meaning of the day.`,
    `Treat ${lowerScene} as a handle for the next decision, not a verdict on the whole day.`,
    `${scene} belongs to the part of the day that needs less explaining and more handling.`,
    `Give ${lowerScene} one plain use before worry turns it into a symbol.`,
    `Pressure around ${lowerScene} loses force when the next action is physical.`,
    `Attention returns to ${lowerScene} because one clear repair is overdue.`,
    `Unfinished business around ${lowerScene} is smaller than the verdict forming around it.`
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, scene, context.dailyArea, context.coreNeed, context.personalEdge);
}

function nameLine(name, context, seed) {
  const edge = fragment(context.personalEdge || context.emotionalKnot || "turning a workable moment into a verdict");
  const need = fragment(context.coreNeed || context.innerWeather || "room to move slowly");
  const area = dailyAreaLabel(context.dailyArea);
  const edgeInstruction = lowerFirst(edge);
  const lines = [
    `For ${name}, ${edgeInstruction} before ${area} starts sounding like a test nobody assigned.`,
    `Before the pressure around ${area} borrows the whole room, ${name} needs ${need}.`,
    `Around ${area}, ${name} is not being asked for a perfect mood, only one clean shape.`,
    `Give today's need a specific shape, ${name}, or the whole day will start sounding like the same problem.`,
    `For ${name}, the sharper work is to ${edgeInstruction} without turning the moment into a measure of worth.`,
    `A delay around ${area} does not get to decide the whole tone for ${name}.`,
    `Give ${area} a practical container, ${name}, while you practice this: ${edge}.`,
    `For ${name}, one observable choice protects the real need better than another internal argument.`,
    `For ${name}, the urge to ${edgeInstruction} needs a timed action, not another private debate.`,
    `Separate ${need} from the noise around ${area}, ${name}, before you answer anything urgent.`,
    `The real need under ${area}, ${name}, is ${need}; protect it with ordinary support.`,
    `Before ${area} becomes heavier than it has to be, ${name} needs to ${edgeInstruction}.`
  ];
  return pickLine(lines, seed, name, need, edge, area);
}

function dailyAreaLabel(area) {
  const lower = String(area || "").toLowerCase();
  if (lower.includes("money")) return "a money choice";
  if (lower.includes("relationship")) return "the relationship tone";
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
  const action = fragment(context.decisionGate || context.mentorMove || context.stabilizer || "complete the nearest useful task");
  const work = fragment(context.workSignal || "finish one practical detail");
  const body = fragment(context.bodySignal || "let the body settle before choosing words");
  const bodyAction = bodyInfinitiveClause(body);
  const avoid = fragment(context.avoid || "over-explaining");
  const lines = [
    `For the next hour, ${action}, then leave the larger story alone until the task has shape.`,
    `Make the next useful task visible by pairing ${work} with one plain instruction: ${action}.`,
    `Check the body first through this simple rule: ${body}, with ${avoid} kept out of the room.`,
    `Give the next hour one clear edge: ${action}, then stop negotiating with the part that wants applause.`,
    `Give the work a plain place by choosing to ${work}, while the extra possibilities stay unopened for now.`,
    `Before the day scatters, ${action}; let the feeling respond after the action has form.`,
    `Shrink the decision until it can be done today: ${action}.`,
    `Treat the body's vote as useful data by choosing to ${bodyAction}, then complete the nearest piece of work without dramatizing it.`,
    `Care becomes practical here: ${work}, with no further negotiation from the mood.`,
    `Give the action a time and a place by choosing to ${action}.`,
    `Let the body lead the timing through this move: ${body}, then handle the practical part after that.`,
    `Reduce the work to one visible movement: ${work}, and let the rest wait its turn.`
  ];
  return pickLine(lines, seed, salt, action, work, body, avoid, context.dailyArea, context.openingScene, context.coreNeed);
}

function bodyLine(context, seed, salt = "") {
  const body = fragment(context.bodySignal || "let the body settle before choosing words");
  const cue = bodyCueClause(body);
  const bodyMove = bodyMoveClause(body);
  const bodyPractice = bodyPracticeClause(body);
  const weather = innerWeatherClause(context.innerWeather || "the mood is asking for less noise");
  const avoid = fragment(context.avoid || "over-explaining");
  const lines = [
    `Let ${cue} set the sequence before ${avoid} begins making the day louder.`,
    `The mood becomes more useful when ${cue} comes before any final interpretation.`,
    `Keep the body in the room today: ${bodyMove}, then let the mind make a smaller claim.`,
    `Treat ${weather} as information, but let ${cue} decide the pace of the next move.`,
    `Before the pressure gets a story, give the body one plain vote through ${bodyPractice}.`,
    `The body deserves a practical vote here because ${avoid} will make the day sound larger than it is.`
  ];
  return pickLine(lines, seed, salt, body, cue, weather, avoid, context.openingScene, context.dailyArea);
}

function relationLine(name, context, seed) {
  const relation = relationClause(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising", seed);
  const avoid = fragment(context.avoid || "over-explaining");
  const lines = [
    `With other people, ${relation}; warmth does not require unlimited availability.`,
    `If a conversation pulls for more, keep the answer shorter than the worry around it.`,
    `In the next conversation, ${lowerFirst(relation)}, so your pace softens without erasing your position.`,
    `The relationship tone improves when you stop offering extra words just to calm the air.`,
    `Respond from proportion: kind, brief, and clear enough that resentment has less room.`,
    `Do not confuse care with staying open to every demand that arrives without timing.`,
    `If someone needs an answer, give one that respects both warmth and timing.`,
    `Let the next reply be useful and short enough to remain true.`,
    `Let the relationship stay simple here: ${lowerFirst(relation)}, while everything else waits its turn.`,
    `Where ${avoid} usually takes over, answer with a clean time, a clean no, or a clean yes.`,
    `Keep the door open only as far as your body can honestly support.`,
    `The kinder answer is the one you can keep without quietly punishing yourself later.`
  ];
  return pickLine(lines, seed, name, relation, avoid, context.dailyArea);
}

function relationCloseLine(context, seed, salt = "", preferredBucket = "") {
  const relation = relationClause(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising", seed);
  const permission = fragment(context.closingPermission || "one small finish can be enough");
  const lines = [
    `Let the next reply stay plain: ${lowerFirst(relation)}, then let the rest of the day stay modest and workable.`,
    `With other people, ${relation}; the day can still end with one useful detail finished.`,
    `Keep the answer simple enough to keep, and let one ordinary finish count without decoration.`,
    `When the room asks for more explanation, ${relation}, and leave with one less loose end.`,
    `${capitalize(permission)}; let warmth have timing without another performance.`,
    `A cleaner reply and one finished task will support you better than solving the whole emotional weather.`,
    `Warmth with timing will serve better than another performance.`,
    `Finished work and a cleaner reply are enough to carry into evening.`
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, relation, permission, context.dailyArea);
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

function bodyPracticeClause(text) {
  const value = fragment(text);
  if (!value) return "letting the body settle before choosing words";
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
      "keys gathered late",
      "the bag by the door",
      "a missing charger or key"
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
      "a domestic detail you keep passing"
    ];
  }

  return [
    raw || "one practical detail near you",
    "one ordinary detail is trying to return your attention",
    "the nearest unfinished thing is smaller than the story around it"
  ];
}

function closingLine(context, seed, salt = "", preferredBucket = "") {
  const lines = [
    "A completed detail will change the room before it changes the whole mood.",
    "One clean finish can stand in for the certainty the mind keeps requesting.",
    "By evening, give more credit to the handled detail than to the mood you kept trying to perfect.",
    "The useful proof today is a kept limit, a finished task, or one reply with no extra weight.",
    closingPermissionLine(context.closingPermission),
    "A plain finish will do more for your confidence than another hour of private negotiation.",
    "The body will believe what stays finished before it believes another perfect explanation.",
    "Leave the day with one less loose end and one fewer explanation than usual.",
    "Plain and workable will serve you better than impressive.",
    "Protect the small repair, then let silence do some of the healing.",
    "You will trust yourself more after a kept promise than after a perfect explanation.",
    "One ordinary repair is enough to remind the day that you are participating.",
    "Let the finish be modest; the nervous system believes repetition more than intensity.",
    "Let the evidence stay ordinary: a limit kept, a task closed, a body less braced.",
    "End the loop before it asks for another version of the same answer.",
    "Plain work will carry more truth than another perfect explanation.",
    "Silence after a kept promise can be allowed to count."
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, context.dailyArea, context.closingPermission, context.innerWeather, context.personalEdge);
}

function closingPermissionLine(permission) {
  const phrase = fragment(permission || "one small finish can be enough");
  if (!phrase) return "Let the larger question wait until one small finish has had time to count.";
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
