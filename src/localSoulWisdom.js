import { buildAstrologyContext, buildTransitDateForUser } from "./astrologyEngine.js";
import { cleanWisdomText, firstName, isLowQualityWisdom } from "./soulGuruPrompt.js";

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
  let wisdom = buildSignatureWisdom(user, context, seed);
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

function buildSignatureWisdom(user, context, seed) {
  const name = firstName(user.name);
  const scene = sceneSeed(context, seed);
  return [
    openingLine(scene, context, seed),
    nameLine(name, context, seed + 3),
    actionLine(context, seed + 7),
    relationLine(name, context, seed + 13),
    closingLine(context, seed + 19, name)
  ].join(" ");
}

function buildTaskFirstWisdom(user, context) {
  return `${sceneSeed(context)} points to the task that needs a cleaner shape. ${firstName(user.name)}, put ${context.workSignal} where it can be seen, then stop asking the mood to approve it. ${capitalize(context.emotionalKnot)} can turn a simple duty into a private test. Use ${context.stabilizer}, keep ${context.avoid} away from the next decision, and let one finished detail make the day feel less negotiable.`;
}

function buildBodyFirstWisdom(user, context) {
  return `${sceneSeed(context)} is the first clue, but the body gets the first vote. ${firstName(user.name)}, ${context.bodySignal} before explanations take over. ${capitalize(context.innerWeather)} becomes easier to trust when ${context.coreNeed} is treated as a real need, not a luxury. Give one practical task a clean finish, keep the conversation shorter than the worry around it, and let ${context.relationshipMirror} guide your pace without taking over your worth.`;
}

function buildRelationshipFirstWisdom(user, context) {
  return `${sceneSeed(context)} makes the relationship tone easier to read. ${capitalize(context.relationshipMirror)}, and that detail matters more than another long explanation. ${firstName(user.name)}, ${context.innerWeather} is not a weakness, but it does need direction. Do not spend the best part of the day managing ${context.avoid}; ${context.decisionGate} instead. By tonight, the choice that felt plain may be the one you respect most.`;
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
  return `${sceneSeed(context)} shows why ${context.coreNeed} is not too much to ask from this day. ${firstName(user.name)}, the risk is not sensitivity; it is letting ${context.avoid} decide how much of yourself to spend. Start with ${context.bodySignal}, then ${context.decisionGate}. A small, well-kept limit will protect more progress than proving your intention again.`;
}

function buildPersonalEdgeWisdom(user, context) {
  return `${sceneSeed(context)} is where the old rhythm tries to collect evidence. ${firstName(user.name)}, ${context.innerWeather} needs a practical container: ${context.stabilizer}. ${capitalize(context.personalEdge)} before the day turns it into a verdict. If ${context.relationshipMirror}, let that soften your reaction without erasing your position. The day does not need a dramatic breakthrough; it needs one choice you can repeat without betraying yourself.`;
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

function openingLine(scene, context, seed) {
  const lowerScene = lowerFirst(scene);
  const lines = [
    `${scene}: today's pressure is small enough to handle once it is named.`,
    `${scene}: the day has become louder than the task itself.`,
    `Start with ${lowerScene}; attention wants a cleaner container.`,
    `Notice ${lowerScene} before the mind turns it into a private test.`,
    `${scene}: effort needs shape here, not more intensity.`,
    `Use ${lowerScene} as the first honest reset before negotiating with the mood.`,
    `${scene}: this is small enough to handle without making it a verdict.`,
    `Let ${lowerScene} bring the day back from theory into something you can touch.`
  ];
  return pickLine(lines, seed, scene, context.dailyArea);
}

function nameLine(name, context, seed) {
  const edge = fragment(context.personalEdge || context.emotionalKnot || "turning a workable moment into a verdict");
  const need = fragment(context.coreNeed || context.innerWeather || "room to move slowly");
  const area = context.dailyArea || "the part of life asking for attention";
  const lines = [
    `${name}, the sensitive point is ${edge}, not a failure of discipline.`,
    `${name}, ${need} deserves practical protection before ${area} gets noisy.`,
    `${name}, the pressure around ${area} is not asking for a perfect mood; it is asking for one clean shape.`,
    `${name}, keep ${need} specific, or the whole day will start sounding like the same problem.`,
    `${name}, the real work is to work with the pattern of ${edge} without making it a measure of your worth.`,
    `${name}, do not let a delay around ${area} decide the tone of your whole day.`,
    `${name}, ${area} needs a practical container while ${edge} tries to enlarge the moment.`,
    `${name}, protect ${need} with one observable choice instead of another internal argument.`,
    `${name}, today gets easier when ${edge} is treated as a signal, not a sentence.`,
    `${name}, separate ${need} from the noise around ${area} before you answer anything urgent.`,
    `${name}, there is a real need underneath this: ${need}, and it deserves ordinary support.`,
    `${name}, do not let ${edge} make ${area} heavier than it has to be.`
  ];
  return pickLine(lines, seed, name, need, edge, area);
}

function actionLine(context, seed) {
  const action = fragment(context.decisionGate || context.mentorMove || context.stabilizer || "complete the nearest useful task");
  const work = fragment(context.workSignal || "finish one practical detail");
  const body = fragment(context.bodySignal || "let the body settle before choosing words");
  const avoid = fragment(context.avoid || "over-explaining");
  const lines = [
    `Start with this: ${action}, then leave the larger story alone for one hour.`,
    `Make the next useful task visible: ${work}. Pair it with this instruction: ${action}.`,
    `Use this body checkpoint first: ${body}. Then keep this pattern out of the room: ${avoid}.`,
    `Give the next hour one visible edge: ${action}, no extra proving required.`,
    `Let ${work} become the anchor, then refuse the habit of reopening every possibility.`,
    `Before the day scatters, ${action}; the mood can catch up after the action has form.`,
    `Shrink the decision until it can be done today: ${action}.`,
    `Treat the body cue as useful data: ${sentence(body)} Then complete the nearest piece of work without dramatizing it.`,
    `Make ${work} the first proof of care, then stop negotiating with the mood.`,
    `Give ${action} a time and a place, so it cannot keep floating around as pressure.`,
    `Let ${body} come before the decision; after that, handle the practical part directly.`,
    `Reduce the work to one visible movement: ${work}. The rest can wait its turn.`
  ];
  return pickLine(lines, seed, action, work, body, avoid, context.dailyArea);
}

function relationLine(name, context, seed) {
  const relation = fragment(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising");
  const avoid = fragment(context.avoid || "over-explaining");
  const lines = [
    `With other people, ${relation}; warmth does not require unlimited availability.`,
    `If a conversation pulls for more, keep the answer shorter than the worry around it.`,
    `Keep this relational note close: ${sentence(relation)} Let it soften your pace without erasing your position.`,
    `The relationship tone improves when you stop offering extra words just to calm the air.`,
    `Respond from proportion: kind, brief, and clear enough that resentment has less room.`,
    `Do not confuse care with staying open to every demand that arrives without timing.`,
    `If someone needs an answer, give one that respects both warmth and timing.`,
    `Let the next reply be useful, not decorative; care does not need a long defense.`,
    `Let this be the relational rule: ${relation}. Everything else can stay simpler.`,
    `Where ${avoid} usually takes over, answer with a clean time, a clean no, or a clean yes.`,
    `Keep the door open only as far as your body can honestly support.`,
    `The kinder answer is the one you can keep without quietly punishing yourself later.`
  ];
  return pickLine(lines, seed, name, relation, avoid, context.dailyArea);
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
      "the usual seat for overthinking",
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
      "your face before the quick yes",
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
    "Let the day respect one clean finish before it asks for more certainty.",
    "By evening, measure the day by what you handled plainly, not by how perfectly you felt.",
    "The useful proof today is a kept limit, a finished task, or one reply with no extra weight.",
    `Let ${fragment(context.closingPermission || "one small finish be enough")} before you reopen the larger question.`,
    "A plain finish will do more for your confidence than another hour of private negotiation.",
    "Your nervous system needs evidence, so give it one action that stays done.",
    "Leave the day with one less loose end and one fewer explanation than usual.",
    "The day does not need to become impressive; it needs to become honest and workable.",
    "Protect the small repair, then let silence do some of the healing.",
    "You will trust yourself more after a kept promise than after a perfect explanation.",
    "One ordinary repair is enough to remind the day that you are participating.",
    "Let the finish be modest; the nervous system believes repetition more than intensity.",
    "The best proof will be quiet: a limit kept, a task closed, a body less braced.",
    "End the loop before it asks for another version of the same answer."
  ];
  return pickLine(lines, seed, salt, context.dailyArea, context.closingPermission, context.innerWeather, context.personalEdge);
}

function normalizeLocalWisdom(text) {
  return cleanWisdomText(text, text, 100);
}

function fragment(text) {
  return String(text || "").replace(/[.!?]+$/g, "").trim();
}

function sentence(text) {
  const value = fragment(text);
  return value ? `${capitalize(value)}.` : "";
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
