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
  const detail = context.openingScene || context.attentionAnchor || context.dailyScene || "one practical detail";
  const scene = context.openingScene || context.dailyScene || detail;
  const action = context.decisionGate || context.mentorMove || context.stabilizer;
  const body = context.bodySignal || "let the body settle before deciding";
  const relation = context.relationalCaution || context.relationshipMirror;
  const avoid = context.avoid || "over-explaining";
  const need = context.coreNeed || context.innerWeather || "room to move slowly";
  const work = context.workSignal || "complete the nearest useful task";
  const edge = context.personalEdge || context.emotionalKnot;
  const structures = [
    [
      `${capitalize(detail)} is carrying more emotion than the task itself.`,
      `${name}, make it plain enough to finish before the mind starts asking every response for proof.`,
      `The clean move is simple: ${fragment(action)}.`,
      `Let this guide the reply: ${fragment(relation)}.`,
      "One completed detail will make the rest of the day less negotiable."
    ],
    [
      `${capitalize(scene)} points to the exact place where attention is leaking.`,
      `Give it shape first, ${name}: ${fragment(work)}.`,
      `Then step back from ${fragment(avoid)} without turning the pause into a performance.`,
      `${capitalize(need)} does not need a speech to be valid.`,
      "A shorter answer, a named deadline, or a closed tab can protect more peace than another private debate."
    ],
    [
      `${capitalize(detail)} is easier to read after the body settles.`,
      `${name}, a normal delay can feel personal if the day stays too loose.`,
      `This is the edge to watch: ${fragment(edge)}.`,
      `Around ${context.dailyArea}, follow the plain instruction: ${fragment(action)}.`,
      "Keep care practical: fewer words, a clearer time, and one promise small enough to keep without resentment."
    ],
    [
      `${capitalize(detail)} needs a decision, not a bigger story.`,
      `${name}, the tender part of today is ${fragment(need)}, and it deserves protection without becoming withdrawal.`,
      `${sentence(action)} ${sentence(relation)}`,
      "By evening, respect yourself for what you handled directly, not for how perfectly you felt while doing it."
    ],
    [
      `${capitalize(scene)} is the small doorway into the larger pattern.`,
      `Do not give the whole day to ${fragment(avoid)}, ${name}.`,
      `${sentence(work)} Before the conversation gets heavier than it needs to be, ${fragment(body)}.`,
      "A quiet limit kept cleanly will feel more loving than a long explanation given too late."
    ],
    [
      `${capitalize(detail)} is the signal to protect the work before the private debate gets another hour.`,
      `${name}, the pressure around ${context.dailyArea} is asking for structure, not a perfect mood.`,
      `Keep the next reply shaped by this: ${fragment(relation)}.`,
      `If ${fragment(avoid)} starts taking over, check the body first: ${fragment(body)}.`,
      "Then make the task visible before the mood renames it.",
      "You do not need to feel certain before you act responsibly."
    ],
    [
      `${capitalize(detail)} should not wait until the mood becomes perfect.`,
      `${name}, ${fragment(need)} is easier to protect when the day has one named finish line.`,
      `The old habit is ${fragment(avoid)}, but the better move is ${fragment(action)}.`,
      `Handle ${context.dailyArea} through one practical decision and leave the rest of the story unargued.`
    ],
    [
      `${capitalize(detail)} deserves a place on the calendar or a clean goodbye.`,
      `${name}, do not let ${fragment(edge)} turn a workable task into a verdict.`,
      `${sentence(work)} Then keep the relationship tone simple: ${fragment(relation)}.`,
      `The day becomes kinder when ${fragment(need)} is treated as useful information, not drama.`
    ],
    [
      `${capitalize(scene)} is not random; it is showing where the day wants less leakage.`,
      `${name}, spend your attention like something you respect.`,
      `Begin with ${fragment(body)}, then ${fragment(action)} before ${fragment(avoid)} starts writing the script.`,
      `In the conversation, remember: ${fragment(relation)}.`,
      "A modest finish will steady more than another round of explaining."
    ],
    [
      `${capitalize(detail)} needs one visible action today.`,
      `${name}, the unfinished piece near ${context.dailyArea} will feel lighter once it has a time, a limit, or a smaller version.`,
      `${sentence(action)} If tension rises, pause before acting: ${fragment(body)}.`,
      `Keep this relationship truth nearby: ${fragment(relation)}.`,
      "It can keep you warm without making you endlessly available."
    ]
  ];
  const structureSeed = seed + stableHash(context.dailyArea) + stableHash(context.attentionAnchor || context.dailyScene);
  return structures[mod(structureSeed, structures.length)].join(" ");
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

function sceneSeed(context) {
  return capitalize(context.openingScene || context.dailyScene || "one practical detail near you");
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
