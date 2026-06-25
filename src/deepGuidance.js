export function buildFallbackDeepGuidance(user = {}, context = {}) {
  const name = firstName(user.name);
  const scene = paidScene(context);
  const area = readableArea(context.dailyArea);
  const anchor = lowerFirst(safePhrase(context.attentionAnchor || context.dailyScene || "one practical detail that keeps returning"));
  const move = lowerFirst(safePhrase(context.mentorMove || context.stabilizer || "make the promise smaller and keep it completely"));
  const caution = relationPhrase(context.relationalCaution || context.relationshipMirror);
  const avoid = lowerFirst(safePhrase(context.avoid || "over-explaining"));
  const bodyStart = bodyPractice(context.bodySignal);
  const work = lowerFirst(safePhrase(context.workSignal || "make the action plain enough to complete"));
  const cost = paidCost(context);
  const structure = monthStructure(context);
  const review = reviewAnchor(context);

  return {
    overview: `${capitalize(scene)} is not a symbol; it is where the pressure around ${area} keeps borrowing attention from the rest of the day. ${name}, the pattern is not laziness or lack of care, it is ${cost} until every small duty begins carrying emotional weight. The paid map is to give that pressure a visible container: choose the promise that keeps returning, name the cost of keeping it vague, and finish the part that can close within two hours. Keep ${avoid} away from the next reply. In relationships, ${caution}; in work, ${work}. Progress becomes believable when your body sees a repeated structure instead of another private negotiation.`,
    thisWeek: `Begin with ${bodyStart}, then protect one practical block before the day has too many opinions in it. Put the returning promise on paper, give it a start time, and make the reply around it shorter than habit wants. If someone reaches for instant access, answer with timing, complete the visible piece, and let the finished detail carry more weight than explanation.`,
    thisMonth: `${capitalize(structure)}. Track the same pressure as it moves through work, money, family, rest, or communication under different names. Review saved readings every seventh day, circle the repeating cost, and let one habit become the container that holds it. The month improves when the pattern gets a system, not a dramatic speech.`,
    practice: `For seven days, use ${review} before the first difficult reply. At night, write one line about what became lighter because the limit stayed visible, then let that evidence choose tomorrow's first action.`,
    focus: focusCue(context),
    watch: watchCue(context)
  };
}

export function buildPaidGuidanceFingerprint(user = {}, context = {}, date = "") {
  return [
    `scene=${capitalize(paidScene(context))}`,
    `area=${readableArea(context.dailyArea)}`,
    `cost=${paidCost(context)}`,
    `week=${safePhrase(context.bodySignal || context.decisionGate || context.mentorMove)}`,
    `month=${monthStructure(context)}`,
    `caution=${relationPhrase(context.relationalCaution || context.relationshipMirror)}`,
    `date=${date}`,
    `user=${firstName(user.name)}`
  ].filter((item) => item && !item.endsWith("=")).join("; ");
}

function paidScene(context = {}) {
  const raw = String(context.openingScene || context.dailyScene || context.attentionAnchor || "").toLowerCase();
  if (raw.includes("water") || raw.includes("glass")) return "the water glass or first sip";
  if (raw.includes("calendar") || raw.includes("appointment") || raw.includes("deadline")) return "the calendar square that keeps shifting";
  if (raw.includes("notebook") || raw.includes("page") || raw.includes("pen") || raw.includes("written")) return "the notebook line waiting beside the day";
  if (raw.includes("kitchen") || raw.includes("counter") || raw.includes("meal") || raw.includes("cup") || raw.includes("tea")) return "the kitchen counter or cooling cup";
  if (raw.includes("wallet") || raw.includes("receipt") || raw.includes("payment") || raw.includes("money") || raw.includes("bill")) return "the receipt or small payment decision";
  if (raw.includes("chair") || raw.includes("room") || raw.includes("desk") || raw.includes("drawer") || raw.includes("laundry")) return "the room detail you keep passing";
  if (raw.includes("door") || raw.includes("shoes") || raw.includes("keys") || raw.includes("bag") || raw.includes("charger")) return "the doorway detail";
  if (raw.includes("message") || raw.includes("sentence") || raw.includes("reply") || raw.includes("conversation")) return "the unsent sentence";
  if (raw.includes("tab") || raw.includes("worry") || raw.includes("thought") || raw.includes("mind")) return "the mental tab that keeps reopening";
  return "one ordinary detail near the work";
}

function readableArea(area) {
  const lower = String(area || "").toLowerCase();
  if (lower.includes("money")) return "money, restraint, and self-respect";
  if (lower.includes("relationship")) return "relationship timing and unspoken expectation";
  if (lower.includes("family")) return "family duty and private fatigue";
  if (lower.includes("health")) return "body rhythm and recovery";
  if (lower.includes("public") || lower.includes("ambition")) return "visible work and delayed recognition";
  if (lower.includes("creative") || lower.includes("visibility")) return "voice, visibility, and first attempts";
  if (lower.includes("friendship") || lower.includes("belonging")) return "belonging pressure and social access";
  if (lower.includes("sleep") || lower.includes("closure")) return "closure, sleep, and unfinished meaning";
  if (lower.includes("learning") || lower.includes("discipline")) return "discipline and scattered attention";
  if (lower.includes("home")) return "home rhythm and emotional privacy";
  if (lower.includes("conversation")) return "the repeated inner conversation";
  return safePhrase(area || "responsibility, timing, and emotional steadiness");
}

function paidCost(context = {}) {
  const knot = String(context.emotionalKnot || "").toLowerCase();
  if (knot.includes("delay")) return "treating delay as rejection";
  if (knot.includes("responsibility")) return "using responsibility as proof of love";
  if (knot.includes("self-respect")) return "letting another person's softness set the price of self-respect";
  if (knot.includes("unfinished work")) return "turning unfinished work into a private verdict";
  if (knot.includes("available")) return "staying reachable past the point where care still feels honest";
  if (knot.includes("certainty")) return "asking uncertain people to become your proof";
  if (knot.includes("understood")) return "trying to be understood before becoming clear";
  return "letting a practical duty become emotional negotiation";
}

function monthStructure(context = {}) {
  const area = String(context.dailyArea || "").toLowerCase();
  if (area.includes("money")) return "build a weekly money review before emotion gets to rename restraint as fear";
  if (area.includes("relationship")) return "give replies a visible timing rule before closeness becomes constant access";
  if (area.includes("family")) return "separate helpfulness from rescue through one repeating household or family limit";
  if (area.includes("health")) return "let food, sleep, and movement become the calendar before pressure becomes interpretation";
  if (area.includes("public") || area.includes("ambition")) return "make visible work measurable before recognition gets to decide your confidence";
  if (area.includes("creative") || area.includes("visibility")) return "schedule imperfect expression before comparison drains the first version";
  if (area.includes("friendship") || area.includes("belonging")) return "make belonging prove itself through timing, not constant availability";
  if (area.includes("sleep") || area.includes("closure")) return "close one mental loop each week before sleep becomes the storage place";
  return "turn the repeating pressure into one visible weekly system";
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

function bodyPractice(text) {
  const value = lowerFirst(safePhrase(text || "let the body settle before choosing words"));
  if (!value) return "one body cue and one written limit";
  if (value.startsWith("do not ")) return `refusing to ${value.replace(/^do not\s+/i, "")}`;
  if (value.startsWith("eat ")) return value.replace(/^eat\b/i, "eating");
  if (value.startsWith("leave ")) return value.replace(/^leave\b/i, "leaving");
  if (value.startsWith("walk ")) return value.replace(/^walk\b/i, "walking");
  if (value.startsWith("drink ")) return value.replace(/^drink\b/i, "drinking");
  if (value.startsWith("lower ")) return value.replace(/^lower\b/i, "lowering");
  if (value.startsWith("protect ")) return value.replace(/^protect\b/i, "protecting");
  if (value.startsWith("notice ")) return value.replace(/^notice\b/i, "noticing");
  if (value.startsWith("step ")) return value.replace(/^step\b/i, "stepping");
  if (value.startsWith("start ")) return value.replace(/^start\b/i, "starting");
  if (value.startsWith("let ")) return value.replace(/^let\b/i, "letting");
  if (value.includes("sleep matters")) return "protecting sleep before one more check";
  return value;
}

function relationPhrase(text) {
  const value = lowerFirst(safePhrase(text || "do not turn another person's uncertainty into your assignment"));
  if (value.includes("uncertainty")) return "leave uncertainty with the person who owns it";
  if (value.includes("warmth")) return "give warmth a time and a doorway";
  if (value.includes("shorter")) return "keep the clean reply shorter than fear prefers";
  if (value.includes("kind no")) return "let a kind no protect trust before resentment starts";
  if (value.includes("behavior")) return "wait for behavior before treating words as proof";
  if (value.includes("listening")) return "listen without volunteering for every consequence";
  if (value.includes("needed")) return "do not confuse being needed with being chosen";
  if (value.includes("closeness")) return "give closeness a doorway instead of leaving every window open";
  return value;
}

function focusCue(context = {}) {
  const move = safePhrase(context.mentorMove || context.stabilizer || "make one promise visible");
  const cue = cueFromPhrase(move, "Make one promise visible");
  return trimCue(cue);
}

function watchCue(context = {}) {
  const avoid = safePhrase(context.avoid || "over-explaining under pressure");
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
