import { buildAstrologyContext, buildTransitDateForUser } from "./astrologyEngine.js";
import { buildParagraphArchitecture, cleanWisdomText, firstName, isLowQualityWisdom } from "./soulGuruPrompt.js";

export function getDailyWisdom(user, dateKey = getTodayKey(new Date(), user.birthTimezone || undefined)) {
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
  let wisdom = buildSignatureWisdom(user, context, seed, dateKey);
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
  const scene = sceneSeed(context, seed);
  const opening = openingLine(scene, context, seed, name);
  const nameInsight = nameLine(name, context, seed + 3);
  const action = actionLine(context, seed + 7, name);
  const body = bodyLine(context, seed + 11, name);
  const relation = relationLine(name, context, seed + 13);
  const closing = closingLine(context, seed + 19, name);
  const relationClose = relationCloseLine(context, seed + 23, name);
  const architecture = buildParagraphArchitecture(user, context, dateKey);
  const sentenceCount = Number(String(architecture || "").match(/^(\d+) sentences?/)?.[1] || 5);
  const nameSentence = Number(String(architecture || "").match(/first name plus [^;]+ in sentence (\d+)/)?.[1] || 0);

  return buildArchitecturePlan({
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
  }).join(" ");
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

function openingLine(scene, context, seed, salt = "") {
  const lowerScene = lowerFirst(scene);
  const lines = [
    `Before you pass ${lowerScene} again, let the pressure become smaller and named.`,
    `When your attention lands on ${lowerScene}, separate the task from the story around it.`,
    `Keep ${lowerScene} in view long enough for attention to find a cleaner container.`,
    `Notice ${lowerScene} before the mind turns it into a private test.`,
    `${scene} can return the day to something practical and touchable.`,
    `Use ${lowerScene} as the first honest reset before negotiating with the mood.`,
    `Stay with ${lowerScene} until the day narrows to one honest action.`,
    `Let ${lowerScene} mark the first repair, not the whole meaning of the day.`,
    `Treat ${lowerScene} as a handle, not a verdict on the whole day.`,
    `The practical truth starts with ${lowerScene}, not with the story rushing around it.`,
    `Give ${lowerScene} one plain use before the mood turns it symbolic.`
  ];
  return pickLine(lines, seed, salt, scene, context.dailyArea, context.coreNeed, context.personalEdge);
}

function nameLine(name, context, seed) {
  const edge = fragment(context.personalEdge || context.emotionalKnot || "turning a workable moment into a verdict");
  const need = fragment(context.coreNeed || context.innerWeather || "room to move slowly");
  const area = dailyAreaLabel(context.dailyArea);
  const edgeInstruction = lowerFirst(edge);
  const lines = [
    `For ${name}, ${edgeInstruction} before ${area} starts sounding like a test of discipline.`,
    `What ${name} needs is ${need} before the pressure around ${area} gets noisy.`,
    `Around ${area}, ${name} is not being asked for a perfect mood, only one clean shape.`,
    `Give today's need a specific shape, ${name}, or the whole day will start sounding like the same problem.`,
    `The useful edge for ${name} is to ${edgeInstruction} without turning the moment into a measure of worth.`,
    `A delay around ${area} does not get to decide the whole tone for ${name}.`,
    `Give ${area} a practical container, ${name}, while you practice this: ${edge}.`,
    `For ${name}, one observable choice protects the real need better than another internal argument.`,
    `For ${name}, the urge to ${edgeInstruction} is a signal, not a sentence.`,
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
  const avoid = fragment(context.avoid || "over-explaining");
  const lines = [
    `For the next hour, ${action}, then leave the larger story alone until the task has shape.`,
    `Make the next useful task visible by pairing ${work} with one plain instruction: ${action}.`,
    `Check the body first through this simple rule: ${body}, with ${avoid} kept out of the room.`,
    `Give the next hour one visible edge: ${action}, no extra proving required.`,
    `Give the work a plain place by choosing to ${work}, while the extra possibilities stay unopened for now.`,
    `Before the day scatters, ${action}; the mood can catch up after the action has form.`,
    `Shrink the decision until it can be done today: ${action}.`,
    `Treat the body cue as useful data by choosing to ${body}, then complete the nearest piece of work without dramatizing it.`,
    `The first proof of care can be practical: ${work}, with no further negotiation from the mood.`,
    `Give the action a time and a place by choosing to ${action}.`,
    `Let the body lead the timing through this move: ${body}, then handle the practical part after that.`,
    `Reduce the work to one visible movement: ${work}, and let the rest wait its turn.`
  ];
  return pickLine(lines, seed, salt, action, work, body, avoid, context.dailyArea, context.openingScene, context.coreNeed);
}

function bodyLine(context, seed, salt = "") {
  const body = fragment(context.bodySignal || "let the body settle before choosing words");
  const cue = bodyCueClause(body);
  const weather = innerWeatherClause(context.innerWeather || "the mood is asking for less noise");
  const avoid = fragment(context.avoid || "over-explaining");
  const lines = [
    `Let ${cue} set the sequence before ${avoid} begins inventing meanings.`,
    `The mood becomes more useful when ${cue} comes before any final interpretation.`,
    `Keep the body in the room today with ${cue}, then let the mind make a smaller claim.`,
    `Treat ${weather} as information, but let ${cue} decide the pace of the next move.`,
    `Before the pressure gets a story, give the body one plain vote through ${body}.`,
    `A practical body cue matters here because ${avoid} will make the day sound larger than it is.`
  ];
  return pickLine(lines, seed, salt, body, cue, weather, avoid, context.openingScene, context.dailyArea);
}

function relationLine(name, context, seed) {
  const relation = relationClause(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising", seed);
  const avoid = fragment(context.avoid || "over-explaining");
  const lines = [
    `With other people, ${relation}; warmth does not require unlimited availability.`,
    `If a conversation pulls for more, keep the answer shorter than the worry around it.`,
    `Keep this relational note close: ${lowerFirst(relation)}, so your pace softens without erasing your position.`,
    `The relationship tone improves when you stop offering extra words just to calm the air.`,
    `Respond from proportion: kind, brief, and clear enough that resentment has less room.`,
    `Do not confuse care with staying open to every demand that arrives without timing.`,
    `If someone needs an answer, give one that respects both warmth and timing.`,
    `Let the next reply be useful, not decorative; care does not need a long defense.`,
    `Treat this as the relational rule: ${lowerFirst(relation)}, while everything else stays simpler.`,
    `Where ${avoid} usually takes over, answer with a clean time, a clean no, or a clean yes.`,
    `Keep the door open only as far as your body can honestly support.`,
    `The kinder answer is the one you can keep without quietly punishing yourself later.`
  ];
  return pickLine(lines, seed, name, relation, avoid, context.dailyArea);
}

function relationCloseLine(context, seed, salt = "") {
  const relation = relationClause(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising", seed);
  const permission = fragment(context.closingPermission || "one small finish can be enough");
  const lines = [
    `Let the next reply follow this rule: ${lowerFirst(relation)}, then let the rest of the day stay modest and workable.`,
    `With other people, ${relation}; the day can still end with one useful detail finished.`,
    `Keep the relational answer simple enough to keep, and let one ordinary finish count without decoration.`,
    `When the room asks for more explanation, ${relation}, and leave with one less loose end.`,
    `${capitalize(permission)}; let warmth have timing without another performance.`,
    `A cleaner reply and one finished task will support you better than solving the whole emotional weather.`
  ];
  return pickLine(lines, seed, salt, relation, permission, context.dailyArea);
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

function closingLine(context, seed, salt = "") {
  const lines = [
    "A completed detail will change the room before it changes the whole mood.",
    "One clean finish can stand in for the certainty the mind keeps requesting.",
    "By evening, give more credit to the handled detail than to the mood you kept trying to perfect.",
    "The useful proof today is a kept limit, a finished task, or one reply with no extra weight.",
    closingPermissionLine(context.closingPermission),
    "A plain finish will do more for your confidence than another hour of private negotiation.",
    "Your nervous system needs evidence, so give it one action that stays done.",
    "Leave the day with one less loose end and one fewer explanation than usual.",
    "Plain and workable will serve you better than impressive.",
    "Protect the small repair, then let silence do some of the healing.",
    "You will trust yourself more after a kept promise than after a perfect explanation.",
    "One ordinary repair is enough to remind the day that you are participating.",
    "Let the finish be modest; the nervous system believes repetition more than intensity.",
    "Let the evidence stay ordinary: a limit kept, a task closed, a body less braced.",
    "End the loop before it asks for another version of the same answer."
  ];
  return pickLine(lines, seed, salt, context.dailyArea, context.closingPermission, context.innerWeather, context.personalEdge);
}

function closingPermissionLine(permission) {
  const phrase = fragment(permission || "one small finish can be enough");
  if (!phrase) return "Let the larger question wait until one small finish has had time to count.";
  if (/^(one|a)\b/i.test(phrase)) {
    return `${capitalize(phrase)}; let that stand before you reopen the larger question.`;
  }
  return `${capitalize(phrase)}.`;
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

function mod(value, length) {
  return ((value % length) + length) % length;
}
