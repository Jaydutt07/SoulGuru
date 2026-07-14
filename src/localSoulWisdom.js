import { buildAstrologyContext, buildTransitDateForUser } from "./astrologyEngine.js";
import {
  buildParagraphArchitecture,
  cleanWisdomText,
  firstName,
  getSoulWisdomSpecificityIssues,
  isLowQualityWisdom
} from "./soulGuruPrompt.js";
import { SOUL_WISDOM_MAX_WORDS } from "./soulWisdomVersion.js";

export function getDailyWisdom(user, dateKey = getTodayKey(new Date(), user.birthTimezone || undefined), architectureKey = dateKey) {
  const context = buildAstrologyContext(user, buildTransitDateForUser(user, dateKey));
  const seed = stableHash(`${getSoulReadingUserKey(user)}-${dateKey}-${context.dailyArea}-${context.timingTone}`);
  const wisdom = buildConciseDailyWisdom(user, context, seed + stableHash(architectureKey || dateKey));
  const pattern = divineLifePattern(context, seed + stableHash(architectureKey || dateKey) + 11, firstName(user.name));

  return {
    wisdom: normalizeLocalWisdom(polishLocalWisdom(wisdom)),
    innerWeather: toCue(divineInnerCue(pattern, seed + 19)),
    todayMove: toCue(divineMoveCue(pattern, seed + 23)),
    release: toCue(divineReleaseCue(pattern, seed + 31))
  };
}

function buildConciseDailyWisdom(user, context, seed) {
  const name = firstName(user.name);
  const scene = divineSceneOpening(context, seed + stableHash(name), name);
  const pattern = divineLifePattern(context, seed + 11, name);
  const action = divineCorrection(context, seed + 23, pattern, name);
  const blessing = divineBlessing(context, seed + 37, pattern, name);
  return `${scene}. ${name}, ${pattern.strength}, but ${pattern.shadow}; ${action}. ${blessing}.`;
}

function divineSceneOpening(context, seed = 0, name = "") {
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();
  const area = String(context.dailyArea || "").toLowerCase();
  if (/\b(wallet|receipt|payment|bill|amount|money)\b/.test(scene)) {
    return pickDivine([
      "The receipt is not a warning; it is the price of fear becoming visible",
      "The wallet is not judging you; it is asking which fear still gets paid",
      "The payment line is not small; it is where self-respect asks for a throne",
      "The bill is not a verdict; it is a small place where dignity can stand"
    ], seed, scene, area, name);
  }
  if (/\b(message|reply|conversation|call|sentence|unsent)\b/.test(scene)) {
    const deviceSeed = /\b(message|reply|text|screen|notification|inbox)\b/.test(scene);
    return pickDivine(deviceSeed ? [
      "The unread message is not a verdict; it is a place for one honest line",
      "The reply window is not a courtroom; it is a place for one clean answer",
      "The phone is not asking for performance; it is asking for timing",
      "The screen is not proof of love; it is a gate for measured words"
    ] : [
      "The unsent sentence is not silence; it is self-respect finding honest words",
      "The conversation is not a test of love; it is a gate for truth",
      "The held-back sentence is not weakness; it is power waiting for clean words",
      "The call is not a courtroom; it is a place for one honest line"
    ], seed, scene, area, name);
  }
  if (/\b(door|keys|bag|shoes|charger|errand)\b/.test(scene)) {
    return pickDivine([
      "The half-closed door is not rejection; it is a threshold asking who enters your peace",
      "The keys are not lost; your courage is deciding which life gets opened",
      "The doorway is not arguing with you; it is asking for one clean exit",
      "The bag near the door is not pressure; it is a cue that movement can begin"
    ], seed, scene, area, name);
  }
  if (/\b(notebook|page|pen|line|written|write|draft)\b/.test(scene)) {
    return pickDivine([
      "The waiting page is not empty; it is courage asking for a signature",
      "The pen is not waiting for permission; it is waiting for your command",
      "The page is not blank; it is a witness asking whether fear still edits you",
      "The notebook margin is not a delay; it is one brave sentence asking to land"
    ], seed, scene, area, name);
  }
  if (/\b(mirror)\b/.test(scene)) {
    const mirrorLines = [
      "The mirror is not judging you; it is returning the voice you keep lending away",
      "The mirror is not vanity; it is the witness of every yes that cost too much",
      "The mirror is not asking for beauty; it is asking for allegiance",
      "The mirror is not a surface today; it is the altar where your borrowed voice returns",
      "The mirror is not a critic; it is the gatekeeper of the yes you must stop giving away"
    ];
    return mirrorLines[mod(stableHash(name || scene), mirrorLines.length)];
  }
  if (/\b(calendar|slot|commitment|deadline|hour|time)\b/.test(scene)) {
    return pickDivine([
      "The calendar is not chasing you; it is asking which promise deserves a throne",
      "The marked hour is not pressure; it is destiny testing your obedience",
      "The open slot is not empty; it is a gate waiting for one brave promise"
    ], seed, scene, area, name);
  }
  if (/\b(tab|mind|worry|thought)\b/.test(scene)) {
    return pickDivine([
      "The old tab in your mind is not prophecy; it is fear wearing a familiar crown",
      "The returning thought is not revelation; it is fear asking to rule again",
      "The worry is not wisdom; it is an old priest preaching from a broken altar"
    ], seed, scene, area, name);
  }
  if (/\bkitchen counter\b|\bcounter before\b/.test(scene)) {
    return pickDivine([
      "The kitchen counter is not asking for perfection; it is asking for one practical beginning",
      "The counter before the first task is not disorder; it is a place for the day to choose one command",
      "The kitchen counter is not a small scene; it is where the first honest action can land"
    ], seed, scene, area, name);
  }
  if (/\b(list|item|task|work|promise)\b/.test(scene)) {
    return pickDivine([
      "The list is not heavy; it is destiny asking for obedience, not debate",
      "The unfinished task is not a burden; it is a gate disguised as duty",
      "The promise is not too large; your fear keeps making it wear a crown"
    ], seed, scene, area, name);
  }
  if (/\b(meal|food|breakfast|lunch|dinner|delayed|delay|recovery)\b/.test(scene)) {
    return pickLine([
      "The delayed thing before you is not denial; it is initiation wearing patience",
      "The delay is not a verdict; it is a threshold asking for allegiance",
      "The delayed hour is not punishment; it is where your next self gathers authority"
    ], seed, scene, area, name);
  }
  if (/\b(room|desk|workspace|drawer|chair|counter|floor|domestic)\b/.test(scene)) {
    return pickDivine([
      "The room is not chaos; it is a kingdom waiting for one command",
      "The desk is not accusing you; it is asking which version of you will lead",
      "The open drawer is not disorder; it is a small throne left unattended"
    ], seed, scene, area, name);
  }
  const anchor = divineSceneAnchor(scene);
  return pickDivine([
    `The ${anchor} before you is not small; it is a gate asking for courage`,
    `The ${anchor} is not random; it is where your old fear has been named`,
    `The ${anchor} is not ordinary; it is where your next self asks to enter`,
    `The ${anchor} is not background; it is the first sign asking for a cleaner choice`
  ], seed, scene, area, anchor, name);
}

function divineLifePattern(context, seed = 0, name = "") {
  const area = String(context.dailyArea || "").toLowerCase();
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();
  const knot = String(context.emotionalKnot || context.innerWeather || "").toLowerCase();

  if (isAmbitionArea(area)) return divineAmbitionPattern(seed, area, scene, knot, name);
  if (isMoneyArea(area)) return divineMoneyPattern(seed, area, scene, knot, name);
  if (isSelfArea(area)) return divineSelfPattern(seed, area, scene, knot, name);
  if (isRelationshipArea(area)) return divineRelationshipPattern(seed, area, scene, knot, name);

  if (/\b(wallet|receipt|payment|bill|amount|money)\b/.test(scene)) return divineMoneyPattern(seed, area, scene, knot, name);
  if (/\b(page|pen|task|draft|work|list|notebook|line)\b/.test(scene)) return divineAmbitionPattern(seed, area, scene, knot, name);
  if (/\b(room|desk|mirror|drawer|chair|counter|delay|delayed)\b/.test(scene)) return divineSelfPattern(seed, area, scene, knot, name);
  if (/\b(reply|conversation|door|message|sentence|call|unsent)\b/.test(scene)) return divineRelationshipPattern(seed, area, scene, knot, name);

  return pickLine([
    {
      lane: "courage",
      strength: "your intuition already knows the honest direction",
      shadow: "it gets buried when explanation is allowed to outrank obedience"
    },
    {
      lane: "courage",
      strength: "your courage is closer than your doubt wants you to believe",
      shadow: "it weakens when you keep asking the past to approve the next gate"
    },
    {
      lane: "courage",
      strength: "your power grows when you stop performing uncertainty",
      shadow: "it leaks away when fear is treated like a priest"
    },
    {
      lane: "courage",
      strength: "your discernment can hear the clean answer early",
      shadow: "it gets tired when every choice is forced to survive another trial"
    }
  ], seed, area, scene, knot, name);
}

function isAmbitionArea(area) {
  return /work|ambition|creative|visibility|learning|authority|recognition|public image|self-expression/.test(area);
}

function isMoneyArea(area) {
  return /money|duty|worth|restraint|payment|expense|value/.test(area);
}

function isSelfArea(area) {
  return /home|privacy|rest|health|food|recovery|closure|forgiveness|sleep|healing|emotional privacy/.test(area);
}

function isRelationshipArea(area) {
  return /relationship|friendship|belonging|family|social|love|conversation/.test(area);
}

function divineRelationshipPattern(seed, area, scene, knot, name = "") {
  return pickDivine([
    {
      lane: "relationship",
      strength: "your heart is loyal enough to make people feel chosen",
      shadow: "it becomes a trial court when safety has to prove itself every hour"
    },
    {
      lane: "relationship",
      strength: "your warmth is real and it knows how to protect others",
      shadow: "it becomes self-abandonment when every request receives more than the moment deserves"
    },
    {
      lane: "relationship",
      strength: "your love sees what others hide from themselves",
      shadow: "it turns heavy when you keep testing the door after peace has already knocked"
    },
    {
      lane: "relationship",
      strength: "your devotion can make another person feel safe",
      shadow: "it becomes a burden when you confuse being needed with being loved"
    },
    {
      lane: "relationship",
      strength: "your presence has the rare gift of making distance softer",
      shadow: "it loses its grace when you chase proof from people who already received enough"
    }
  ], seed, area, scene, knot, name);
}

function divineMoneyPattern(seed, area, scene, knot, name = "") {
  return pickDivine([
    {
      lane: "money",
      strength: "your restraint is a form of power",
      shadow: "it turns into self-doubt when every number becomes a verdict on your worth"
    },
    {
      lane: "money",
      strength: "your instinct for value is sharper than fear admits",
      shadow: "it weakens when panic gets to price the whole future"
    },
    {
      lane: "money",
      strength: "your discipline can build a life that does not beg",
      shadow: "it becomes punishment when you make every expense confess its morality"
    },
    {
      lane: "money",
      strength: "your sense of worth is learning to stand without permission",
      shadow: "it shakes when the smallest cost is allowed to judge the whole kingdom"
    },
    {
      lane: "money",
      strength: "your patience can turn scarcity into strategy",
      shadow: "it hardens when fear is allowed to call itself wisdom"
    }
  ], seed, area, scene, knot, name);
}

function divineAmbitionPattern(seed, area, scene, knot, name = "") {
  return pickDivine([
    {
      lane: "ambition",
      strength: "your ambition carries real fire",
      shadow: ambitionPermissionShadow(seed, area, scene, name)
    },
    {
      lane: "ambition",
      strength: "your discipline is stronger than the mood trying to delay it",
      shadow: "it loses authority when the visible move keeps waiting for perfect certainty"
    },
    {
      lane: "ambition",
      strength: "your mind can turn raw material into something rare",
      shadow: ambitionDraftShadow(seed, area, scene, name)
    },
    {
      lane: "ambition",
      strength: "your work has more authority than your fear wants to admit",
      shadow: "it stays hidden when you keep polishing the doorway instead of entering"
    },
    {
      lane: "ambition",
      strength: "your calling is not weak just because it asks for repetition",
      shadow: "it dims when a rough first step is treated as a verdict"
    },
    {
      lane: "ambition",
      strength: "your focus can become a weapon of grace",
      shadow: "it scatters when every new doubt is welcomed as counsel"
    }
  ], seed, area, scene, knot, name);
}

function ambitionPermissionShadow(seed, area, scene, name = "") {
  return pickLine([
    "it keeps handing fear the stamp before the work reaches daylight",
    "it pauses at the threshold whenever doubt asks to inspect the work first",
    "it lets hesitation review the doorway before the visible move begins",
    "it gives old fear too much authority over the first public step",
    "it waits for certainty to approve what practice has already earned"
  ], seed, area, scene, name, "ambition-permission-shadow");
}

function ambitionDraftShadow(seed, area, scene, name = "") {
  return pickLine([
    "it tightens when one rough page is forced to audition for the whole future",
    "it becomes cramped when the first version has to prove the entire path",
    "it loses speed when a useful draft is treated like a final verdict",
    "it turns sharp when early work is asked to justify the whole calling",
    "it stalls when the page must carry more destiny than evidence"
  ], seed, area, scene, name, "ambition-draft-shadow");
}

function divineSelfPattern(seed, area, scene, knot, name = "") {
  return pickDivine([
    {
      lane: "self",
      strength: selfTenderStrength(seed, area, scene, name),
      shadow: selfAgreementShadow(seed, area, scene, name)
    },
    {
      lane: "self",
      strength: selfPrivateStrength(seed, scene, name),
      shadow: selfPrivateShadow(seed, scene, name)
    },
    {
      lane: "self",
      strength: "your sensitivity is a gift of sight",
      shadow: "it becomes punishment when every pause is treated as rejection"
    },
    {
      lane: "self",
      strength: "your solitude can restore the voice others borrow from you",
      shadow: "it becomes exile when you use it to avoid the clean answer"
    },
    {
      lane: "self",
      strength: selfInnerLifeStrength(seed, area, scene, name),
      shadow: selfDelayShadow(seed, area, scene, name)
    }
  ], seed, area, scene, knot, name);
}

function selfPrivateStrength(seed, scene, name = "") {
  return pickLine([
    "your inner room has a holy intelligence",
    "your quiet life notices what the public day misses",
    "your private rhythm knows when the answer has become too loud",
    "your solitude can hear the honest answer early",
    "your inward world can protect the truth before noise arrives"
  ], seed, scene, name, "self-private-strength");
}

function selfPrivateShadow(seed, scene, name = "") {
  return pickLine([
    "it turns against you when silence becomes avoidance instead of protection",
    "it gets heavy when quiet becomes a hiding place for the real answer",
    "it loses wisdom when privacy is used to delay the clean response",
    "it becomes tiring when retreat replaces the boundary that should be spoken",
    "it starts costing peace when stillness turns into postponed truth"
  ], seed, scene, name, "self-private-shadow");
}

function selfAgreementShadow(seed, area, scene, name = "") {
  return pickLine([
    "it gets tangled when agreement arrives before the honest answer",
    "it becomes costly when yes appears before the truth has shoes on",
    "it loses protection when peace is purchased before clarity arrives",
    "it turns heavy when consent is offered before the inner voice speaks",
    "it becomes tiring when harmony is chosen before the real answer lands"
  ], seed, area, scene, name, "self-agreement-shadow");
}

function selfTenderStrength(seed, area, scene, name = "") {
  return pickLine([
    "your tenderness notices the small truth under the room's noise",
    "your care can hear what the louder moment misses",
    "your softness carries more intelligence than pressure admits",
    "your inner gentleness sees where the day needs protection",
    "your sensitivity can recognize the real need early"
  ], seed, area, scene, name, "self-tender-strength");
}

function selfDelayShadow(seed, area, scene, name = "") {
  return pickLine([
    "it gets heavier when waiting is mistaken for a final answer",
    "it loses room when delay is allowed to sound like destiny",
    "it becomes burdened when a slow result is treated as judgment",
    "it tires when postponed timing is asked to explain your worth",
    "it contracts when patience starts sounding like rejection"
  ], seed, area, scene, name, "self-delay-shadow");
}

function selfInnerLifeStrength(seed, area, scene, name = "") {
  return pickLine([
    "your inner life can hear the truth beneath the noise",
    "your private depth notices what the louder day misses",
    "your inward world keeps a wiser rhythm than the pressure",
    "your quiet perception can sort signal from noise early",
    "your hidden steadiness knows when the room has become too loud"
  ], seed, area, scene, name, "self-inner-life-strength");
}

function divineCorrection(context, seed = 0, pattern = {}, name = "") {
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();
  const area = String(context.dailyArea || "").toLowerCase();
  if (pattern.lane === "relationship") {
    return pickDivine([
      "answer the real request and protect the silence after it",
      "one clean sentence is enough; extra proof stays outside",
      /\b(door|keys|bag|shoes|charger|errand)\b/.test(scene)
        ? "send the truth at the threshold without adding a confession"
        : "send the truth once and leave the confession outside",
      "name the boundary once and leave affection free from performance",
      "the real request gets one answer, and the rest can stay quiet"
    ], seed, scene, area, pattern.lane, name);
  }
  if (pattern.lane === "money") {
    return pickDivine([
      "check the amount once and choose the expense your dignity can stand behind",
      "decide the number without letting panic sit on the throne",
      "close the money question before fear starts charging interest"
    ], seed, scene, area, pattern.lane, name);
  }
  if (pattern.lane === "ambition") {
    return pickDivine([
      ambitionPrimaryAction(seed, area, scene, name),
      "show the rough version before doubt crowns itself again",
      ambitionPathAction(seed, area, scene, name),
      "put one finished mark on the work before doubt opens another review",
      ambitionFinishAction(seed, area, scene, name)
    ], seed, scene, area, pattern.lane, name);
  }
  if (pattern.lane === "self") {
    return pickDivine([
      "choose the quiet no and let apology wait outside",
      "close the old performance and keep the truth you heard first",
      /\bkitchen|counter|room\b/.test(scene)
        ? "put the first answer on one clean surface before the room votes"
        : selfFirstTruthAction(seed, area, scene, name),
      "say the necessary no once and keep the answer intact",
      selfTruthApologyAction(seed, area, scene, name),
      "let the no stay simple enough to keep after the mood changes",
      selfAnswerBoundaryAction(seed, area, scene, name)
    ], seed, scene, area, pattern.lane, name);
  }
  return pickDivine([
    "choose the path you already understand and stop asking doubt for a second prophecy",
    "finish the brave move before fear turns counsel into delay",
    "close the old argument and let one obedient action open the gate"
  ], seed, scene, area, pattern.lane, name);
}

function ambitionPathAction(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "finish the next familiar step before doubt asks for a new map",
    "show one known step before doubt reopens the case",
    "put the clearest step on the page before certainty asks for another sign",
    "submit the useful piece before doubt demands a different doorway",
    "mark the first disciplined step before the plan grows again"
  ], seed, area, scene, name, "ambition-path-action");
}

function ambitionPrimaryAction(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "finish the visible piece before fear asks to bless the work",
    "show one usable section before doubt asks for ceremony",
    "put the work in daylight before fear starts requesting proof",
    "mark the practical finish before the private review expands",
    "submit the useful part before hesitation crowns itself"
  ], seed, area, scene, name, "ambition-primary-action");
}

function ambitionFinishAction(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "finish the visible piece before fear asks for another blessing",
    "show the useful draft before doubt turns the doorway into a trial",
    "mark one completed piece before the private verdict grows louder",
    "submit the workable part before certainty asks for another sign",
    "close the first useful section before doubt starts reviewing the whole path"
  ], seed, area, scene, name, "ambition-finish-action");
}

function selfPrivatePeaceBlessing(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "Peace returns when the private answer is allowed to stay whole",
    "The next gate respects the self that keeps its quiet truth intact",
    "Relief arrives when the inner answer no longer has to bargain",
    "The private truth keeps its strength when the room asks it to shrink",
    "Calm becomes real when the private answer keeps its edge"
  ], seed, area, scene, name, "self-private-peace-blessing");
}

function selfFirstTruthAction(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "protect the first truth before the day trains you to trade it away",
    "keep the first answer intact before apology starts negotiating",
    "hold the quiet truth before the old performance asks to manage it",
    "name the clean response before the mood turns it into a debate",
    "place the first truth where guilt cannot rewrite it"
  ], seed, area, scene, name, "self-first-truth-action");
}

function selfTruthApologyAction(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "keep the first answer honest before apology tries to arrange the room",
    "keep the clean truth standing before guilt begins managing the mood",
    "protect the necessary line before apology turns it into a performance",
    "protect the quiet answer before guilt asks to soften every edge",
    "keep the answer plain before old guilt starts rearranging the room"
  ], seed, area, scene, name, "self-truth-apology-action");
}

function selfAnswerBoundaryAction(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "give the first answer a clean edge before the room can vote",
    "protect the first answer before the mood asks for revisions",
    "keep the answer small before the room turns it into a trial",
    "place one boundary around the answer before guilt edits it",
    "name the answer's edge before old peacekeeping takes over"
  ], seed, area, scene, name, "self-answer-boundary-action");
}

function divineBlessing(context, seed = 0, pattern = {}, name = "") {
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();
  const area = String(context.dailyArea || "").toLowerCase();
  if (pattern.lane === "relationship") {
    return pickDivine([
      "The blessing belongs to the version of you that stops auditioning for the love already meant to recognize you",
      "The right connection meets the steadier you, not the overextended one proving every feeling",
      "Peace enters faster when your heart stops confusing access with devotion",
      "The heart rises when love no longer has to survive an examination",
      "Closeness becomes cleaner when care arrives with timing, not performance",
      "Love feels safer when your answer has an edge it can actually keep",
      "The right bond respects the version of you that no longer overpays for proof",
      "Warmth becomes trustworthy when it stops carrying the whole room"
    ], seed, pattern.lane, scene, area, name);
  }
  if (pattern.lane === "money") {
    return pickDivine([
      "Dignity returns when fear no longer holds the pen over your future",
      "The blessing follows the hand that can decide without begging panic for approval",
      "Provision respects the hand that can decide without worshipping the number"
    ], seed, pattern.lane, scene, area, name);
  }
  if (pattern.lane === "ambition") {
    return pickDivine([
      ambitionBlessingLine(seed, area, scene, name),
      "Your rise begins where the explanation ends and the work finally stands in light",
      ambitionDisciplineBlessing(seed, area, scene, name),
      "Recognition has more room when the work receives one finished mark",
      "The next door opens when practice becomes visible before approval arrives",
      "The work steadies when one completed piece is allowed to be enough for tonight"
    ], seed, pattern.lane, scene, area, name);
  }
  if (pattern.lane === "self") {
    if (/\b(page|pen|line|notebook|draft)\b/.test(scene)) {
      return pickDivine([
        "Your light returns when the page receives truth instead of another disguise",
        "The next gate opens when the written thing stops asking fear to supervise it",
        selfPageTruthBlessing(seed, area, scene, name)
      ], seed, pattern.lane, scene, area, name);
    }
    if (/\b(promise|list|task|work|item)\b/.test(scene)) {
      return pickDivine([
        "The promise becomes lighter when it no longer has to carry your whole worth",
        "The blessing stays with the self that stops turning duty into a verdict",
        "The next gate opens when one task stops pretending to be your entire destiny"
      ], seed, pattern.lane, scene, area, name);
    }
    return pickDivine([
      "The blessing stays with the self you stop abandoning to keep the room peaceful",
      "Your light returns when loyalty to yourself becomes the first offering",
      "The next gate opens for the version of you that no longer mistakes surrender for kindness",
      selfPrivatePeaceBlessing(seed, area, scene, name)
    ], seed, pattern.lane, scene, area, name);
  }
  return pickDivine([
    "The gate opens when obedience becomes louder than the old fear",
    "The blessing moves toward the self that stops mistaking delay for denial",
    "Your path grows brighter when courage receives the first vote"
  ], seed, pattern.lane, scene, area, name);
}

function ambitionBlessingLine(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "The path opens when action speaks before fear starts preaching",
    "The next opening arrives when the work answers before doubt performs",
    "Momentum returns when action carries the proof fear wanted to explain",
    "The gate loosens when effort becomes visible before the old sermon starts",
    "Progress comes closer when the finished piece speaks first"
  ], seed, area, scene, name, "ambition-blessing");
}

function selfPageTruthBlessing(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "The page keeps its power when the truth stops editing itself for the past",
    "Written truth becomes lighter when fear is no longer supervising it",
    "The next page opens when the honest line is allowed to stay simple",
    "Truth returns through the sentence that no longer performs for old approval",
    "The written answer steadies when it stops asking the past for permission"
  ], seed, area, scene, name, "self-page-truth-blessing");
}

function ambitionDisciplineBlessing(seed = 0, area = "", scene = "", name = "") {
  return pickLine([
    "Discipline starts looking like favor when one finished mark arrives on time",
    "The next opening respects the work that shows up before approval",
    "Progress gets nearer when practice leaves a visible mark first",
    "Recognition has a doorway when discipline stops bargaining with mood",
    "The path steadies when effort becomes visible before praise appears"
  ], seed, area, scene, name, "ambition-discipline-blessing");
}

function divineInnerCue(pattern = {}, seed = 0) {
  if (pattern.lane === "relationship") {
    return pickLine([
      "Loyal heart, guarded threshold",
      "Warmth needing self-respect",
      "Love without the trial"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "money") {
    return pickLine([
      "Dignity over panic",
      "Value without fear",
      "Restraint becoming power"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "ambition") {
    return pickLine([
      "Fire waiting for proof",
      "Discipline before applause",
      "Power beyond permission"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "self") {
    return pickLine([
      "Tenderness protecting truth",
      "Silence becoming allegiance",
      "Sensitivity with a crown"
    ], seed, pattern.lane);
  }
  return pickLine([
    "Courage over old fear",
    "Intuition before explanation",
    "Obedience at the gate"
  ], seed, pattern.lane);
}

function divineMoveCue(pattern = {}, seed = 0) {
  if (pattern.lane === "relationship") {
    return pickLine([
      "Answer the real request",
      "Send the clean truth",
      "Protect the silence after"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "money") {
    return pickLine([
      "Check the amount once",
      "Choose without panic",
      "Close the money question"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "ambition") {
    return pickLine([
      "Finish the visible piece",
      "Show the rough version",
      "Choose the known path"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "self") {
    return pickLine([
      "Choose the plain no",
      "Keep the first truth",
      "Protect the private answer"
    ], seed, pattern.lane);
  }
  return pickLine([
    "Choose the honest path",
    "Finish the brave move",
    "Close the old argument"
  ], seed, pattern.lane);
}

function divineReleaseCue(pattern = {}, seed = 0) {
  if (pattern.lane === "relationship") {
    return pickLine([
      "Testing peace for proof",
      "Offering the whole kingdom",
      "Access mistaken for devotion"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "money") {
    return pickLine([
      "Panic pricing the future",
      "Fear holding the pen",
      "Numbers judging worth"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "ambition") {
    return pickLine([
      "Fear blessing the work",
      "Perfect certainty first",
      "Doubt wearing the crown"
    ], seed, pattern.lane);
  }
  if (pattern.lane === "self") {
    return pickLine([
      "Agreement before truth",
      "Abandoning the first answer",
      "Peace bought with self"
    ], seed, pattern.lane);
  }
  return pickLine([
    "Doubt asking for worship",
    "Delay dressed as counsel",
    "Fear receiving the vote"
  ], seed, pattern.lane);
}

function divineSceneAnchor(scene) {
  const match = String(scene || "").match(/\b(decision|promise|choice|task|truth|path|hour|voice|answer|work|fear|doubt|day)\b/i);
  return match?.[1]?.toLowerCase() || "sign";
}

function conciseProphecyOpening(context, seed = 0) {
  const scene = sceneVariants(String(context.openingScene || context.dailyScene || ""))[mod(seed, 3)];
  const pressure = concisePressure(context, seed + 7);
  return pickLine([
    `${capitalize(scene)} is the sign that ${pressure}`,
    `${capitalize(scene)} carries the omen of ${pressure}`,
    `${capitalize(scene)} is where the day reveals ${pressure}`
  ], seed, scene, pressure);
}

function concisePressure(context, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  const knot = String(context.emotionalKnot || context.innerWeather || "").toLowerCase();
  const avoid = avoidPatternSubject(context.avoid || knot);

  if (area.includes("relationship") || area.includes("belonging") || area.includes("family")) {
    return pickLine([
      "care wanting timing before it becomes performance",
      "warmth asking for an edge before resentment enters",
      "an answer needing shape before closeness gets heavy"
    ], seed, area, knot, avoid);
  }
  if (area.includes("money")) {
    return pickLine([
      "a number asking to be handled before worry spreads",
      "value needing a clean decision before fear spends for you",
      "a payment thought looking larger than the actual choice"
    ], seed, area, knot, avoid);
  }
  if (area.includes("body") || area.includes("health") || area.includes("sleep")) {
    return pickLine([
      "the body asking to be included before meaning is chosen",
      "urgency needing food, water, breath, or rest before instruction",
      "care becoming clearer once the body stops rushing"
    ], seed, area, knot, avoid);
  }
  if (area.includes("work") || area.includes("creative") || area.includes("visibility") || area.includes("ambition")) {
    return pickLine([
      "work needing proof before the story becomes loud",
      "a rough finish asking to be seen before fear edits again",
      "effort wanting a completion mark before self-judgment speaks"
    ], seed, area, knot, avoid);
  }
  return pickLine([
    `${avoid} trying to make one detail measure the whole day`,
    "one unfinished thing asking for action before interpretation",
    "a private debate losing power when the next move is named"
  ], seed, area, knot, avoid);
}

function conciseBlessing(context, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  if (area.includes("relationship") || area.includes("belonging") || area.includes("family")) {
    return pickLine([
      "what remains after that can be softer without becoming endless",
      "the exchange can keep warmth without asking you to disappear",
      "care will have a doorway instead of taking the whole house"
    ], seed, area);
  }
  if (area.includes("money")) {
    return pickLine([
      "the evening will respect the number more than the worry",
      "the choice can stop following every room you enter",
      "dignity returns when the amount has one clear place"
    ], seed, area);
  }
  if (area.includes("body") || area.includes("health") || area.includes("sleep")) {
    return pickLine([
      "the next answer can come from a less hurried body",
      "rest will have evidence before the mind asks for meaning",
      "your body will not need to argue for its place"
    ], seed, area);
  }
  if (area.includes("work") || area.includes("creative") || area.includes("visibility") || area.includes("ambition")) {
    return pickLine([
      "the work can stand under its own lamp for tonight",
      "the finished mark will speak louder than another private review",
      "attention returns to the craft instead of the performance"
    ], seed, area);
  }
  return pickLine([
    "the day can become smaller, cleaner, and easier to carry",
    "the evening receives evidence instead of another private trial",
    "the larger question loses volume after one completed detail"
  ], seed, area);
}

function buildLaneWisdom(context, seed, readingLane) {
  if (readingLane?.id === "delayed-blessing-discipline") {
    const detail = laneSceneDetail(context, seed);
    return pickLine([
      `A delayed blessing often arrives dressed as discipline beside ${detail}. If the result is late, make yourself early: ${laneDisciplineChain(context, seed)}.`,
      `When the result comes late, discipline becomes the doorway beside ${detail}. Make yourself early: ${laneDisciplineChain(context, seed)}.`,
      `Slow blessings test whether ${detail} can meet them with discipline. Start early: ${laneDisciplineChain(context, seed)}.`
    ], seed, readingLane.id, detail);
  }

  if (readingLane?.id === "delayed-result-destiny") {
    return laneDestinyWisdom(context, seed);
  }

  if (readingLane?.id === "seen-work-solid") {
    return laneVisibilityWisdom(context, seed);
  }

  return "";
}

function laneDestinyWisdom(context, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();
  const detail = laneSceneDetail(context, seed);
  const task = laneVisibleTask(context, seed);

  if (area.includes("body") || area.includes("health") || /\b(meal|water|body|sleep|rest)\b/.test(scene)) {
    return pickLine([
      `The body moving slowly is not destiny saying no. Finish ${task} today; hope needs evidence the body can feel.`,
      `Do not turn a tired body into a denied future. Finish ${task} today and let hope become physical evidence.`,
      `Delay inside ${detail} needs care before it becomes a verdict. Finish ${task} today; hope should have proof in the body.`
    ], seed, area, scene, detail);
  }

  if (area.includes("relationship") || area.includes("family") || area.includes("belonging") || /\b(reply|conversation|message|sentence)\b/.test(scene)) {
    return pickLine([
      `Do not confuse a slow conversation with a denied destiny. Today, finish ${task}; hope needs evidence, not another private promise.`,
      `A late answer around ${detail} is not destiny closing the door. Finish ${task} today and stop making silence carry the whole future.`,
      `Delay around ${detail} still needs behavior before the mind calls it denial. Finish ${task} today and let hope become visible.`
    ], seed, area, scene, detail);
  }

  if (area.includes("money") || /\b(receipt|bill|wallet|payment)\b/.test(scene)) {
    return pickLine([
      `Do not confuse a delayed number with a denied destiny. Today, finish ${task}; hope needs evidence, not another private promise.`,
      `A late result around ${detail} is not destiny saying no. Finish ${task} today and let the facts carry hope.`,
      `Delay around ${detail} still needs evidence before the mind calls it denial. Finish ${task} today and leave panic unpaid.`
    ], seed, area, scene, detail);
  }

  return pickLine([
    `Do not confuse the delayed result around ${detail} with a denied destiny. Today, finish ${task}; hope needs evidence, not another private promise.`,
    `A late result around ${detail} is not destiny saying no. Finish ${task} today; hope needs evidence, not another private promise.`,
    `Delay around ${detail} still needs evidence before the mind calls it denial. Finish ${task} today and let hope become visible.`
  ], seed, area, scene, detail);
}

function laneVisibilityWisdom(context, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();
  const detail = laneVisibilityDetail(context, seed);

  if (area.includes("relationship") || area.includes("family") || area.includes("belonging") || /\b(reply|conversation|message|sentence)\b/.test(scene)) {
    if (detail.includes("promise")) {
      return "A promise does not become safer because the story gets louder. Finish the duty it names, then let behavior carry the explanation.";
    }
    if (detail.includes("conversation")) {
      return "A conversation seen too early becomes performance. Finish the honest sentence first, then let the rest wait for behavior.";
    }
    return "The reply does not need a louder story to prove care. Finish the clean answer, then stop defending its softness.";
  }

  if (area.includes("money") || /\b(receipt|bill|wallet|payment)\b/.test(scene)) {
    return pickLine([
      `The pressure around ${detail} being judged is real, but performance is not the cure. Finish the number before making the story loud.`,
      `A money story gets louder when the number stays soft. Check the amount first; let the finished decision carry dignity.`,
      `Being seen through ${detail} asks for proof, not performance. Finish the bill, receipt, or agreement before explaining your worth.`
    ], seed, area, scene, detail);
  }

  if (area.includes("body") || area.includes("health") || /\b(meal|water|body|sleep|rest)\b/.test(scene)) {
    return pickLine([
      `The pressure around ${detail} being visible is real, but pushing harder is not the cure. Finish the care before judging the day.`,
      `A tired body does not need a louder story. Finish the food, water, or rest cue before asking yourself to perform.`,
      `Being seen through ${detail} asks for recovery before performance. Finish the care task until the body has evidence.`
    ], seed, area, scene, detail);
  }

  return pickLine([
    `The pressure around ${detail} being seen is real, but performance is not the cure. Finish the solid part before making the story loud.`,
    `Visibility pressure around ${detail} is real; a louder story will not carry weak work. Finish the useful part before asking for attention.`,
    `Being seen through ${detail} asks for substance before performance. Finish the work until it can stand without a louder story.`
  ], seed, area, scene, detail);
}

function laneSceneDetail(context, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();

  if (area.includes("money") || /\b(receipt|bill|wallet|payment)\b/.test(scene)) {
    return pickLine(["the bill", "the receipt", "the payment line"], seed, area, scene);
  }
  if (area.includes("relationship") || area.includes("family") || area.includes("belonging") || /\b(reply|conversation|message|sentence)\b/.test(scene)) {
    return pickLine(["the reply", "the conversation", "the promise"], seed, area, scene);
  }
  if (area.includes("body") || area.includes("health") || /\b(meal|water|body|sleep|rest)\b/.test(scene)) {
    return pickLine(["the body", "the water glass", "the rest cue"], seed, area, scene);
  }
  if (/\b(room|drawer|desk|counter|floor|laundry)\b/.test(scene)) {
    return pickLine(["the desk", "the room", "the open drawer"], seed, area, scene);
  }
  if (/\b(page|pen|notebook|line)\b/.test(scene)) {
    return pickLine(["the page", "the pen", "the notebook line"], seed, area, scene);
  }
  return pickLine(["the draft", "the task", "the work"], seed, area, scene);
}

function laneVisibilityDetail(context, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();

  if (area.includes("relationship") || area.includes("family") || area.includes("belonging") || /\b(reply|conversation|message|sentence)\b/.test(scene)) {
    return pickLine(["the reply", "the promise", "the conversation"], seed, area, scene);
  }
  if (area.includes("money") || /\b(receipt|bill|wallet|payment)\b/.test(scene)) {
    return pickLine(["the number", "the agreement", "the decision"], seed, area, scene);
  }
  if (area.includes("body") || area.includes("health") || /\b(meal|water|body|sleep|rest)\b/.test(scene)) {
    return pickLine(["the routine", "the recovery", "the care"], seed, area, scene);
  }
  return pickLine(["the draft", "the work", "the next visible piece"], seed, area, scene);
}

function laneDisciplineChain(context, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();

  if (area.includes("body") || area.includes("health") || /\b(meal|water|body|sleep|rest)\b/.test(scene)) {
    return pickLine([
      "eat, drink water, finish one task, and stop negotiating with doubt",
      "eat, rest the body, write one line, and stop bargaining with worry",
      "drink water, make the choice, finish the task, and leave doubt unfed"
    ], seed, area, scene);
  }

  if (area.includes("relationship") || area.includes("family") || area.includes("belonging") || /\b(reply|conversation|message|sentence)\b/.test(scene)) {
    return pickLine([
      "eat, write the shorter reply, finish one duty, and stop negotiating with doubt",
      "drink water, answer only what is real, finish one task, and let doubt wait",
      "eat, shorten the answer, complete one duty, and stop feeding the old fear"
    ], seed, area, scene);
  }

  if (area.includes("money") || /\b(receipt|bill|wallet|payment)\b/.test(scene)) {
    return pickLine([
      "check the number, write the next payment, finish one task, and stop negotiating with doubt",
      "eat, name the amount, finish the decision, and leave fear without a vote",
      "write the number, choose the next payment, finish the errand, and stop bargaining with worry"
    ], seed, area, scene);
  }

  return pickLine([
    "eat, write one line, finish one task, and stop negotiating with doubt",
    "drink water, write the first line, finish the draft, and let doubt stand outside",
    "eat, mark one finish, write the next line, and stop bargaining with fear"
  ], seed, area, scene);
}

function laneVisibleTask(context, seed = 0) {
  const area = String(context.dailyArea || "").toLowerCase();
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();

  if (area.includes("money") || /\b(receipt|bill|wallet|payment)\b/.test(scene)) {
    return pickLine([
      "the one number that can be checked",
      "the payment decision that can be written",
      "the bill or receipt that can be closed"
    ], seed, area, scene);
  }

  if (area.includes("relationship") || area.includes("family") || area.includes("belonging") || /\b(reply|conversation|message|sentence)\b/.test(scene)) {
    return pickLine([
      "the one honest reply that can be kept",
      "the duty that can be completed without a speech",
      "the sentence that says enough and stops"
    ], seed, area, scene);
  }

  if (area.includes("body") || area.includes("health") || /\b(meal|water|body|sleep|rest)\b/.test(scene)) {
    return pickLine([
      "the care task your body can feel",
      "the meal, rest, or walk that can be completed",
      "the body-level repair that can be seen"
    ], seed, area, scene);
  }

  return pickLine([
    "the one draft that can be seen",
    "the task that can carry a finish mark",
    "the page, reply, or checklist item that can be shown"
  ], seed, area, scene);
}

function conciseAction(context, seed = 0, name = "") {
  const area = String(context.dailyArea || "").toLowerCase();
  const gate = String(context.decisionGate || context.mentorMove || "").toLowerCase();
  const sceneAction = conciseSceneAction(context, seed, name);
  if (sceneAction) return sceneAction;

  if (area.includes("relationship") || area.includes("belonging") || area.includes("friendship")) {
    return pickLine([
      "Answer the message after choosing the time you can truly keep",
      "Say the kind thing without reopening the whole emotional case",
      "Answer the real request before offering more access"
    ], seed, name, area, gate);
  }

  if (area.includes("money")) {
    return pickLine([
      "Check the amount once, then choose the payment or pause",
      "Put the money question into one clear number before deciding",
      "Separate value from panic before you approve the expense"
    ], seed, name, area, gate);
  }

  if (area.includes("body") || area.includes("health")) {
    return pickLine([
      "Eat, drink water, then make the decision after the body settles",
      "Handle food or rest before treating urgency as instruction",
      "Give the body one repair before asking it for certainty"
    ], seed, name, area, gate);
  }

  if (area.includes("creative") || area.includes("visibility")) {
    return pickLine([
      "Show the rough version before polishing the fear again",
      "Send the usable draft before the inner critic edits the day",
      "Make the idea visible before judging whether it is enough"
    ], seed, name, area, gate);
  }

  if (area.includes("work") || area.includes("ambition") || area.includes("recognition") || area.includes("learning")) {
    return pickLine([
      "Finish the oldest visible task before improving the plan again",
      "Submit the rough version before opening another private review",
      "Put one finished mark on the work before measuring your worth"
    ], seed, name, area, gate);
  }

  if (area.includes("home") || area.includes("family")) {
    return pickLine([
      "Clean the one place that keeps pulling your attention back",
      "Do the house-level task before turning care into resentment",
      "Settle the visible mess before explaining the invisible one"
    ], seed, name, area, gate);
  }

  if (area.includes("closure") || area.includes("sleep")) {
    return pickLine([
      "Close the oldest open detail before giving the night another question",
      "Write the final line, then stop negotiating with the same thought",
      "End the repeated question with one finished detail"
    ], seed, name, area, gate);
  }

  return pickLine([
    "Finish the task that keeps returning before answering the emotional question",
    "Choose the next clean action and refuse the extra debate",
    "Do the practical thing first; let the feeling explain itself later"
  ], seed, name, area, gate);
}

function conciseSceneAction(context, seed = 0, name = "") {
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();
  const area = String(context.dailyArea || "").toLowerCase();
  const gate = String(context.decisionGate || context.mentorMove || "").toLowerCase();
  if (/\bcalendar\b|\bslot\b|\bcommitment\b/.test(scene)) {
    return pickLine([
      "Mark the calendar slot with one real commitment before the day bargains",
      "Put one commitment on the calendar before the options multiply",
      "Choose the calendar slot that can actually be kept today"
    ], seed, name, scene, area, gate);
  }
  if (/\bmirror\b/.test(scene)) {
    const mirrorDetail = [
      "first answer",
      "quiet no",
      "breath at the glass",
      "unborrowed voice",
      "cost you already felt"
    ][mod(stableHash(`${name}|mirror-detail`), 5)];
    return pickLine([
      `Keep the ${mirrorDetail} at the mirror and do not soften it into duty`,
      `Step away from the mirror while the ${mirrorDetail} is still clear`,
      `Name the ${mirrorDetail} before agreement borrows your voice`,
      `Let the mirror moment protect the ${mirrorDetail} from becoming automatic`,
      `Hold the ${mirrorDetail} long enough to refuse the costly yes`
    ], seed, name, scene, area, gate, mirrorDetail);
  }
  if (/\bworkspace\b|\bdesk edge\b|\bwork edge\b/.test(scene)) {
    return pickLine([
      "Clear the desk edge, then finish the smallest usable draft",
      "Move one item off the workspace before sending the work",
      "Put the next task on the desk and finish that first"
    ], seed, name, scene, area, gate);
  }
  if (/\bkitchen counter\b|\bcounter before\b/.test(scene)) {
    return pickLine([
      "Clear the kitchen counter before the first task borrows the night",
      "Clear one object from the kitchen counter before the first practical reset",
      "Put the first task on the counter before the thought expands"
    ], seed, name, scene, area, gate);
  }
  if (/\blist\b|\bitem\b|\bunnamed\b/.test(scene)) {
    return pickLine([
      "Mark the unnamed item on the list before the whole plan grows",
      "Mark one list item before the day turns into a bigger promise",
      "Finish one listed task before adding another possible version"
    ], seed, name, scene, area, gate);
  }
  if (/\btab\b|\bmind\b|\bworry\b|\bthought\b/.test(scene)) {
    if (area.includes("creative") || area.includes("visibility") || area.includes("self-expression")) {
      return pickLine([
        "Close the old tab in your mind before showing the rough version",
        "Show the rough version before the old tab in your mind reloads",
        "Mark the creative draft once before the old thought reopens"
      ], seed, name, scene, area, gate);
    }
    if (area.includes("family") || area.includes("home") || area.includes("fatigue")) {
      return pickLine([
        "Write the returning thought in one line before reopening the day",
        "Close the old tab in your mind before answering the family duty",
        "Put the repeated thought into one line before care turns heavy"
      ], seed, name, scene, area, gate);
    }
    return pickLine([
      "Close the old tab in your mind before checking the question again",
      "Write the returning thought in one line before reopening the day",
      "Close the worry tab before it spends another hour as planning"
    ], seed, name, scene, area, gate);
  }
  if (/\bchair\b|\bsame worry\b|\bworry keeps returning\b/.test(scene)) {
    return pickLine([
      "Stand up from the chair and name the cost before answering",
      "Move from the chair before the same worry negotiates again",
      "Use the chair as the stop mark and answer only the real request"
    ], seed, name, scene, area, gate);
  }
  if (/\bcup\b|\btea\b|\bcoffee\b|\bcooling\b/.test(scene)) {
    return pickLine([
      "Let the cooling cup end the rehearsal before you approve the expense",
      "Approve only the number that still makes sense beside the cup",
      "Use the cooling cup as the stop mark before the answer grows"
    ], seed, name, scene, area, gate);
  }
  if (/\bmeal\b|\bbreakfast\b|\blunch\b|\bdinner\b|\bfood\b/.test(scene)) {
    return pickLine([
      "Eat the first meal before deciding what still deserves attention",
      "Protect the delayed meal before giving the thought another hearing",
      "Finish the first meal before letting the question take over"
    ], seed, name, scene, area, gate);
  }
  if (/\bduty\b|\bresentment\b/.test(scene)) {
    return pickLine([
      "Choose one time for the duty before resentment writes the answer",
      "Put the duty into one hour before care turns into resentment",
      "Write the duty into one slot before it starts asking for anger"
    ], seed, name, scene, area, gate);
  }
  if (/\bunsent\b|\bdid not send\b/.test(scene)) {
    return pickLine([
      "Name the sentence you did not send, then close the notebook",
      "Keep the quiet room clear and stop editing the held-back words",
      "Leave the unsent sentence aside until the next hour"
    ], seed, name, scene, area, gate);
  }
  if (/\b(message|reply|conversation|call)\b/.test(scene)) {
    return pickLine([
      "Answer only the real request and leave the extra sentence alone",
      "Keep the reply to two lines and do not reopen the case",
      "Send the necessary answer, then let silence do the rest"
    ], seed, name, scene, area, gate);
  }
  if (/\b(wallet|receipt|payment|bill|amount)\b/.test(scene)) {
    return pickLine([
      "Check the receipt once, then decide the payment before reopening the worry",
      "Write the amount clearly and make the money choice before dinner",
      "Put the bill in one place and stop letting it follow every thought"
    ], seed, name, scene, area, gate);
  }
  if (/\b(shoes|door|errand|keys|bag|charger)\b/.test(scene)) {
    return pickLine([
      "Put on the shoes and finish the errand before the feeling negotiates",
      "Place the keys by the door and leave within ten minutes",
      "Pack the bag once, then stop reopening the same decision",
      "Gather the charger and leave before delay becomes a mood",
      "Leave through the door before the promise turns symbolic",
      "Put the charger in the bag before the delay grows",
      "Set the keys by the door and finish the errand"
    ], seed, name, scene, area, gate);
  }
  if (/\b(pen|page|notebook|sentence|draft)\b/.test(scene)) {
    return pickLine([
      "Use the waiting pen to write the decision in one line",
      "Write the final sentence, then leave the page alone",
      "Mark the page once and stop asking the thought to mature",
      "Close the notebook after the unfinished line gets its answer",
      "Put one sentence on the page before the mood edits it"
    ], seed, name, scene, area, gate);
  }
  if (/\b(laundry|drawer|room|floor|kitchen|counter)\b/.test(scene)) {
    return pickLine([
      "Close the open drawer before explaining the invisible mess",
      "Clear the small surface first; let the room change before the story grows",
      "Fold the laundry in front of you before carrying the whole house emotionally",
      "Put the open drawer right before the mood claims the whole room",
      "Clear the floor-level proof before asking the mind for certainty"
    ], seed, name, scene, area, gate);
  }
  if (/\b(meal|water|bed|sleep|rest|body|jaw)\b/.test(scene)) {
    return pickLine([
      "Drink water and eat before treating urgency as instruction",
      "Rest the body first, then decide what still matters",
      "Unclench the jaw before choosing words that must last"
    ], seed, name, scene, area, gate);
  }
  return "";
}

function conciseClose(context, seed = 0, name = "") {
  const tone = String(context.timingTone || context.innerWeather || "").toLowerCase();
  const scene = String(context.openingScene || context.dailyScene || "").toLowerCase();
  const area = String(context.dailyArea || "").toLowerCase();
  const gate = String(context.decisionGate || context.mentorMove || "").toLowerCase();
  if (/\bcalendar\b|\bslot\b|\bcommitment\b/.test(scene)) {
    return pickLine([
      "one commitment is kinder than four possible plans",
      "the hour needs a promise it can hold",
      "the rest of the day can stop auditioning"
    ], seed, name, scene, area, gate);
  }
  if (/\bmirror\b/.test(scene)) {
    return pickLine([
      "the first answer is allowed to stay simple",
      "agreement is not kindness when it costs your center",
      "the clean no will protect more than a tired yes"
    ], seed, name, scene, area, gate);
  }
  if (/\bworkspace\b|\bdesk edge\b|\bwork edge\b/.test(scene)) {
    return pickLine([
      "judge the work after one visible finish, not before",
      "the draft will look clearer once the desk has changed",
      "one finished piece will answer the private verdict"
    ], seed, name, scene, area, gate);
  }
  if (/\bkitchen counter\b|\bcounter before\b/.test(scene)) {
    return pickLine([
      "the first task will shrink after the counter changes",
      "the counter can hold the beginning better than the mind",
      "one practical beginning is enough for this hour"
    ], seed, name, scene, area, gate);
  }
  if (/\blist\b|\bitem\b|\bunnamed\b/.test(scene)) {
    return pickLine([
      "one named item is kinder than a list that keeps expanding",
      "the list needs a finish mark more than another option",
      "one completed line can stop the day from growing sideways"
    ], seed, name, scene, area, gate);
  }
  if (/\btab\b|\bmind\b|\bworry\b|\bthought\b/.test(scene)) {
    return pickLine([
      "the mind gets quieter when one tab is actually closed",
      "the old thought does not need another private review",
      "one closed mental tab is enough evidence for this hour"
    ], seed, name, scene, area, gate);
  }
  if (/\b(wallet|receipt|payment|bill|amount)\b/.test(scene)) {
    return pickLine([
      "one clear number is enough for now",
      "the day needs a decision, not another audit",
      "money gets quieter when the next choice is named"
    ], seed, name, scene, area, gate);
  }
  if (/\b(shoes|door|errand|keys|bag|charger)\b/.test(scene)) {
    if (area.includes("friendship") || area.includes("social") || area.includes("belonging")) {
      return pickLine([
        "the answer can stay brief once the real request is handled",
        "access stays kinder when the extra sentence remains outside",
        "the request gets easier when availability has a clear edge"
      ], seed, name, scene, area, gate);
    }
    if (area.includes("work") || area.includes("authority") || area.includes("ambition")) {
      return pickLine([
        "the errand will give the unfinished work a cleaner start",
        "the keys can carry the decision farther than another review",
        "the task gets smaller once the first exit is real"
      ], seed, name, scene, area, gate);
    }
    return pickLine([
      "movement will settle what thinking keeps reopening",
      "the errand carries more truth than the mood",
      "the doorway has already made the choice smaller",
      "outside air will make the decision less dramatic",
      "the delay loses power once the threshold is crossed",
      "the keys will feel lighter once the errand is finished",
      "the threshold stops arguing once the errand is done"
    ], seed, name, scene, area, gate);
  }
  if (/\bunsent\b|\bdid not send\b/.test(scene)) {
    return pickLine([
      "one held sentence is enough for this hour",
      "silence stays kinder when the answer is already set aside",
      "the page can close before the answer asks for another edit"
    ], seed, name, scene, area, gate);
  }
  if (/\b(pen|page|notebook|sentence|draft|unsent)\b/.test(scene)) {
    return pickLine([
      "one finished line is enough before another review",
      "the page needs a mark, not a private trial",
      "the unfinished line has taken enough authority",
      "read the sentence once after dinner, then stop editing",
      "judge the mark after it exists, not while fearing it"
    ], seed, name, scene, area, gate);
  }
  if (/\b(laundry|drawer|room|floor|kitchen|counter)\b/.test(scene)) {
    return pickLine([
      "the room can carry what thinking could not",
      "order outside will lower the argument inside",
      "one changed surface is enough proof for now",
      "the drawer can stop carrying the whole mood",
      "the surface is proof that care still happened"
    ], seed, name, scene, area, gate);
  }
  if (tone.includes("delay") || tone.includes("slow")) {
    return pickLine([
      "the delay becomes useful when one thing is actually complete",
      "progress returns when the day has one finished mark",
      "patience works better when it has a real task"
    ], seed, name, tone);
  }
  if (tone.includes("pressure") || tone.includes("urgent")) {
    return pickLine([
      "one completed detail will quiet the pressure more than another explanation",
      "the pressure needs evidence, not a longer argument",
      "let one result answer the urgency"
    ], seed, name, tone);
  }
  if (tone.includes("tender") || tone.includes("emotional")) {
    return pickLine([
      "care stays clean when it has a limit you can keep",
      "the heart trusts actions that do not abandon you",
      "warmth becomes safer when timing is honest"
    ], seed, name, tone);
  }
  return pickLine([
    "let the next choice wait until food and water have had their turn",
    "the rest can wait until one useful detail is actually finished",
    "enough has been decided once the next hour has a real action",
    "the next hour does not need a second argument before one task is done",
    "the day gets easier when the instruction stays singular and checkable",
    "one clean decision can carry the next hour without another private trial"
  ], seed, name, tone, area, scene, gate);
}

function polishLocalWisdom(text) {
  return String(text || "")
    .replace(/\ba visible place to land\b/gi, "a timed slot outside the head")
    .replace(/\bwith a place to land\b/gi, "with one hour, reply, or task")
    .replace(/\bplace to land\b/gi, "named hour attached")
    .replace(/\bone less loose end\b/gi, "one fewer thing asking for bedtime attention")
    .replace(/\bwhole weather\b/gi, "whole atmosphere")
    .replace(/\bthe room asks\b/gi, "the exchange asks")
    .replace(/\bA named hour keeps care warm without leaving you endlessly reachable\./g, "A reply with a real hour keeps care present without making you reachable all day.")
    .replace(/\bThe kinder answer is short enough to keep after the mood changes\./g, "The kinder answer is the one that still feels fair after dinner.")
    .replace(/\bA closed loop can hold the place of certainty until tomorrow\./g, "A closed note, paid bill, or finished task can carry tonight.")
    .replace(/\bLet the finish be modest, complete, and free from extra explanation\./g, "Keep the finish ordinary, complete, and free from extra explanation.")
    .replace(/\bLet the finish be modest; the nervous system believes repetition more than intensity\./g, "Keep the finish ordinary; the body trusts repetition more than intensity.")
    .replace(/\bthe body gives better timing when the body gets handled\b/gi, "the next choice gets better timing when food, water, breath, or rest is handled")
    .replace(/\bThe body gives better timing when the body gets handled\b/g, "The next choice gets better timing when food, water, breath, or rest is handled")
    .replace(/\bnot another argument rehearsed alone\b/gi, "not another debate held alone")
    .replace(/\banother argument rehearsed alone\b/gi, "another debate held alone")
    .replace(/\bneeds a visible container\b/gi, "needs a time, owner, and end")
    .replace(/\bvisible container before\b/gi, "time, owner, and end before")
    .replace(/\bdecision has a visible place\b/gi, "decision has a timed place")
    .replace(/\bpressure a handle\b/gi, "pressure a usable instruction")
    .replace(/\bgives the pressure a handle\b/gi, "turns pressure into a usable instruction")
    .replace(/\bgives .*? a handle\b/gi, (match) => match.replace(/\ba handle\b/i, "a timed task"))
    .replace(/\bneeds a handle\b/gi, "needs a timed task")
    .replace(/\bvisible repair\b/gi, "checkable repair")
    .replace(/\bprivate trial\b/gi, "measure of worth")
    .replace(/\bvisible finish\b/gi, "finished piece")
    .replace(/\bone visible finish\b/gi, "one finished piece")
    .replace(/\bvisible block\b/gi, "timed block")
    .replace(/\bvisible choice\b/gi, "choice with an ending")
    .replace(/\bsmaller promise\b/gi, "promise with a real edge")
    .replace(/\bgets lighter for\b/gi, "gets easier for")
    .replace(/\banswered with a time, not a debate\b/gi, "given a clock before debate starts")
    .replace(/\banswer with a time, not a debate\b/gi, "answer with a clock before debate starts")
    .replace(/\bthe actual strain around\b/gi, "the real cost inside")
    .replace(/\bgive it a limit that can be checked\b/gi, "put it inside one action with a visible end")
    .replace(/\bWater and a slower breath can move the choice out of emergency mode\./g, "Drink water, unclench your jaw, and make the choice after the body stops rushing.")
    .replace(/\bwater and a slower breath\b/gi, "water and an unclenched jaw")
    .replace(/\bbody is protected before availability is promised\b/gi, "meal, rest, or water is handled before you promise time")
    .replace(/\bmake the day respond to motion first\b/gi, "leave one practical result on the table first")
    .replace(/\blet the loop end\b/gi, "close the repeated question")
    .replace(/\bnot a bigger mood\b/gi, "not a more convincing mood")
    .replace(/\bwritten into one hour, reply, or task\b/gi, "attached to one specific hour, reply, or task")
    .replace(/\bproof enough\b/gi, "enough evidence for tonight")
    .replace(/\bcloseness arrive with shape\b/gi, "closeness stay tied to timing")
    .replace(/\s+/g, " ")
    .trim();
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
    if (isUsableLocalWisdom(plan, name, constraints)) {
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
    if (isUsableLocalWisdom(compactPlan, name, constraints)) {
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
      compactReturnOpeningLine(lowerScene, pressure, seed),
      compactConditionOpeningLine(lowerScene, seed),
      `With ${lowerScene} in view, the next choice needs size, not extra interpretation.`,
      `After you notice ${lowerScene}, give the hour one job it can finish.`,
      `Before ${lowerScene} becomes a private headline, move one practical piece.`
    ],
    scene: [
      `The detail around ${lowerScene} shows where attention needs a smaller job.`,
      `That small interruption around ${lowerScene} points to the exact place to reduce pressure.`,
      `One overlooked fact in ${lowerScene} belongs in the hands, not in another explanation.`,
      `The ordinary edge of ${lowerScene} is enough to start the repair.`,
      `That detail in ${lowerScene} is asking for a decision with a visible end.`
    ],
    statement: [
      `${subject} is carrying more pressure than the situation can justify.`,
      `${subject} shows where delay has started acting like proof.`,
      `${subject} needs a clear container before the mind turns it into a case file.`,
      `${subject} belongs to today's schedule, not to a report card on your worth.`,
      `${subject} is asking for a practical repair before it becomes a mood.`
    ],
    imperative: [
      `Notice ${lowerScene} before it becomes evidence for a harsher story.`,
      `Use ${lowerScene} to choose the next handleable action, then stop widening the problem.`,
      `Keep ${lowerScene} close enough to act on, not close enough to overread.`,
      `Treat ${lowerScene} like a work surface, not a verdict.`,
      `Give ${lowerScene} one use before the mind makes it symbolic.`
    ]
  };
  return pickDistinctLine(lines[preferredBucket] || lines.statement, seed, new Set(), lowerScene, preferredBucket);
}

function compactNameLine(name, context, seed, imperative, usedLines = new Set()) {
  const area = dailyAreaLabel(context.dailyArea, seed);
  const need = compactNeed(context.coreNeed || context.innerWeather, seed);
  const cost = compactAvoid(context.avoid || context.emotionalKnot, seed);
  const lines = imperative ? [
    `Give ${area} a measurable job for ${name}, then refuse the extra performance around it.`,
    `Make ${area} small enough for ${name} to complete without auditioning for approval.`,
    `Keep ${name}'s next move visible around ${area}, especially where ${cost} starts spending attention.`
  ] : [
    compactNeedPlacementLine(name, area, need, seed),
    attentionCostNameLine(name, area, cost, seed),
    compactNeedGuardLine(name, area, need, seed)
  ];
  return pickDistinctLine(lines, seed, usedLines, name, area, need);
}

function compactNeedGuardLine(name, area, need, seed = 0) {
  return pickLine([
    `Around ${area}, ${name} can protect ${need} by choosing the part that has a real finish.`,
    `${name} can keep ${need} close to ${area} without making every reaction part of the job.`,
    `The quieter work for ${name} is to give ${need} one place inside ${area}, then stop widening it.`,
    `Around ${area}, ${need} needs one timed expression from ${name}, not a full-day defense.`,
    `${name} can let ${need} guide ${area} through one action that ends before the next meal.`
  ], seed, name, area, need);
}

function compactConditionOpeningLine(lowerScene, seed = 0) {
  return pickLine([
    `Before ${lowerScene} grows past the facts, give the next hour one task.`,
    `Before ${lowerScene} takes over the room, put one repair on the clock.`,
    `Before ${lowerScene} becomes the whole headline, mark one start and one stop.`,
    `Before ${lowerScene} asks for a larger story, answer with one dated task.`,
    `Before ${lowerScene} turns symbolic, put the nearest duty on a timer.`,
    `Before ${lowerScene} starts collecting extra meaning, choose the part that can close first.`
  ], seed, lowerScene);
}

function compactReturnOpeningLine(lowerScene, pressure, seed = 0) {
  return pickLine([
    `When ${lowerScene} returns, put ${pressure} beside a clock instead of a story.`,
    `When ${lowerScene} comes back into view, answer ${pressure} with one task that can close.`,
    `When ${lowerScene} interrupts again, give ${pressure} one start time and one finish.`,
    `When ${lowerScene} keeps returning, make ${pressure} small enough for the next hour.`,
    `When ${lowerScene} gets loud, move ${pressure} into a task the hands can finish.`
  ], seed, lowerScene, pressure);
}

function compactNeedPlacementLine(name, area, need, seed = 0) {
  return pickLine([
    `${name} needs ${need} placed in one request, hour, or task before ${area} starts deciding every reply.`,
    `${name} needs ${need} translated into one timed request before ${area} takes over the tone.`,
    `${name} can give ${need} a practical address before ${area} starts speaking for the whole day.`,
    `${name} should put ${need} on the calendar before ${area} starts asking for a verdict.`,
    `${name} needs ${need} tied to one action before ${area} becomes the explanation for everything.`
  ], seed, name, area, need);
}

function compactFillerLine(context, seed, imperative, usedLines = new Set()) {
  const area = dailyAreaLabel(context.dailyArea, seed);
  const body = compactBodyAnchor(context.bodySignal);
  const avoid = compactAvoid(context.avoid || context.emotionalKnot, seed);
  const window = timeBox(seed);
  const imperativeLines = [
    `Handle the ${window} task before the larger question gets another vote.`,
    "Keep the next reply short enough to be kept without resentment.",
    `Protect ${body} first, then let the decision shrink to the next page, call, or errand.`,
    `Finish the checkable repair before ${avoid} starts measuring the whole day.`,
    "Reduce the work to the part that can close before the next meal.",
    "Choose the action that leaves less mess for tonight, then stop taking new evidence.",
    "Name the limit once, in plain words, before approval turns into a second job."
  ];
  const statementLines = [
    bodyTimingLine(body, seed),
    socialAccessSentence(seed, area, avoid),
    compactTimedTaskLine(context, seed),
    habitInterruptionLine(avoid, seed),
    relationshipTimingLine(seed, area, avoid),
    areaBodySupportLine(area, body, seed),
    keptLimitAreaLine(area, seed),
    publicAreaShapeLine(area, seed),
    compactAreaLine(context, seed),
    silenceTimingLine(seed)
  ];
  return pickDistinctLine(imperative ? imperativeLines : statementLines, seed, usedLines, area, body, avoid);
}

function publicAreaShapeLine(area, seed = 0) {
  return pickLine([
    publicAreaOwnershipLine(area, seed),
    `Give ${area} one outside sign of progress before the day scatters.`,
    `${capitalize(area)} holds better when the next task names who does it and what proves it is done.`,
    `A visible appointment, line, or sent piece gives ${area} somewhere real to stand.`,
    `${capitalize(area)} needs one practical marker that another person could actually see.`
  ], seed, area);
}

function publicAreaOwnershipLine(area, seed = 0) {
  const lower = String(area || "").toLowerCase();
  if (lower.includes("visible work") || lower.includes("creative work")) {
    return "The visible work needs a submitted piece before another request is accepted.";
  }
  if (lower.includes("belonging")) {
    return "Belonging pressure needs one spoken limit before the room asks for more.";
  }
  if (lower.includes("conversation") || lower.includes("inner sentence") || lower.includes("inner dialogue")) {
    return "The repeated thought needs a closed note before it gets another hearing.";
  }
  if (lower.includes("money")) {
    return "The money choice needs a checked number before worry starts negotiating.";
  }
  if (lower.includes("body")) {
    return "Body rhythm needs one kept care cue before pressure gets language.";
  }
  return pickLine([
    `Let ${area} name who acts next and what counts as done.`,
    `${capitalize(area)} needs a finish mark someone else can recognize.`,
    `Put ${area} beside one owner, one result, and one closed door.`,
    `${capitalize(area)} works better when the next duty has a person and a receipt.`
  ], seed, area);
}

function socialAccessSentence(seed = 0, area = "", avoid = "") {
  return pickLine([
    "A shorter reply should leave warmth intact without turning the evening into a shift.",
    `Around ${area}, affection works better when the available window is spoken plainly.`,
    "Care can answer the person without becoming responsible for every reaction after it.",
    `When ${avoid} gets loud, the kind sentence is the one you can still keep after dinner.`,
    "A warm answer with a real ending protects more closeness than an open-ended yes.",
    "Let the reply carry care, not the whole emotional workload of the room."
  ], seed, area, avoid);
}

function areaBodySupportLine(area, body = "the body", seed = 0) {
  const anchor = compactBodyAnchor(body);
  return pickLine([
    `${capitalize(area)} gets easier after ${anchor} has been treated like part of the plan.`,
    `${capitalize(area)} should wait until ${anchor} is no longer being ignored.`,
    `The next move around ${area} is cleaner when ${anchor} has been answered first.`,
    `${capitalize(area)} loses some drama once ${anchor} is given food, water, rest, or breath.`,
    `A cared-for ${anchor} keeps ${area} from borrowing urgency it has not earned.`
  ], seed, area, anchor);
}

function keptLimitAreaLine(area, seed = 0) {
  return pickLine([
    `A kept limit gives ${area} a finish line before effort starts arguing for permission.`,
    `${capitalize(area)} needs one ending that can be pointed to before the day expands.`,
    `One named stop keeps ${area} from taking the whole evening hostage.`,
    `The useful rule around ${area} is the one that still holds after the mood changes.`,
    `A clear stopping point lets ${area} stay practical instead of becoming a verdict.`
  ], seed, area);
}

function completionRespectLine(seed = 0, close = "") {
  return pickLine([
    `${capitalize(close)} deserves the evening before another doubt asks for evidence.`,
    "A finished detail should not have to defend itself twice.",
    "Let the completed part stay complete while the remaining question cools down.",
    "The next doubt can wait until the body has registered what was already handled.",
    "A closed task earns more trust than the late review trying to reopen it."
  ], seed, close);
}

function compactTimedTaskLine(context, seed = 0) {
  const area = dailyAreaLabel(context.dailyArea, seed);
  const window = timeBox(seed + 5);
  const close = closingEvidence(context, seed + 7);
  return pickLine([
    `A ${window} block gives ${area} a finish line the mind can actually verify.`,
    `The next ${window} block around ${area} should end with ${close}, not another debate held alone.`,
    `${capitalize(area)} gets easier when one timed block ends before the story expands.`,
    `A named ${window} task puts the decision somewhere outside your head.`,
    finishedBlockEvidenceLine(seed, area),
    `The timer matters because ${area} needs an exit, not another inner hearing.`,
    `A closed ${window} effort around ${area} can matter more than another rehearsal.`,
    `The next block should leave a visible result: ${close}.`
  ], seed, area, close, context.openingScene, context.bodySignal);
}

function finishedBlockEvidenceLine(seed = 0, area = "the current choice") {
  return pickLine([
    `One finished block around ${area} gives tonight a fact to trust.`,
    `A completed block around ${area} leaves the evening with less to interpret.`,
    `One timed finish around ${area} gives the body a result, not another theory.`,
    `${capitalize(area)} changes when one block ends with something dated, sent, paid, or cleared.`,
    `One completed block around ${area} can answer the pressure in a language it understands.`
  ], seed, area);
}

function habitInterruptionLine(avoid, seed = 0) {
  return pickLine([
    `The habit of ${avoid} loses force when the next choice has a start time and a stop.`,
    `The habit of ${avoid} gets smaller when the next answer is dated, brief, or finished.`,
    `The habit of ${avoid} has less room once the next action ends in something visible.`,
    `The habit of ${avoid} quiets down when the next choice is measured by completion.`,
    `The habit of ${avoid} should meet one finished detail before it gets another opinion.`
  ], seed, avoid);
}

function ordinaryFinishCloseLine(seed = 0, close = "the completed detail") {
  return pickLine([
    `Keep ${close} in view, then do not add a second defense tonight.`,
    "Leave the completed part alone; the hour does not need another explanation.",
    "Protect the ordinary finish; no new argument gets added after it.",
    "Stop at the completed detail; extra explanation can wait.",
    "Keep the ending small enough to repeat, then let the body register it."
  ], seed, close);
}

function compactClosingLine(context, preferredBucket = "", seed = 0) {
  const close = closingEvidence(context, seed);
  const lines = {
    condition: [
      `When evening comes, let ${close} sit in the record before doubt starts talking.`,
      "If pressure returns, answer it with the task already closed in your hands.",
      "With less performance, the day can end around something honestly completed.",
      "Before night, let the completed detail speak louder than the unsettled interpretation.",
      "After the practical repair is done, leave the larger meaning for tomorrow.",
      `When the next doubt arrives, point it toward ${close}.`
    ],
    scene: [
      "The closed tab, paid bill, sent reply, or cleared corner can be enough for tonight.",
      "One handled detail can hold the place of certainty until tomorrow.",
      "This completed detail gives the evening something real to lean on."
    ],
    statement: [
      plainWorkClosingLine(seed, close),
      "A kept time, closed task, and rested body are enough to carry into evening.",
      completionRespectLine(seed, close)
    ],
    imperative: [
      ordinaryFinishCloseLine(seed, close),
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
  if (normalized.includes("boundary") || normalized.includes("limit")) {
    return pickLine([
      "a limit with a real hour on it",
      "an answer small enough to keep",
      "a clear edge that does not need a speech",
      "one available hour that can survive the mood",
      "a no or yes with timing attached"
    ], seed, normalized);
  }
  if (normalized.includes("belong")) return "belonging without self-abandonment";
  return pickLine([
    "room to move slowly",
    "a cleaner inner rule",
    "clear support",
    "a decision with a named stop",
    "one usable yes or no",
    "a reply or task that knows when to end"
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

function compactAvoid(text, seed = 0) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("checking") || normalized.includes("signs")) {
    return pickLine([
      "checking every small change",
      "turning tiny shifts into evidence",
      "scanning ordinary details for proof",
      "making every change testify",
      "treating ordinary pauses like evidence",
      "asking small changes to explain too much",
      "scanning each delay for permission"
    ], seed, normalized);
  }
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
      "making ordinary pauses sound personal",
      "asking small changes to explain too much",
      "scanning each delay for permission",
      "letting one pause testify for the whole day"
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

function avoidPatternSubject(text) {
  const value = fragment(text).toLowerCase();
  if (!value) return "the old pattern";
  if (/^(letting|checking|turning|treating|making|using|asking|reading|scanning|proving|explaining|answering|over-reading|over-explaining|obeying|defending|chasing)\b/.test(value)) {
    return `the habit of ${value}`;
  }
  return value;
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
  if (normalized.includes("respect") && normalized.includes("explain")) {
    return pickLine([
      "respect without a defense speech",
      "a clear request for respect",
      "respect that does not need extra evidence",
      "one respectful answer with no performance",
      "a cleaner way to ask for respect"
    ], seed, normalized);
  }
  if (normalized.includes("boundary") || normalized.includes("speech")) {
    return pickLine([
      "one boundary that does not need a speech",
      "a limit that can stand without performance",
      "a limit around what you can offer",
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
      "protect quiet without becoming unreachable",
      "let peace have a shape without becoming hard"
    ], seed, normalized);
  }
  if (normalized.includes("smallest action")) {
    return pickLine([
      "make one action visible enough to respect",
      "give the smallest action a clear finish point",
      "let the first action become clear enough to trust",
      "turn the smallest action into something the day can verify",
      "turn the smallest action into something visible"
    ], seed, normalized);
  }
  return fragment(text);
}

function actionPhrase(text, seed = 0) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("visible task") && normalized.includes("emotional debate")) {
    return pickLine([
      "finish the visible task before the mood starts negotiating",
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
  if (normalized.includes("finish the promise")) {
    return pickLine([
      "close the promise you made quietly",
      "complete the promise that already has enough shape",
      "finish the commitment that has been waiting",
      "bring the private promise to a real ending",
      "make the old promise visible and complete"
    ], seed, normalized);
  }
  return fragment(text);
}

function workPhrase(text, seed = 0) {
  const normalized = fragment(text).toLowerCase();
  if (normalized.includes("vague plan") && normalized.includes("appointment")) {
    return pickLine([
      "place the appointment on the calendar",
      "give the plan one dated slot",
      "turn the plan into a time someone can see",
      "move the plan from idea to calendar",
      "choose one appointment time and stop widening the plan"
    ], seed, normalized);
  }
  return fragment(text);
}

function compactAreaLine(context, seed = 0) {
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
  if (area.includes("belonging") || area.includes("friendship")) {
    return "Belonging gets less expensive when access is named before it is offered.";
  }
  if (area.includes("creative") || area.includes("visibility")) {
    return "Creative work needs a rough version before the inner critic edits the room.";
  }
  if (area.includes("closure") || area.includes("sleep")) {
    return "Private closure starts with one finished detail, not another late review.";
  }
  if (area.includes("home")) {
    return "Home rhythm settles when one room-level detail is handled without ceremony.";
  }
  return pickLine([
    "The next practical piece gets clearer once it is named out loud.",
    "The situation shrinks when one task receives a beginning and an ending.",
    "A named duty can stop the story from expanding past the facts.",
    "The useful part appears faster when the day has one job to finish.",
    "One handled detail can interrupt the pressure before it becomes atmosphere."
  ], seed, context.dailyArea, context.openingScene);
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
      "Breakfast timing",
      "Meal timing",
      "The postponed food cue"
    ], seed, scene);
  }
  if (/\b(desk|workspace|surface)\b/.test(normalized)) {
    return pickLine([
      "The work surface edge",
      "The workspace edge",
      "The item left on the desk"
    ], seed, scene);
  }
  const category = sceneCopyCategory(scene);
  const subjects = {
    water: ["Water before judgment", "The bedside glass", "First-sip discipline"],
    calendar: ["Calendar hesitation", "Appointment pressure", "The delayed square"],
    notebook: ["Notebook silence", "The waiting line", "Pen pressure"],
    kitchen: ["Kitchen-counter evidence", "The delayed meal", "Cooling-cup patience"],
    money: ["Wallet arithmetic", "Receipt pressure", "The payment pause"],
    room: ["The work surface cue", "The open drawer", "Room-level disorder"],
    door: ["Door delay", "Keys gathered late", "The errand threshold"],
    body: ["Mirror honesty", "Shoulder-level resistance", "Jaw-tight timing"],
    conversation: ["Unsent-sentence pressure", "Conversation timing", "Held-back wording"],
    task: ["List pressure", "Draft resistance", "The unnamed task"],
    worry: ["Mental-tab pressure", "The returning thought", "A loop asking for closure"]
  };
  return pickLine(subjects[category] || ["The nearest detail", "Practical pressure", "The overlooked cue"], seed, scene);
}

function scenePressure(scene, seed = 0) {
  const category = sceneCopyCategory(scene);
  const phrases = {
    water: ["the body asking to decide after care", "the morning needing sequence before meaning"],
    calendar: [
      "the appointment waiting for a real slot",
      "the deadline waiting for a named hour",
      "the calendar item asking for one start and stop",
      "the delayed commitment asking for a smaller promise",
      "the blank slot waiting for a firm owner"
    ],
    notebook: ["the thought needing ink instead of rehearsal", "the unfinished line asking for a decision"],
    kitchen: ["the routine asking to be fed before it is judged", "the first task asking for a cleared surface"],
    money: ["the money question asking for numbers instead of worry", "the price, promise, or delay needing separation from self-worth"],
    room: [
      "ten minutes of visible order in the room",
      "the drawer needing a short decision",
      "the work surface asking for one reset",
      "the small room detail asking for hands",
      "the open corner needing one contained action"
    ],
    door: ["movement instead of another inner meeting", "preparation instead of postponement"],
    body: ["the body refusing a yes that arrives too quickly", "the pause asking to be respected before agreement"],
    conversation: ["timing instead of force", "a reply smaller than the fear"],
    task: ["the list needing a named first item", "the draft asking to become real before it becomes good"],
    worry: ["the thought needing a closing ritual", "the old loop asking for a practical receipt"]
  };
  return pickLine(phrases[category] || ["the nearest decision needing a definite edge", "the loose detail asking for a smaller promise"], seed, scene);
}

function sceneCopyCategory(text) {
  const normalized = String(text || "").toLowerCase();
  if (/\b(water|glass|drink)\b/.test(normalized)) return "water";
  if (/\b(kitchen|counter|tea|cup|meal|food|breakfast|lunch)\b/.test(normalized)) return "kitchen";
  if (/\b(calendar|appointment|deadline|time|hour|slot)\b/.test(normalized)) return "calendar";
  if (/\b(notebook|page|pen|line|written|write)\b/.test(normalized)) return "notebook";
  if (/\b(wallet|receipt|payment|bill|price|money)\b/.test(normalized)) return "money";
  if (/\b(chair|room|desk|workspace|surface|drawer|laundry|bed|domestic)\b/.test(normalized)) return "room";
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
  const area = dailyAreaLabel(context.dailyArea, seed);
  const details = [
    "the calendar slot kept",
    "the reply left short and true",
    "the oldest task named and closed",
    "the payment checked without self-punishment",
    bodyEvidenceLine(seed + 3, context),
    "the body cue protected before the reply",
    bodyEvidenceLine(seed + 5, context),
    bodyEvidenceLine(seed, context),
    "the draft made real before it was judged",
    "the named limit",
    `the named limit around ${area}`
  ];
  return pickLine(details, seed, area, context.stabilizer, context.workSignal);
}

function bodyEvidenceLine(seed = 0, context = {}) {
  return pickLine([
    "one physical need handled before interpretation",
    "a water, food, or rest cue answered early",
    "the body given facts before the mood votes",
    "one tired-body demand removed from the decision",
    "a small care cue handled without negotiation",
    "the first body need answered before meaning grows",
    "one meal, sip, or rest cue kept practical",
    "one body need handled before the answer leaves"
  ], seed, context.bodySignal, context.dailyArea, context.openingScene);
}

function buildTaskFirstWisdom(user, context) {
  return `${sceneSeed(context)} points to the task that needs a cleaner shape. ${firstName(user.name)}, put ${context.workSignal} where it can be seen, then stop asking the mood to approve it. ${capitalize(context.emotionalKnot)} can turn a simple duty into a private test. Use ${context.stabilizer}, keep ${context.avoid} away from the next decision, and let one finished detail make the day feel less negotiable.`;
}

function buildBodyFirstWisdom(user, context) {
  return `${sceneSeed(context)} is the first clue, and the body should be answered before the explanation grows. ${firstName(user.name)}, ${context.bodySignal} before the room starts asking for more words. ${capitalize(context.innerWeather)} becomes easier to trust when ${context.coreNeed} is treated as a real need, not a luxury. Give one task a clean finish, keep the conversation shorter than the worry around it, and let ${context.relationshipMirror} guide your pace without taking over your worth.`;
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
  return `${sceneSeed(context)} is where the old rhythm tries to collect evidence. ${firstName(user.name)}, put ${context.innerWeather} into one visible move: ${context.stabilizer}. ${capitalize(context.personalEdge)} before the day turns it into a verdict. If ${context.relationshipMirror}, let that soften your reaction without erasing your position. A repeatable choice matters more than a dramatic breakthrough.`;
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
    return "Recognition is moving slower than your effort, but the work still needs one marked stopping point.";
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
    openingConditionLine(lowerScene, pressure, window, seed),
    openingTimingLine(lowerScene, pressure, window, seed),
    `Keep ${lowerScene} in view until the problem fits inside the next timed action.`,
    `Notice ${lowerScene} before the mind turns it into a harsher story.`,
    openingInstructionLine(scene, seed),
    `Use ${lowerScene} to begin with facts before the feeling starts editing them.`,
    stayWithSceneLine(lowerScene, seed),
    `Let ${lowerScene} mark the work that belongs to this hour, then leave the old interpretation outside.`,
    `Treat ${lowerScene} as the first practical fact, not a secret accusation.`,
    sceneExplanationLine(scene, seed),
    openingUseLine(lowerScene, seed),
    subjectPhysicalActionLine(subject, seed),
    returningSubjectLine(subject, seed),
    subjectVerdictLine(subject, seed)
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, scene, context.dailyArea, context.coreNeed, context.personalEdge);
}

function openingUseLine(lowerScene, seed = 0) {
  return pickLine([
    `Use ${lowerScene} as the marker for the next finish line before concern spreads.`,
    `Make ${lowerScene} point to the piece that can be handled before lunch.`,
    `Keep ${lowerScene} tied to a single action, not a verdict about the day.`,
    `Give ${lowerScene} a named errand before the thought widens.`,
    `Use ${lowerScene} to pick the next checkable repair instead of measuring the entire afternoon.`
  ], seed, lowerScene);
}

function openingConditionLine(lowerScene, pressure, window, seed = 0) {
  const beforeScene = lowerScene.includes(" before ") ? lowerScene.replace(/\bbefore\b/g, "near") : lowerScene;
  return pickLine([
    `Before ${beforeScene} tries to summarize the day, ${pressure} belongs inside a ${window} repair.`,
    `When ${lowerScene} returns to your notice, put ${pressure} into one action with an ending.`,
    `With ${lowerScene} still ordinary, handle ${pressure} inside a ${window} block.`,
    interruptedSceneLine(lowerScene, pressure, seed),
    `Before ${beforeScene} turns into a private headline, give ${pressure} a start time and an end.`,
    `Before ${beforeScene} grows beyond the facts, put ${pressure} where the clock can see it.`,
    `Before ${beforeScene} starts explaining too much, give ${pressure} one practical container.`
  ], seed, lowerScene, pressure, window);
}

function openingTimingLine(lowerScene, pressure, window, seed = 0) {
  return pickLine([
    `The next useful move begins around ${lowerScene}, where ${pressure} is asking for size.`,
    `A ${window} block around ${lowerScene} gives ${pressure} a practical limit.`,
    `The scene around ${lowerScene} is not the issue; the hidden cost sits in ${pressure}.`,
    `One practical action around ${lowerScene} can make ${pressure} less expensive by evening.`,
    `${capitalize(lowerScene)} shows where ${pressure} can become practical.`
  ], seed, lowerScene, pressure, window);
}

function interruptedSceneLine(lowerScene, pressure, seed = 0) {
  return pickLine([
    `After ${lowerScene} interrupts the day, give ${pressure} one clean ending.`,
    `After ${lowerScene} interrupts the day, move ${pressure} into a result you can point to.`,
    `After ${lowerScene} interrupts the day, shrink ${pressure} until one action can carry it.`,
    `After ${lowerScene} interrupts the day, answer ${pressure} with a timed repair instead of a debate.`,
    `After ${lowerScene} interrupts the day, keep ${pressure} inside the first action that can close.`
  ], seed, lowerScene, pressure);
}

function nameLine(name, context, seed) {
  const edge = edgePhrase(context.personalEdge || context.emotionalKnot || "turning a workable moment into a verdict", seed);
  const need = needPhrase(context.coreNeed || context.innerWeather || "room to move slowly", seed);
  const area = dailyAreaLabel(context.dailyArea, seed);
  const edgeInstruction = lowerFirst(edge);
  const cost = compactAvoid(context.avoid || context.emotionalKnot, seed);
  const lines = [
    `${name} needs to ${edgeInstruction}; let ${area} stay smaller than a test nobody assigned.`,
    delayCostLine(area, name, need, seed),
    containerAskLine(area, name, seed),
    `Give today's need a specific shape, ${name}, before the same problem changes costume again.`,
    sharperWorkLine(name, edgeInstruction, seed),
    delayHandledLine(area, name, seed),
    `Give ${area} a visible start and finish, ${name}, while ${cost} is still small enough to interrupt.`,
    visibleChoiceLine(name, seed),
    timedNameActionLine(name, edgeInstruction, seed),
    `Separate ${need} from the noise around ${area}, ${name}, before you answer anything urgent.`,
    realNeedLine(area, name, need, seed),
    `Before ${area} becomes heavier than it has to be, ${name} needs to ${edgeInstruction}.`,
    `The hidden cost inside ${area}, ${name}, is ${cost}; put that cost into one action with a visible end.`,
    solveAreaLine(name, area, need, seed),
    areaCostLine(area, name, cost, seed),
    areaImperfectionLine(name, area, need, seed),
    `The practical work for ${name} is ${need} attached to one specific hour, reply, or task.`,
    `When ${area} gets noisy, ${name} needs ${need} before the next promise is made.`
  ];
  return pickLine(lines, seed, name, need, edge, area);
}

function dailyAreaLabel(area, seed = 0) {
  const lower = String(area || "").toLowerCase();
  if (lower.includes("money")) return "a money choice";
  if (lower.includes("relationship")) return "relationship timing";
  if (lower.includes("family")) return "family responsibility";
  if (lower.includes("health")) return "body rhythm";
  if (lower.includes("public") || lower.includes("ambition")) return "the visible work";
  if (lower.includes("creative") || lower.includes("visibility")) return "creative work";
  if (lower.includes("friendship") || lower.includes("belonging")) return "belonging pressure";
  if (lower.includes("sleep") || lower.includes("closure")) return "private closure";
  if (lower.includes("learning") || lower.includes("discipline")) return "scattered attention";
  if (lower.includes("home")) return "home rhythm";
  if (lower.includes("conversation")) return pickLine([
    "the repeated inner conversation",
    "the private conversation loop",
    "the thought that keeps reopening",
    "the recurring inner dialogue",
    "the conversation you keep having alone",
    "the unfinished inner sentence"
  ], seed, area);
  return pickLine([
    "the nearest duty",
    "the current choice",
    "today's practical pressure",
    "the request in front of you",
    "the visible obligation",
    "the decision in front of you",
    "the item that needs a deadline",
    "the next workable piece"
  ], seed, area);
}

function areaCostLine(area, name, cost, seed = 0) {
  return pickLine([
    `Under ${area}, ${name} is paying for ${cost}; put the cost where it can be seen.`,
    `Around ${area}, ${cost} is charging attention for ${name}; name the price before answering.`,
    areaCostPracticalLine(area, name, cost, seed),
    `The hidden price for ${name} is ${cost}; keep ${area} close to one checkable repair.`,
    `When ${area} starts carrying ${cost}, ${name} needs the cost on paper, not in the body.`
  ], seed, area, name, cost);
}

function areaCostPracticalLine(area, name, cost, seed = 0) {
  return pickLine([
    `${capitalize(area)} gets costly when ${cost} leads; ${name} needs the cost written before the next move.`,
    `${capitalize(area)} should not be priced by ${cost}; ${name} needs one written cost before answering.`,
    costBesideAreaLine(area, name, seed),
    `${name} can make ${area} less expensive by putting ${cost} into one line before acting.`,
    `${capitalize(area)} needs a practical price tag before ${cost} starts choosing the tone.`
  ], seed, area, name, cost);
}

function attentionCostNameLine(name, area, cost, seed = 0) {
  return pickLine([
    `${name} is losing too much attention to ${cost}; give ${area} one hour, one edge, and no extra trial.`,
    `The drain for ${name} is ${cost}; keep ${area} inside one timed choice.`,
    `Around ${area}, ${name} can interrupt ${cost} by naming one finish line before answering.`,
    `${name} does not need to carry ${cost} through the whole day; put ${area} inside one timed block.`,
    `${capitalize(area)} gets lighter for ${name} when ${cost} is answered with a time, not a debate.`,
    `${name} can interrupt ${cost} by making ${area} small enough to finish before the next meal.`
  ], seed, name, area, cost);
}

function actionLine(context, seed, salt = "") {
  const action = actionPhrase(context.decisionGate || context.mentorMove || context.stabilizer || "complete the nearest useful task", seed);
  const work = workPhrase(context.workSignal || "finish one practical detail", seed);
  const body = fragment(context.bodySignal || "let the body settle before choosing words");
  const bodyAction = bodyInfinitiveClause(body);
  const avoid = avoidPhrase(context.avoid || "over-explaining", seed);
  const window = timeBox(seed);
  const close = closingEvidence(context, seed);
  const lines = [
    `Set a ${window} block to ${action}, then close the page, tab, or note that keeps reopening.`,
    `Make the next task visible: ${work}, then ${action}.`,
    `Use the body rule before deciding: ${body}, with ${avoid} kept outside the decision.`,
    timedActionLine(action, window, seed),
    `Give the work a place by choosing to ${work}, while the extra possibilities stay unopened for now.`,
    actionBeforeMoodLine(action, seed),
    `Shrink the decision until it has today's size: ${action}.`,
    `Treat the body's vote as useful data by choosing to ${bodyAction}, then complete the nearest piece of work without dramatizing it.`,
    workAndCloseLine(work, close, seed),
    `Put the next action on the clock: ${action}.`,
    bodyLeadActionLine(body, seed),
    `Reduce the work to a visible movement: ${work}, and let the rest wait its turn.`
  ];
  return pickLine(lines, seed, salt, action, work, body, avoid, context.dailyArea, context.openingScene, context.coreNeed);
}

function timedActionLine(action, window, seed = 0) {
  const infinitive = actionInfinitive(action);
  const gerund = gerundPhrase(action);
  return pickLine([
    `Use the next ${window} block to ${infinitive}, then close it without asking for applause.`,
    `Let the ${window} timer keep ${gerund} from becoming a second debate.`,
    `Keep the block narrow: ${infinitive}, then stop at the first usable result.`,
    `The next ${window} block should make ${gerund} concrete enough to respect by evening.`,
    `Give ${gerund} a beginning, an ending, and no second debate in your head after the timer stops.`,
    `Set a ${window} block aside to ${infinitive}; the result only has to be usable, not impressive.`,
    `Make ${gerund} the whole assignment for a ${window} block, then leave the rest outside it.`,
    `A ${window} block is enough to ${infinitive} if it ends with something handled.`
  ], seed, action, window, infinitive, gerund);
}

function workAndCloseLine(work, close, seed = 0) {
  const gerund = gerundPhrase(work);
  return pickLine([
    `Move the work into the hands: ${work}, then stop when ${close} is visible.`,
    `Make the work visible through ${work}, and leave ${close} as the day's receipt.`,
    `Let ${work} happen before the mood asks for a better explanation.`,
    `Use the next block for ${work}; ${close} can answer the rest later.`,
    `Give ${gerund} a real surface, then stop once ${close} is handled.`,
    `${capitalize(gerund)} should leave ${close} visible before the thought starts arguing again.`
  ], seed, work, close, gerund);
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
    `The next answer gets cleaner after ${bodyPractice}, before ${avoid} starts naming the whole day.`,
    bodyBeforeInterpretationLine(bodyPractice, seed),
    bodyFirstConsiderationLine(avoid, seed),
    bodyInterpretationLine(bodyPractice, seed),
    bodyCareDecisionLine(seed, context),
    bodySequenceLine(bodyPractice, seed)
  ];
  return pickLine(lines, seed, salt, body, cue, weather, avoid, context.openingScene, context.dailyArea);
}

function areaImperfectionLine(name, area, need, seed = 0) {
  return pickLine([
    `${name} can leave ${area} unfinished long enough for ${need} to get a practical hour.`,
    `${name} does not need to perfect ${area}; ${need} needs a place on the day first.`,
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
    "Eat something simple before naming the problem; hunger is a poor translator.",
    "Drink water, unclench your jaw, and make the choice after the body stops rushing.",
    "Rest deserves a vote before the mind turns pressure into a verdict.",
    "A fed body can answer the day without making every delay personal.",
    "The next choice needs food, water, or rest handled before the mind starts cross-checking everything.",
    "A short walk or meal can make the useful answer easier to hear."
  ], seed, context.openingScene, context.dailyArea, context.bodySignal);
}

function relationLine(name, context, seed) {
  const relation = relationClause(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising", seed);
  const avoid = avoidPhrase(context.avoid || "over-explaining", seed);
  const lines = [
    `With other people, ${relation}; closeness still needs an hour the body can keep.`,
    conversationPullLine(seed, relation, avoid),
    relationPaceLine(seed, relation),
    nextExchangeLine(seed),
    `Respond from proportion: kind, brief, and clear enough that resentment has fewer places to gather.`,
    availabilityTimingLine(seed),
    timedAnswerLine(seed, name),
    "Answer only the part that will still feel fair after dinner.",
    `Let the relationship stay simple here: ${lowerFirst(relation)}, while everything else waits its turn.`,
    relationshipLimitLine(avoid, seed),
    bodySizedAccessLine(context, seed),
    kinderAnswerLine(seed)
  ];
  return pickLine(lines, seed, name, relation, avoid, context.dailyArea);
}

function bodySizedAccessLine(context, seed = 0) {
  const area = dailyAreaLabel(context.dailyArea, seed);
  const body = compactBodyAnchor(context.bodySignal);
  return pickLine([
    `Let access match ${body} today, especially where ${area} is asking for too much proof.`,
    `Offer the time your body can keep, then let ${area} stop borrowing from tomorrow.`,
    `A warmer answer works better after ${body} has been handled and the available hour is clear.`,
    `Let the next yes fit the body you actually have today, not the guilt around ${area}.`,
    `Keep care present, but offer only the time ${body} can afford.`,
    `Name the hour before offering the heart; ${area} needs shape more than sacrifice.`
  ], seed, area, body, context.relationalCaution, context.relationshipMirror);
}

function relationPaceLine(seed = 0, relation = "") {
  const lowerRelation = lowerFirst(relation);
  return pickLine([
    "In the next conversation, keep warmth present without surrendering the whole pace.",
    "Let the next exchange carry care with a limit you can actually keep.",
    "When the next conversation opens, answer the real request before the reply becomes a performance.",
    `Use timing in the next exchange; ${lowerRelation} does not need extra decoration.`,
    "The next conversation can stay kind when the reply names the request and leaves the rest alone.",
    "The next conversation can stay kind when the answer is brief enough to keep.",
    "The next conversation can stay kind when timing carries the part words cannot."
  ], seed, relation);
}

function timedAnswerLine(seed = 0, name = "") {
  return pickLine([
    `If someone needs an answer, let ${name || "the reply"} carry warmth with a time edge.`,
    `When a reply is needed, keep care present and make the timing unmistakable.`,
    `Give the next answer a warm tone and a clear clock, not extra availability.`,
    `Let the needed answer stay kind without becoming open-ended access.`,
    `Answer the real request and let timing hold the rest.`
  ], seed, name);
}

function relationCloseLine(context, seed, salt = "", preferredBucket = "") {
  const relation = relationClause(context.relationalCaution || context.relationshipMirror || "wait for behavior to confirm what words are promising", seed);
  const permission = fragment(context.closingPermission || "one small finish can be enough");
  const close = closingEvidence(context, seed);
  const relationInstruction = toPlainRelationInstruction(relation);
  const lines = [
    `Keep the next reply plain; ${relationInstruction}, then leave one finished detail behind you.`,
    `With other people, ${relation}; the day can still end with one dated detail finished.`,
    `Keep the answer simple enough to keep, and record ${close} without decoration.`,
    `When the exchange asks for more explanation, ${relation}, and leave with one fewer thing asking for bedtime attention.`,
    `${capitalize(permission)}; put a clock around care before it becomes performance.`,
    `A shorter answer and one closed task will help more than managing every reaction in the room.`,
    `Timed access will serve better than another performance.`,
    `Work closed and the reply shortened are enough to carry into evening.`
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, relation, permission, context.dailyArea);
}

function toPlainRelationInstruction(relation = "") {
  const normalized = lowerFirst(relation);
  if (/^let\s+the\b/i.test(normalized)) {
    return normalized;
  }
  return normalized.replace(/^let\s+/i, "");
}

function bodyTimingLine(body, seed = 0) {
  const anchor = compactBodyAnchor(body);
  return pickLine([
    bodyHandledTimingLine(anchor, seed),
    `The next choice lands cleaner after ${anchor} is treated as real information.`,
    `${capitalize(anchor)} belongs early in the choice; pressure should not get the first microphone.`,
    `The decision gets less dramatic when ${anchor} is cared for first.`,
    `A practical body cue around ${anchor} can make the next answer easier to keep.`
  ], seed, body, anchor);
}

function bodyHandledTimingLine(anchor, seed = 0) {
  return pickLine([
    `${capitalize(anchor)} should be answered before the story grows around the choice.`,
    `The next choice gets better timing when ${anchor} is not postponed.`,
    `Once ${anchor} is handled, the decision has fewer false alarms in it.`,
    `${capitalize(anchor)} belongs before the first interpretation, not after it.`,
    `The answer changes when ${anchor} gets care before the pressure gets language.`
  ], seed, anchor);
}

function costBesideAreaLine(area, name, seed = 0) {
  return pickLine([
    `${name} can write one cost beside ${area} before choosing the next move.`,
    `${name} can put one price next to ${area} and leave the rest out of the decision.`,
    `${name} can name what ${area} is costing, then answer only the next real move.`,
    `${name} can keep the price of ${area} on paper instead of letting it choose the tone.`,
    `${name} can mark the cost inside ${area} before the next answer leaves.`
  ], seed, area, name);
}

function relationshipTimingLine(seed = 0, area = "", avoid = "") {
  return pickLine([
    relationshipClockLine(seed + 5, area, avoid),
    relationshipWarmthTimingLine(seed, area, avoid),
    "With other people, closeness stays kinder when the hour and the limit are both visible.",
    "With other people, name the available hour before the reply widens.",
    "With other people, affection stays cleaner when access has an ending."
  ], seed, area, avoid);
}

function relationshipClockLine(seed = 0, area = "", avoid = "") {
  return pickLine([
    "With other people, set the hour before care turns into all-day access.",
    "With other people, name the clock before tenderness starts doing extra labor.",
    "With other people, let the reply carry one clear time instead of open availability.",
    "With other people, care stays kinder when the available window is spoken early.",
    "With other people, timing should hold the door before affection gets overworked."
  ], seed, area, avoid);
}

function relationshipWarmthTimingLine(seed = 0, area = "", avoid = "") {
  return pickLine([
    "With other people, warmth stays safer when the available hour is named first.",
    "With other people, care works better when access has a clear opening and close.",
    "With other people, tenderness should arrive with timing before resentment starts keeping score.",
    "With other people, the warmer answer is the one that still has an ending.",
    "With other people, availability needs a clock before affection starts paying the bill."
  ], seed, area, avoid);
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
    `${name} can make one clear place for ${need} instead of defending it all day.`
  ], seed, area, name, need);
}

function visibleChoiceLine(name, seed = 0) {
  return pickLine([
    `${name} protects the real need by giving the choice a marked end before the argument grows.`,
    `${name} can make the choice visible early, while the argument is still small.`,
    `The real need gets safer when one choice gives ${name} a timed task.`,
    `${name} protects the useful part by moving the choice out of the private debate.`,
    `A choice with an ending gives ${name} less to defend and more to complete.`
  ], seed, name);
}

function bodyInterpretationLine(bodyPractice, seed = 0) {
  return pickLine([
    `After ${bodyPractice}, the decision has more room to land.`,
    `Let ${bodyPractice} happen before the decision gets oversized.`,
    `The next answer gets easier to trust once ${bodyPractice} is no longer postponed.`,
    bodyPracticeRealityLine(bodyPractice, seed),
    `A decision made after ${bodyPractice} is less likely to borrow urgency.`
  ], seed, bodyPractice);
}

function bodyPracticeRealityLine(bodyPractice, seed = 0) {
  return pickLine([
    `${capitalize(bodyPractice)} gives the mind fewer reasons to invent a crisis.`,
    `${capitalize(bodyPractice)} removes one false alarm from the decision.`,
    `${capitalize(bodyPractice)} gives the next answer a real condition to answer from.`,
    `${capitalize(bodyPractice)} makes the pressure answer the body, not only the story.`,
    `${capitalize(bodyPractice)} gives the day a physical fact before the argument resumes.`
  ], seed, bodyPractice);
}

function bodyBeforeInterpretationLine(bodyPractice, seed = 0) {
  const lines = [
    `${capitalize(bodyPractice)} belongs before the first interpretation gets dramatic.`,
    `After ${bodyPractice}, the next answer has a slower spine.`,
    `${capitalize(bodyPractice)} leaves less pressure for the next yes or no.`,
    `The first reaction gets quieter after ${bodyPractice}.`,
    `A less rushed answer becomes available after ${bodyPractice}.`,
    `The choice returns to human size after ${bodyPractice}.`,
    `After ${bodyPractice}, the reply does not need to arrive armed.`,
    `${capitalize(bodyPractice)} removes one false instruction from the day.`,
    `The pressure loses its shortcut after ${bodyPractice}.`,
    `A practical pause appears after ${bodyPractice}.`
  ];
  return lines[mod(stableHash(`${seed}|${bodyPractice}`), lines.length)];
}

function relationshipLimitLine(avoid, seed = 0) {
  return pickLine([
    `When ${avoid} starts steering, answer only the piece that has a time and a real request.`,
    `If ${avoid} reaches for the wheel, ${relationshipLimitAction(seed)}.`,
    `Let ${avoid} lose authority by naming when you are available and what is actually being asked.`,
    `Where ${avoid} gets loud, make the answer smaller: one time, one limit, no extra defense.`,
    `Once ${avoid} tries to manage the room, keep the reply brief and survivable.`,
    `Give ${avoid} a smaller role by answering the request instead of the atmosphere around it.`
  ], seed, avoid);
}

function availabilityTimingLine(seed = 0) {
  return pickLine([
    "Care can stay warm without becoming open access.",
    "Kindness gets easier to keep when the hour is named first.",
    "A clear hour will protect the warmth better than an open-ended yes.",
    "The next yes should come with a time, not a quiet debt.",
    "A named hour keeps care warm without leaving you endlessly reachable.",
    "The answer can be caring without staying endlessly reachable."
  ], seed);
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
    `${scene} can return the day to the next task with a real ending.`,
    `${scene} turns useful when it points to one action instead of another interpretation.`,
    `${scene} gives the pressure a handle if you let it stay ordinary.`,
    `${scene} is enough of a starting point; make it practical before it becomes symbolic.`,
    `${scene} moves the day toward a timed action instead of another private case.`
  ], seed, scene);
}

function sceneExplanationLine(scene, seed = 0) {
  return pickLine([
    `${scene} shows where explanation has stopped doing useful work.`,
    `${scene} points to the place where fewer words would help more.`,
    `${scene} makes the pressure easier to handle when it stays practical.`,
    `${scene} belongs to the moment where the hands need a real task.`,
    `${scene} names the spot where the day wants a smaller answer.`
  ], seed, scene);
}

function subjectVerdictLine(subject, seed = 0) {
  return pickLine([
    `${subject} is carrying less weight than the story gathering around it.`,
    `Give ${lowerFirst(subject)} one practical repair before the mind turns it into judgment.`,
    `${subject} is smaller than the meaning the mind keeps adding to it.`,
    `${subject} needs one ordinary use, not a larger case against the day.`,
    `${subject} should become something you use before the mind makes a case from it.`
  ], seed, subject);
}

function subjectPhysicalActionLine(subject, seed = 0) {
  const lowerSubject = lowerFirst(subject);
  return pickLine([
    `${subject} loses force once the next action has a clear finish point.`,
    `A visible move keeps ${lowerSubject} from growing.`,
    `${subject} softens when the practical step can be touched, sent, finished, or cleared.`,
    `The next action takes authority away from ${lowerSubject}.`,
    `${subject} stops growing when the next move is made physical.`
  ], seed, subject, lowerSubject);
}

function sharperWorkLine(name, edgeInstruction, seed = 0) {
  return pickLine([
    `The harder discipline for ${name} is to ${edgeInstruction} before the moment starts collecting extra meaning.`,
    `${name}'s harder task is to ${edgeInstruction} while the next move can still be measured.`,
    `For ${name}, the useful discipline is to ${edgeInstruction} before pressure starts rewriting the scene.`,
    pressureLoweringLine(name, edgeInstruction, seed),
    `The private work for ${name} is to ${edgeInstruction}; keep the moment from becoming a trial.`
  ], seed, name, edgeInstruction);
}

function pressureLoweringLine(name, edgeInstruction, seed = 0) {
  const gerund = gerundPhrase(edgeInstruction);
  return pickLine([
    `${name} can reduce the day's pressure by turning ${gerund} into one scheduled move.`,
    `${name} needs this move out of the private debate and inside one calendar block.`,
    `${name} can make ${gerund} practical before the scene starts asking for proof.`,
    `${name} gets better timing when ${gerund} becomes an action, not a mood.`,
    `${name} can stop spending energy on ${gerund} once one checkable repair is chosen.`
  ], seed, name, edgeInstruction, gerund);
}

function timedNameActionLine(name, edgeInstruction, seed = 0) {
  const gerund = gerundPhrase(edgeInstruction);
  return pickLine([
    `The urge to ${edgeInstruction}, ${name}, needs a timer more than another inner argument.`,
    `${name} can put ${gerund} into the next available block before the mind reopens the debate.`,
    `For ${name}, ${gerund} works better as a scheduled move than as another debate held alone.`,
    `The answer gets clearer for ${name} when the urge to ${edgeInstruction} has a time limit, not another debate held alone.`,
    `${name} can put ${gerund} into one dated block before the story gets a vote.`
  ], seed, name, edgeInstruction, gerund);
}

function delayHandledLine(area, name, seed = 0) {
  return pickLine([
    `Let the delay inside ${area} stay inside one timed answer for ${name}.`,
    `${name} can meet the delay around ${area} without letting it become a personal verdict.`,
    `The delay inside ${area} needs a response from ${name}, not a scorecard for the day.`,
    `A slower turn around ${area} does not get to measure the whole day for ${name}.`,
    `${name} can answer the delay in ${area} with one practical move instead of a debate no one else can see.`
  ], seed, area, name);
}

function containerAskLine(area, name, seed = 0) {
  return pickLine([
    `${name} can give ${area} shape; let ${area} move before mood approval.`,
    `${capitalize(area)} is asking ${name} for shape, not a flawless inner state.`,
    `The useful request around ${area}, ${name}, is structure rather than a perfect mood.`,
    `${name} can give ${area} a container without proving readiness first.`,
    `Around ${area}, the work for ${name} is a container someone can actually see.`
  ], seed, area, name);
}

function solveAreaLine(name, area, need, seed = 0) {
  return pickLine([
    `${name} does not have to solve ${area} by feeling ready; ${need} only needs a usable hour.`,
    `${capitalize(area)} needs a time and place from ${name}, not a mood that feels complete.`,
    `${name} can give ${area} one practical holder while ${need} catches up.`,
    `Feeling ready is not required here; ${name} can give ${area} a time, place, and edge.`,
    `${name} can stop solving ${area} internally and give the need for ${need} one visible slot.`
  ], seed, name, area, need);
}

function actionBeforeMoodLine(action, seed = 0) {
  return pickLine([
    `Before the day scatters, ${action}; let the finished piece explain the mood later.`,
    `Before attention splinters, ${action}; let the inner weather respond to evidence.`,
    `Before attention looks for ten exits, ${action}; give the hour something finished to hold.`,
    `Before the feeling asks for the final word, ${action}; make the practical part visible.`,
    `Before the question turns into a verdict, ${action}; leave one practical result on the table first.`,
    `Before the story expands, ${action}; give the next hour proof it can hold.`,
    `Before the mind reopens the case, ${action}; end the block before the debate returns.`
  ], seed, action);
}

function bodySequenceLine(bodyPractice, seed = 0) {
  return pickLine([
    `${capitalize(bodyPractice)} changes the timing before the decision gets oversized.`,
    `${capitalize(bodyPractice)} helps the next move arrive from care instead of pressure.`,
    `${capitalize(bodyPractice)} makes the decision easier to keep after the mood passes.`,
    `${capitalize(bodyPractice)} gives the next answer a body that is no longer bracing.`,
    `${capitalize(bodyPractice)} lets the next choice come from a body that is no longer hurrying.`,
    `${capitalize(bodyPractice)} keeps the decision from borrowing urgency it has not earned.`,
    `Let ${bodyPractice} happen before the reply borrows panic.`,
    `${capitalize(bodyPractice)} gives the next reply a less braced starting point.`,
    `${capitalize(bodyPractice)} gives the mind fewer false signals to defend.`
  ], seed, bodyPractice);
}

function bodyFirstConsiderationLine(avoid, seed = 0) {
  const subject = avoidPatternSubject(avoid);
  return pickLine([
    `Let the body set the order; ${avoid} can make the day sound larger than it is.`,
    `Give the body an early vote before ${avoid} starts enlarging the problem.`,
    `The practical body cue matters because ${avoid} can turn a small moment into weather.`,
    `Care for the body early so ${avoid} has less room to narrate the day.`,
    `The body deserves a concrete fact before ${subject} starts narrating the day.`
  ], seed, avoid, subject);
}

function bodyLeadActionLine(body, seed = 0) {
  return pickLine([
    `Let the body lead the timing through this move: ${body}, then choose the practical part with less noise.`,
    `Use the first body cue as the clock: ${body}, then handle only the piece that is actually ready.`,
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
    `${subject} keeps returning because the practical repair has not been given a slot.`,
    `${subject} is back because attention needs somewhere smaller to land.`,
    `${subject} keeps showing up where a decision has not been given a start time.`,
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
    "A reply that does not create a hidden bill is easier to keep warm.",
    "The useful answer protects care without making you pay for it afterward."
  ], seed);
}

function conversationExplanationLine(seed = 0, relation = "", avoid = "") {
  const pressure = compactAvoid(avoid || relation, seed);
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
    "Close the repeated question before it asks for another rehearsal.",
    "Stop the loop while the answer is still plain enough to keep.",
    "Leave the repeated question closed once the practical piece is done.",
    "Close the return loop before the mind asks for fresh evidence."
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
    `${capitalize(close)} can carry more of the evening than another polished explanation.`
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
    "A kept promise reduces the mind's demand for perfect wording.",
    "A completed promise can earn trust before the mood agrees with it.",
    "You can let the completed promise matter more than the perfect explanation.",
    "A promise kept quietly can settle the room before another explanation arrives."
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

function actionInfinitive(text) {
  const value = lowerFirst(fragment(text));
  if (!value) return "finish one useful task";
  if (/^do not\b/i.test(value)) return value.replace(/^do not\b/i, "avoid");
  if (/^(send|do|pay|let|take|make|finish|decline|name|put|repair|wait|answer|choose|protect|turn|remove|give|pause|close|complete|document|separate|simplify|use)\b/.test(value)) {
    return value;
  }
  return `handle ${value}`;
}

function gerundPhrase(text) {
  const value = lowerFirst(fragment(text));
  if (!value) return "finishing one useful task";
  const replacements = [
    [/^do not negotiate\b/i, "not negotiating"],
    [/^do\b/i, "doing"],
    [/^send\b/i, "sending"],
    [/^pay\b/i, "paying"],
    [/^let\b/i, "letting"],
    [/^take\b/i, "taking"],
    [/^make\b/i, "making"],
    [/^finish\b/i, "finishing"],
    [/^decline\b/i, "declining"],
    [/^name\b/i, "naming"],
    [/^put\b/i, "putting"],
    [/^repair\b/i, "repairing"],
    [/^wait\b/i, "waiting"],
    [/^answer\b/i, "answering"],
    [/^choose\b/i, "choosing"],
    [/^protect\b/i, "protecting"],
    [/^turn\b/i, "turning"],
    [/^remove\b/i, "removing"],
    [/^give\b/i, "giving"],
    [/^pause\b/i, "pausing"],
    [/^close\b/i, "closing"],
    [/^complete\b/i, "completing"],
    [/^document\b/i, "documenting"],
    [/^separate\b/i, "separating"],
    [/^use\b/i, "using"],
    [/^stop\b/i, "stopping"],
    [/^leave\b/i, "leaving"],
    [/^notice\b/i, "noticing"]
  ];
  const match = replacements.find(([pattern]) => pattern.test(value));
  if (match) return value.replace(match[0], match[1]);
  return value;
}

function bodyPracticeClause(text, seed = 0) {
  const value = fragment(text);
  if (!value) return "letting the body settle before choosing words";
  if (/^eat before the difficult conversation\b/i.test(value)) {
    return pickLine([
      "eating before the hard conversation",
      "putting food before the difficult exchange",
      "letting a meal come before the hard words",
      "feeding the body before the conversation",
      "answering hunger before the difficult talk",
      "making food the first preparation for the conversation"
    ], seed, value);
  }
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
      "keep closeness tied to timing instead of constant availability"
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
      "one marked hour",
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
      "the place where the same thought keeps returning",
      "the room detail that keeps pulling attention",
      "the repeated worry asking for a practical close"
    ];
  }
  if (raw.includes("shoes") || raw.includes("door")) {
    return [
      "the shoes by the door",
      "a door half-closed",
      "a necessary errand near the door"
    ];
  }
  if (raw.includes("desk") || raw.includes("workspace")) {
    return [
      "the work surface edge",
      "the one item left on the desk",
      "the workspace before a bigger plan"
    ];
  }
  if (raw.includes("meal")) {
    return [
      "breakfast waiting for a real pause",
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
      "the quiet room after the unsent sentence"
    ];
  }
  if (raw.includes("laundry") || raw.includes("drawer")) {
    return [
      "the open drawer beside folded laundry",
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
    "A closed loop can hold the place of certainty until tomorrow.",
    eveningEvidenceLine(close, seed),
    `The useful evidence today is ${close}, not a fresh argument wearing better words.`,
    closingPermissionLine(context.closingPermission, seed),
    rehearsalCloseLine(close, seed),
    bodyBelievesClosingLine(seed),
    "Leave the day with one fewer thing asking for bedtime attention.",
    plainWorkableClosingLine(seed),
    smallRepairClosingLine(seed),
    keptPromiseTrustLine(seed),
    participationCloseLine(seed),
    "Let the finish be modest; the nervous system believes repetition more than intensity.",
    concreteEvidenceClosingLine(seed),
    repeatedLoopClosingLine(seed),
    plainWorkClosingLine(seed, close),
    keptPromiseClosingLine(seed)
  ];
  return pickLine(linesForBucket(lines, preferredBucket), seed, salt, context.dailyArea, context.closingPermission, context.innerWeather, context.personalEdge);
}

function participationCloseLine(seed = 0) {
  return pickLine([
    "One handled detail puts your effort back into the room.",
    "A checked box, cleared corner, or sent line can prove participation without drama.",
    "The day reads differently after one finish you can point to.",
    "A handled detail gives the evening something better than another explanation.",
    "Let one completed piece show that you stayed with the day."
  ], seed);
}

function eveningEvidenceLine(close, seed = 0) {
  return pickLine([
    `By evening, put ${close} in the record before the mind asks for a late review.`,
    `When the day closes, ${close} deserves a place in the evidence.`,
    `Before night, let ${close} be the answer you actually respect.`,
    eveningQuestionLine(close, seed),
    `With ${close} handled, the day has earned a quieter ending.`,
    `When pressure returns later, point it toward ${close} and keep moving.`
  ], seed, close);
}

function eveningQuestionLine(close, seed = 0) {
  return pickLine([
    `After ${close}, leave the next question for a better-rested hour.`,
    `After ${close}, do not reopen the part that belongs to a later day.`,
    `After ${close}, let the room stay finished instead of starting a new trial.`,
    daylightReviewLine(close, seed),
    `After ${close}, keep the evening narrow enough to recover.`,
    `After ${close}, let unfinished meaning wait without managing the room.`
  ], seed, close);
}

function daylightReviewLine(close, seed = 0) {
  return pickLine([
    `After ${close}, let tomorrow handle the unfinished question.`,
    `After ${close}, keep the pillow free from another review.`,
    `After ${close}, leave the remaining review for morning light.`,
    `After ${close}, stop before the bed becomes a second desk.`,
    `After ${close}, let rest have the last word tonight.`
  ], seed, close);
}

function rehearsalCloseLine(close, seed = 0) {
  return pickLine([
    `Once ${close} is handled, stop giving the loop a fresh audience.`,
    `With ${close} done, the next rehearsal can lose its invitation.`,
    `Let ${close} end the repeat cycle for tonight.`,
    `After ${close}, the mind does not need another practice argument.`,
    `Keep ${close} as the final receipt, not the start of another review.`
  ], seed, close);
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

function isUsableLocalWisdom(text, name, constraints) {
  const wordCount = words(text).length;
  return wordCount >= 72
    && wordCount <= 98
    && matchesArchitectureConstraints(text, name, constraints)
    && !isLowQualityWisdom(text)
    && getSoulWisdomSpecificityIssues(text).length === 0
    && !hasInternalSentenceFamilyRepeat(text)
    && !hasAwkwardLocalPattern(text);
}

function hasInternalSentenceFamilyRepeat(text) {
  const seen = new Set();
  for (const sentence of splitSentences(text)) {
    const family = sentenceFamily(sentence);
    if (!family) continue;
    if (seen.has(family)) return true;
    seen.add(family);
  }
  return false;
}

function sentenceFamily(sentence) {
  const normalized = String(sentence || "")
    .toLowerCase()
    .replace(/\b\d+\s*-?\s*minute\b/g, "timed")
    .replace(/\b[0-9]+\b/g, "number")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  if (normalized.includes("finished timed task")) return "timed-task-finish";
  if (normalized.includes("next conversation") || normalized.includes("next exchange")) return "conversation-next";
  if (normalized.includes("body") && normalized.includes("before")) return "body-before";
  if (normalized.includes("reply") && (normalized.includes("short") || normalized.includes("brief"))) return "short-reply";
  if (normalized.includes("a kept limit gives")) return "kept-limit-gives";
  const stop = new Set(["the", "and", "that", "this", "with", "your", "you", "before", "after", "when", "where", "needs", "need", "gets", "give", "make", "keep", "let", "one", "next", "today", "can"]);
  return normalized
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stop.has(word))
    .slice(0, 4)
    .join(" ");
}

function hasAwkwardLocalPattern(text) {
  return [
    /\bbefore\b[^.!?]{0,24}\bbefore\b/i,
    /\bthe day becomes more useful when\b/i,
    /\bthis part of life\b[^.!?]{0,80}\bthis part of life\b/i,
    /\bwith a visible next use\b/i,
    /\bmore useful when\b[^.!?]{0,80}\bbefore any final interpretation\b/i,
    /\bhandle simplify\b/i,
    /\bprotect [^.!?]{0,60} belongs before\b/i,
    /\bcan give room to\b/i,
    /\bneeds to protect [^.!?]{0,80} yourself\b/i,
    /\bfolded laundry and an open drawer belongs\b/i,
    /\ba kept limit gives\b[^.!?]+\ba kept limit gives\b/i,
    /\bthe choice stops borrowing urgency after\b/i
  ].some((pattern) => pattern.test(String(text || "")));
}

function matchesArchitectureConstraints(text, name, constraints) {
  const sentences = splitSentences(text);
  if (constraints.sentenceCount && sentences.length !== constraints.sentenceCount) return false;
  if (constraints.nameSentence) {
    if (countWord(text, name) !== 1) return false;
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
  return cleanWisdomText(text, text, SOUL_WISDOM_MAX_WORDS);
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

function pickDivine(lines, seed = 0, ...parts) {
  return lines[mod(Number(seed || 0) + stableHash(parts.filter(Boolean).join("|")), lines.length)];
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
