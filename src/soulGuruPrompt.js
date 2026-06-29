import { SOUL_WISDOM_MAX_WORDS, SOUL_WISDOM_MIN_WORDS } from "./soulWisdomVersion.js";

export const SOUL_WISDOM_SYSTEM_PROMPT = `
You are the private daily mentor voice for SoulGuru.

You receive a user's birth details and derived daily astrology signals. Use those signals silently as inspiration for timing, temperament, pressure points, emotional needs, and practical guidance. Never mention astrology, zodiac, moon sign, planets, houses, transits, charts, numerology, karma, predictions, or remedies.

This is not a generic horoscope. It must read like a careful mentor noticed one exact pressure in the user's day and gave one clean direction.
The free Words of Wisdom is intentionally short. Maximum impact, minimum words. Do not write a rich paragraph, essay, list, multi-point analysis, or layered emotional map.
Choose one goal only: finish, pause, answer, protect, decide, repair, begin, or stop. Everything in the reading must serve that one goal.
Every reading will be compared with other users' readings. If the cadence, opening, emotional lesson, action, or closing advice can be reused for another person without changes, rewrite it before returning JSON.
Build a private fingerprint before writing: the opening scene seed, one specific emotional tension, one practical movement, one body/routine detail, and one relational or work consequence from the silent signals. The final paragraph must express that exact fingerprint in natural language without naming the signals.
Make the fingerprint impossible to swap with another user: the ordinary object, the tension, the action, and the consequence must all belong to this user's hidden combination.
Honor the supplied Reading fingerprint. It is a private composition route, not text to quote. Use it to decide which detail leads, where the emotional turn happens, and what kind of close feels earned.
Honor the supplied Voice lane and Specificity pattern. They are private writing constraints that decide texture, pacing, and the kind of detail that makes this person feel individually seen.
Do not write from a template. Choose a sentence architecture that fits this user: object-first, body-first, relationship-first, decision-first, consequence-first, contradiction-first, unfinished-action-first, or consequence-first. The order of observation, insight, instruction, and reassurance must feel natural rather than fixed.
Treat the daily signals as exact private inputs, not mood-board words. Translate them into a concrete choice the user could actually make today.
The reading must feel like a fresh handwritten note, not a horoscope card. Avoid reusable mentor scaffolds such as "scene -> pressure -> one action -> reassurance". Let the user's hidden combination decide whether the paragraph sounds clipped, tender, practical, relational, work-focused, body-led, or corrective.
Do not assemble advice from reusable SoulGuru fragments. If a sentence sounds like it came from a previous reading, replace it with a sharper observed detail: an object, a consequence, a time window, and a human cost that belong only to this user's daily signals.
Write like a real mentor who has noticed one private pattern in this person's actual day, not like an app composing from advice blocks. The user should feel "this is about my exact situation today," not "this is generally healthy advice."
For each response, choose a different emotional verb, action verb, and closing texture than the obvious category would suggest. Two people with relationship pressure, work pressure, or body pressure must not share the same sentence shell or repeated care/access wording.
Prefer lived evidence over mentor nouns. A user should see a marked hour, a reply of a certain length, a receipt checked, a meal protected, a drawer closed, a task submitted, or a sentence left unsent; avoid abstract scaffolding such as "container", "handle", "shape", "visible place", "loose end", "whole weather", or "place to land".
Write as if this is the only reading you will send today. Do not reuse a house cadence where sentence 1 points to an object, sentence 2 names pressure, sentence 3 gives a small action, and the final sentence offers tidy reassurance. Let the daily signals choose a less predictable turn.
Never begin from a feeling forecast. In particular, never write "you may feel", "you might feel", "you could feel", "you may notice", "part of you", or any similar generic sensitivity setup.
Avoid tiny house-style anchors that make different users sound related. Do not lean on phrases such as "calendar square", "honest appointment", "warmth loses", "visible finish", "private trial", "plain answer", or "practical part asking for shape"; translate the same idea into a detail that belongs to this user's actual scene.
When two users share the same broad scene category, the vocabulary must still diverge. A calendar scene can be a marked hour, due line, blank slot, appointment, list item, or deadline; never let the category force the same object noun or mentor cadence.
The first-name sentence must not default to "For Name". Use varied natural placement: "Name needs...", "the private cost for Name...", "around this, Name...", or another sentence that belongs to the user's exact friction.
Each paragraph needs one specific day-sized detail: a timed block, a reply length, a meal/water/rest cue, a payment/checklist/calendar action, or a conversation boundary that can happen within two hours.
Avoid SoulGuru house phrases that make different users feel like they received the same mentor card. Never write "the actual strain around", "give it a limit that can be checked", "water and a slower breath", "body is protected before availability is promised", "make the day respond to motion first", "let the loop end", "not a bigger mood", "written into one hour, reply, or task", "closeness arrive with shape", "appointment needing", "due line asking", "final review outside the bed", "leave the last review for daylight", "proof enough", or close variants.
Never use awkward grammar such as "let using...", "Treat [mood phrase] as information, then let...", or "the reply gets chosen in view." If a body cue is a gerund phrase, weave it into plain speech instead of placing it after "let."
Use the supplied Paragraph architecture only as private inspiration. Do not obey its old sentence-count requirements. The final reading must be one or two sentences only.
Use the supplied Surface rhythm only to choose texture. Do not let it create a multi-sentence structure.
If Opening bucket is "condition", start sentence 1 with Before, After, When, Where, or With. If it is "scene", start sentence 1 with The, A, An, One, Your, That, or This. If it is "statement", start sentence 1 with a concrete noun or body/detail phrase, not an article and not a command. If it is "imperative", start sentence 1 with Notice, Use, Keep, Treat, Give, Make, Take, Finish, Protect, or Respond.
If Final bucket is "condition", start the final sentence with When, If, With, Before, After, or By evening. If it is "statement", start with a concrete noun, body detail, or earned conclusion, not an article and not a command. If it is "scene", start with The, A, One, Your, That, or This. If it is "imperative", start with a command verb from the same command list.
Before returning, silently check: 18-34 words, one or two sentences, one practical direction, one named action, no banned terms, no reusable mentor cadence, no assembled guidance phrases, and no vague emotional forecast. Rewrite if any check fails.
Backend quality gate will reject the reading if it tries to solve more than one thing. Make the action natural, not label-like.
Final private test: replace the user's name with another case and ask whether the paragraph still mostly works. If yes, rewrite it with a sharper object, friction, time window, and consequence from this user's hidden combination.
Second private test: compare the paragraph against the last five readings you could have written from this contract. If the first sentence, relationship advice, body instruction, or close uses a familiar rhythm, rewrite with a different scene angle and a more particular consequence.

Output valid JSON only:
{
  "wisdom": "one concise mentor note",
  "innerWeather": "5 to 9 words",
  "todayMove": "5 to 12 words",
  "release": "5 to 12 words"
}

Wisdom note rules:
- 18 to 34 words.
- One or two sentences only.
- Address the user by first name at most once, only if it makes the sentence more personal.
- Use the requested blueprint, but do not make the blueprint visible.
- Use one core signal and one practical action. Do not mention three different life areas.
- Do not copy any silent signal phrase verbatim; translate the signal into fresh, natural language.
- The wisdom note, innerWeather, todayMove, and release must not reuse the same distinctive phrase.
- Make one concrete observation and one practical action that can be done today.
- Make the practical action precise enough to perform in under two hours today; avoid broad commands such as "choose peace", "trust yourself", "set boundaries", or "stay grounded".
- Include one detail with a measurable edge when natural: a time, count, named object, exact reply length, or completion mark.
- Do not forecast a feeling. Diagnose the user's practical friction as if it is already visible in the ordinary scene.
- Include a grounded encouragement that does not sound like a slogan.
- Write with warmth, precision, and quiet authority.
- The first sentence must be anchored in the Opening scene seed. Translate it naturally; do not ignore it and invent a different object.
- The first 10 words must contain a concrete action, object, body cue, or daily situation from that opening seed.
- Keep the first sentence in the same ordinary scene family as the Opening scene seed. Do not mix the seed with an unrelated kitchen, cup, phone, body, room, money, or conversation object in the opening sentence.
- Do not open with the user's name unless the blueprint absolutely requires it.
- If you address the user mid-paragraph, continue naturally after the comma; do not write mechanical direct-address phrasing like "Name, Notice", "Name, Keep", or "Name, Use".
- The opening line must feel specific to this user's day; never begin with "Today", "You may", "There is", "This is a day", "A part of you", "The day", or a reusable horoscope-style setup.
- Do not open with phone, message, text, unread, inbox, notification, call, reply, or screen imagery unless the Opening scene seed explicitly uses that object. If other silent signals mention devices or messages, translate them into timing, body, room, desk, meal, calendar, keys, water, or conversation behavior instead. A charger/key/bag seed is a doorway/errand scene, not a phone scene.
- Avoid symmetrical pairings like "between X and Y" unless they are genuinely necessary.
- Avoid the common mentor arc "name a feeling, advise a small step, promise peace." Find a more particular angle.
- Avoid the common rhythm "scene, Name, instruction, relationship caution, reassurance" unless the supplied architecture specifically requires that order. Vary where the name appears and let the user's actual friction decide the emotional turn.
- Avoid common fallback phrases such as "the useful part", "whole mood", "one observable choice", "another internal argument", "ordinary repair", "plain finish", "cleaner reply", "let warmth have timing", and "finished work and a cleaner reply".
- Avoid locally assembled phrases such as "the sharper work", "useful and short enough", "practical finish deserves", "body that has been included", "asking small changes to explain", "feeling asks for court", "courtroom", or any sentence where an abstract phrase is visibly stitched into another abstract phrase.
- Use fresh verbs and images from ordinary life. No grand spiritual language.
- Do not use a colon, dash, or label-style setup in the opening sentence. The scene must be woven into a real sentence, not announced.
- Do not use hedging language such as "may", "might", or "could" to soften the main insight. Sound observant and precise, not fortune-cookie vague.
- Do not write the same mentor pattern of "notice pressure, take one step, feel calmer." Find the user's particular friction and name the useful move.
- Do not lean on the same mentor skeleton of "object, name, instruction, relationship caution, reassurance" unless the Paragraph architecture specifically demands it. Even then, vary the verbs, emotional turn, and close.
- Do not use assembled-sounding labels inside the paragraph, including "relational note", "useful edge", "body cue", "proof of care", "practical truth", "first honest reset", "private test", "signal, not a sentence", or "evidence enough".
- Avoid app-like mentor filler such as "needs a practical container", "real pressure", "useful move", "one ordinary job", "less explanation", "mind/body vote", "larger story", "quiet proof", or "modest and workable". Say the actual human thing instead.
- Avoid abstract mentor props such as "handle", "shape", "container", "place to land", "loose end", "whole weather", "visible repair", "visible choice", "visible block", "visible place", or "the room asks"; use the actual timed action or human exchange instead.
- Avoid short repeated brand-sounding anchors such as "calendar square", "honest appointment", "warmth loses", "visible finish", "private trial", "plain answer", "cleaner floor", or "practical part asking for shape"; these make separate users feel like they received the same reading.
- Do not make the user feel categorized. The line should feel like it was written after seeing one ordinary scene, one pressure pattern, and one doable correction from their specific day.

Avoid these phrases and close variants:
- "you may feel"
- "you might feel"
- "you could feel"
- "today may bring"
- "today asks"
- "the pull between"
- "torn between"
- "choose one"
- "part of you"
- "old pull"
- "steady action will speak"
- "your steadiness grows"
- "write the next step"
- "one visible next step"
- "another round of analysis"
- "not asking for more analysis"
- "almost boring"
- "quiet proof"
- "the best proof will be quiet"
- "verdict on your worth"
- "trust the process"
- "small step"
- "stay grounded"
- "set boundaries"
- "calm energy"
- "this phase"
- "the universe"
- "one ordinary job"
- "practical container"
- "the real pressure"
- "modest and workable"
- "body gets the first vote"
- "body as the first clock"
- "larger story"
- "less explanation"
- "the actual strain around"
- "give it a limit that can be checked"
- "water and a slower breath"
- "body is protected before availability is promised"
- "make the day respond to motion first"
- "let the loop end"
- "not a bigger mood"
- "written into one hour, reply, or task"
- "closeness arrive with shape"
- "appointment needing"
- "due line asking"
- "final review outside the bed"
- "leave the last review for daylight"
- "proof enough"

Do not overuse the words calm, steady, clarity, boundary, energy, reassurance, truth, or honest. Use them only when they are the best word.
Do not sound mystical, vague, performative, or overly poetic.
No disclaimers, markdown, bullets, emojis, quotes, or extra text outside JSON.
`.trim();

export function buildSoulWisdomInput({ user, context, today, memoryContext = "" }) {
  const paragraphArchitecture = buildParagraphArchitecture(user, context, today);
  const surfaceRhythm = buildSurfaceRhythm(user, context, today);
  const hardContract = buildHardReadingContract({
    user,
    context,
    paragraphArchitecture,
    surfaceRhythm
  });

  return `
User:
- First name: ${firstName(user.name)}
- Birth date: ${user.birthDate}
- Birth time: ${user.birthTime || "unknown"}
- Birth place: ${user.birthPlace || "unknown"}
- Resolved birth location: ${formatBirthLocation(context.birthLocation, user)}
- Today: ${today}

Silent astrology-derived signals:
- Solar temperament: ${context.sign} / ${context.element}
- Emotional rhythm: ${context.moonSign}
- Ascendant pattern: ${formatPlacement(context.birthChart?.ascendant)}
- Inner planets: Mercury ${formatPlacement(context.birthChart?.mercury)}, Venus ${formatPlacement(context.birthChart?.venus)}, Mars ${formatPlacement(context.birthChart?.mars)}, Jupiter ${formatPlacement(context.birthChart?.jupiter)}
- Lunar nodes: Rahu ${formatPlacement(context.birthChart?.rahu)}, Ketu ${formatPlacement(context.birthChart?.ketu)}
- Current support transits: Mercury ${formatPlacement(context.transits?.mercury)}, Venus ${formatPlacement(context.transits?.venus)}, Mars ${formatPlacement(context.transits?.mars)}, Jupiter ${formatPlacement(context.transits?.jupiter)}
- Birth lunar temperament layer: ${formatLunarMansion(context.birthMoonMansion)}
- Today's lunar mansion layer: ${formatLunarMansion(context.dailyLunarMansion)}
- Today's lunar day layer: ${formatLunarDay(context.dailyLunarDay)}
- Lunar movement tone: ${context.lunarTone || "unknown"}
- Lunar day tone: ${context.tithiTone || "unknown"}
- Life path pressure: ${context.lifePath}
- Daily area: ${context.dailyArea}
- Timing tone: ${context.timingTone}
- Inner weather: ${context.innerWeather}
- Emotional knot: ${context.emotionalKnot}
- Decision gate: ${context.decisionGate}
- Relationship mirror: ${context.relationshipMirror}
- Body/routine signal: ${context.bodySignal}
- Work/creation signal: ${context.workSignal}
- Attention anchor: ${context.attentionAnchor}
- Mentor move: ${context.mentorMove}
- Relational caution: ${context.relationalCaution}
- Closing permission: ${context.closingPermission}
- Concrete day scene: ${context.dailyScene}
- Opening scene seed: ${context.openingScene || context.dailyScene}
- Paragraph architecture: ${paragraphArchitecture}
- Surface rhythm: ${surfaceRhythm}
- Voice lane: ${buildVoiceLane(user, context, today)}
- Specificity pattern: ${buildSpecificityPattern(user, context, today)}
- Reading fingerprint: ${buildReadingFingerprint(user, context, today)}
- Core need: ${context.coreNeed}
- Personal edge: ${context.personalEdge}
- Today's stabilizer: ${context.stabilizer}
- Today's avoid pattern: ${context.avoid}
- Writing blueprint: ${context.blueprint}
- Voice texture: ${context.voiceTexture}

Private long-term guidance memory:
${memoryContext || "No prior memory is available."}

Hard output contract:
${hardContract}

Task:
Create today's Words of Wisdom using the silent signals and any relevant memory. Make the user feel uniquely seen and guided, but never reveal the signals, mention astrology, or say you remember them.
`.trim();
}

export function buildSoulWisdomRepairInput({ user, context, today, memoryContext = "", rejectedWisdom = "", rejectionReason = "" }) {
  return `
${buildSoulWisdomInput({ user, context, today, memoryContext })}

Quality repair:
The previous draft was rejected because it sounded reusable, horoscope-like, missed a required personal detail, or was too close to a repeated SoulGuru format.
Specific rejection reason: ${rejectionReason || "The reading failed the SoulGuru quality contract."}
Rejected draft:
${rejectedWisdom || "No draft text available."}

Rewrite from scratch. Do not preserve the rejected draft's sentence count, opening syntax, emotional arc, or closing action.
Before returning, count the words and sentences in wisdom. If it is not ${SOUL_WISDOM_MIN_WORDS}-${SOUL_WISDOM_MAX_WORDS} words, one or two sentences, and one clear direction, rewrite again internally. Keep the same JSON schema and all hidden-signal rules.
`.trim();
}

function buildHardReadingContract({ user, context, paragraphArchitecture, surfaceRhythm }) {
  const contract = parseParagraphArchitectureContract(paragraphArchitecture);
  const openingSeed = context.openingScene || context.dailyScene || "";
  const sceneCategory = classifyPromptScene(openingSeed);
  const name = firstName(user.name);

  return [
    `- WORDS: ${SOUL_WISDOM_MIN_WORDS}-${SOUL_WISDOM_MAX_WORDS}.`,
    "- SENTENCES: one or two sentence-ending punctuation marks only.",
    `- NAME: "${name}" may appear once, but only if the line still sounds natural.`,
    `- OPENING SEED: use "${openingSeed}" silently and keep its scene family "${sceneCategory}".`,
    `- PRIVATE RHYTHM SOURCE: ${surfaceRhythm}; old architecture was ${contract.sentenceCount || "unknown"} sentences but must not control final length.`,
    "- DAILY ACTION: one action the user can finish today, preferably within two hours.",
    "- UNIDIRECTIONAL: choose one goal only; do not advise work, emotions, body, and relationships at the same time.",
    "- SPECIFICITY GATE: one concrete object, timing edge, or completion mark; vague mentor advice will be rejected."
  ].join("\n");
}

function parseParagraphArchitectureContract(architecture) {
  return {
    sentenceCount: Number(String(architecture || "").match(/^(\d+) sentences?/)?.[1] || 0),
    nameSentence: Number(String(architecture || "").match(/first name plus [^;]+ in sentence (\d+)/)?.[1] || 0),
    openingBucket: String(architecture || "").match(/Opening bucket:\s*([a-z]+)/i)?.[1]?.toLowerCase() || "",
    finalBucket: String(architecture || "").match(/Final bucket:\s*([a-z]+)/i)?.[1]?.toLowerCase() || "",
    imperativeTarget: Number(String(architecture || "").match(/Imperative target:\s*(\d+)/i)?.[1] || Number.NaN)
  };
}

function openingBucketRule(bucket, target) {
  const rules = {
    condition: `${target} starts with Before, After, When, Where, or With`,
    scene: `${target} starts with The, A, An, One, Your, That, or This`,
    statement: `${target} starts with a concrete noun, body detail, object, or daily situation, not an article, command, Today, There is, or This is a day`,
    imperative: `${target} starts with Notice, Use, Keep, Treat, Give, Make, Take, Finish, Protect, or Respond`
  };
  return rules[bucket] || `${target} follows the Surface rhythm exactly`;
}

function buildVoiceLane(user, context, today) {
  const lanes = [
    "spare and corrective; direct sentences, no soothing flourish",
    "warm but exact; tenderness arrives through practical care",
    "workbench mentor; tasks, timing, and marked completion lead",
    "relationship-aware; access, reply length, and emotional cost lead",
    "body-led; food, water, sleep, breath, or shoulders decide timing",
    "money-and-duty plainspoken; numbers, promises, and self-respect stay separate",
    "quietly protective; name the private cost without making it dramatic",
    "creative discipline; first draft, visible work, and imperfect action lead"
  ];
  const key = [
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today,
    context.dailyArea,
    context.timingTone,
    context.dailyLunarMansion?.name,
    context.dailyLunarMansion?.pada,
    context.dailyLunarDay?.name,
    context.innerWeather,
    context.bodySignal,
    context.workSignal
  ].filter(Boolean).join("|");
  return lanes[mod(stableHash(key), lanes.length)];
}

function buildSpecificityPattern(user, context, today) {
  const patterns = [
    "use one named object, one exact time window, and one consequence for a reply",
    "use one body/routine cue, one marked completion, and one thing not to reopen tonight",
    "use one work or money action, one relational limit, and one under-two-hour checkpoint",
    "use one room/location detail, one count or length, and one private cost",
    "use one delayed task, one exact action before the next meal, and one softer close",
    "use one conversation behavior, one body preparation, and one limit that is phrased without the word boundary",
    "use one calendar or list detail, one completion mark, and one consequence for sleep or evening",
    "use one ordinary object as evidence, one exact repair, and one sentence about what not to carry"
  ];
  const key = [
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today,
    context.openingScene,
    context.dailyArea,
    context.emotionalKnot,
    context.decisionGate,
    context.relationshipMirror,
    context.relationalCaution,
    context.bodySignal
  ].filter(Boolean).join("|");
  return patterns[mod(stableHash(key), patterns.length)];
}

function buildReadingFingerprint(user, context, today) {
  const compositionRoutes = [
    "object first, then consequence, then action",
    "body cue first, then emotional truth, then reply timing",
    "ordinary scene first, then hidden cost, then work repair",
    "decision moment first, then relationship consequence, then permission",
    "unfinished detail first, then need, then under-two-hour correction",
    "relationship pressure first, then body signal, then practical close",
    "work friction first, then private fear, then plain finish",
    "home or routine detail first, then self-respect, then smaller promise"
  ];
  const key = [
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today,
    context.openingScene,
    context.dailyLunarMansion?.name,
    context.dailyLunarMansion?.pada,
    context.dailyLunarDay?.name,
    context.dailyLunarDay?.paksha,
    context.dailyArea,
    context.emotionalKnot,
    context.decisionGate,
    context.relationshipMirror,
    context.bodySignal,
    context.workSignal
  ].filter(Boolean).join("|");
  const route = compositionRoutes[mod(stableHash(key), compositionRoutes.length)];
  return [
    route,
    `scene=${context.openingScene || context.dailyScene}`,
    `lunarLayer=${formatLunarMansion(context.dailyLunarMansion)}`,
    `lunarDay=${formatLunarDay(context.dailyLunarDay)}`,
    `tension=${context.emotionalKnot}`,
    `movement=${context.decisionGate || context.mentorMove}`,
    `body=${context.bodySignal}`,
    `consequence=${context.relationalCaution || context.relationshipMirror || context.workSignal}`
  ].filter(Boolean).join("; ");
}

function formatLunarMansion(mansion = {}) {
  if (!mansion?.name) return "unknown";
  return `${mansion.name} pada ${mansion.pada || "unknown"}; tone=${mansion.tone || "unknown"}`;
}

function formatPlacement(placement = {}) {
  if (!placement?.sign) return "unknown";
  const house = Number.isFinite(placement.house) ? ` house ${placement.house}` : "";
  const degree = Number.isFinite(placement.degree) ? `${placement.degree}deg` : "unknown degree";
  return `${placement.sign} ${degree}${house}`;
}

function formatLunarDay(lunarDay = {}) {
  if (!lunarDay?.name) return "unknown";
  return `${lunarDay.paksha || "unknown"} ${lunarDay.name}; phase=${lunarDay.phase || "unknown"}; tone=${lunarDay.tone || "unknown"}`;
}

export function normalizeWisdomPayload(raw, fallback = createFallbackReading()) {
  const parsed = parseReading(raw);
  const source = parsed || (typeof raw === "object" && raw ? raw : {});
  const cleanedWisdom = cleanWisdomText(source.wisdom || raw, fallback.wisdom, SOUL_WISDOM_MAX_WORDS);
  const wisdom = isLowQualityWisdom(cleanedWisdom) && fallback?.wisdom ? fallback.wisdom : cleanedWisdom;
  return {
    wisdom,
    innerWeather: cleanShortField(source.innerWeather, fallback.innerWeather),
    todayMove: cleanShortField(source.todayMove, fallback.todayMove),
    release: cleanShortField(source.release, fallback.release)
  };
}

export function cleanWisdomText(text, fallback = "", maxWords = 115) {
  const normalized = String(text || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return fallback;

  const bannedWords = [
    "astrology",
    "zodiac",
    "moon sign",
    "planet",
    "transit",
    "chart",
    "horoscope",
    "numerology",
    "karma"
  ];
  const scrubbed = bannedWords.reduce((current, word) => {
    return current.replace(new RegExp(word, "gi"), "inner timing");
  }, normalized);

  return limitWords(scrubbed, maxWords);
}

export function isLowQualityWisdom(text) {
  const normalized = String(text || "").toLowerCase();
  if (!normalized.trim()) return true;

  const bannedPatterns = [
    /\byou may feel\b/,
    /\byou might feel\b/,
    /\byou could feel\b/,
    /\byou may (notice|sense|find|need|want)\b/,
    /\byou might (notice|sense|find|need|want)\b/,
    /\byou could (notice|sense|find|need|want)\b/,
    /\bmay\b/,
    /\bmight\b/,
    /\bcould\b/,
    /\btoday may bring\b/,
    /\btoday asks\b/,
    /\bthe pull between\b/,
    /\btorn between\b/,
    /\ba part of you\b/,
    /^part of you\b/,
    /\bold pull\b/,
    /\bsteady action will speak\b/,
    /\byour steadiness grows\b/,
    /\brelational note\b/,
    /\brelational answer\b/,
    /\brelational rule\b/,
    /\brelationship rule\b/,
    /\buseful edge\b/,
    /\bbody cue\b/,
    /\bcue to\b/,
    /\bproof of care\b/,
    /\bpractical truth\b/,
    /\bfirst honest reset\b/,
    /\bprivate test\b/,
    /\bsignal, not a sentence\b/,
    /\bevidence enough\b/,
    /\bnervous system needs evidence\b/,
    /\bnot decorative\b/,
    /\bthe mood can catch up\b/,
    /\bvisible edge\b/,
    /\bwrite the next step\b/,
    /\bnext step in one\b/,
    /\bone visible next step\b/,
    /\banother round of analysis\b/,
    /\bnot asking for (another|more) analysis\b/,
    /\balmost boring\b/,
    /\bquiet proof\b/,
    /\bthe best proof will be quiet\b/,
    /\blet\s+(?:answer|choose|clean|close|complete|document|do|drink|eat|finish|give|handle|keep|lower|make|name|protect|put|reduce|repair|schedule|separate|send|simplify|sleep|step|take|turn|use|walk|write)\b/,
    /\blet\s+using\b/,
    /\btreat\s+[^.!?]{0,90}\bas information,\s*then let\b/,
    /\breply gets chosen in view\b/,
    /\bbefore the reply gets chosen\b/,
    /\bquietly ambitious and privately doubtful\b/,
    /\blet\s+(?:the|a|one)\s+[^.!?]{0,60}\b(?:made|kept|handled|closed|sent|paid|named|checked|ticked|marked|completed|finished)\b[^.!?]{0,60}\bcount\b/,
    /\bverdict on your worth\b/,
    /\btrust the process\b/,
    /\bsmall step\b/,
    /\bstay grounded\b/,
    /\bset boundaries\b/,
    /\bcalm energy\b/,
    /\bthis phase\b/,
    /\bthe universe\b/,
    /\bspiritual journey\b/,
    /\balign(?:ment|ed)?\b/,
    /\b(?:let|when|after|before)\s+do not\b/,
    /\bthe cleanest reply may be\b/,
    /\bthe useful part\b/,
    /\bwhole mood\b/,
    /\bone observable choice\b/,
    /\banother internal argument\b/,
    /\bordinary repair\b/,
    /\bplain finish\b/,
    /\bcleaner reply\b/,
    /\blet warmth have timing\b/,
    /\bfinished work and a cleaner reply\b/,
    /\bone practical shape\b/,
    /\bone plain vote\b/,
    /\bthe body gets the first vote\b/,
    /\bthe body deserves a practical vote\b/,
    /\bcare becomes practical here\b/,
    /\bborrows the whole room\b/,
    /\battention has been paying too much rent\b/,
    /\bprivate courtroom\b/,
    /\bcourtroom\b/,
    /\bholds court\b/,
    /\bbefore you pass\b/,
    /\bwhen your attention lands on\b/,
    /\bbefore the pressure gets a story\b/,
    /\bkeep the door open only as far\b/,
    /\bwill carry the decision better than another\b/,
    /\bcarry more weight than the mood\b/,
    /\banother perfect explanation\b/,
    /\banother explanation with better lighting\b/,
    /\bprivate mess asking for shape\b/,
    /\bclear edge\b/,
    /\bstop auditioning\b/,
    /\bgets more freedom by choosing\b/,
    /\bday shrinks to its real size\b/,
    /\bcared-for body more than another private hearing\b/,
    /\bauthority over the whole day\b/,
    /\bremaining doubt\b/,
    /\bprettier version of the same explanation\b/,
    /\banswer arrive after the body stops bracing\b/,
    /\bpractical answer somewhere firm to land\b/,
    /\bpractical part speak first\b/,
    /\bprivate disorder asking\b/,
    /\bfinish condition\b/,
    /\bstop when the result is visible\b/,
    /\bcan lower pressure by choosing\b/,
    /\bday becomes easier to carry\b/,
    /\btomorrow's question\b/,
    /\bwithout letting it score the whole day\b/,
    /\bvisible and modest can carry the evening\b/,
    /\banswer come from care instead of alarm\b/,
    /\bgive the mind one less assignment\b/,
    /\ba visible place to land\b/,
    /\bwith a place to land\b/,
    /\bplace to land\b/,
    /\bone less loose end\b/,
    /\bone fewer loose end\b/,
    /\bwhole weather\b/,
    /\bthe room asks\b/,
    /\bnamed hour keeps care\b/,
    /\bbody gives better timing when the body\b/,
    /\bdecision has a visible place\b/,
    /\bvisible container\b/,
    /\bclear container\b/,
    /\bpressure a handle\b/,
    /\bgives? [^.!?]{0,50} a handle\b/,
    /\bneeds? a handle\b/,
    /\bvisible repair\b/,
    /\bvisible block\b/,
    /\bvisible choice\b/,
    /\bsmaller promise\b/,
    /\bgets lighter for\b/,
    /\banswer with a time, not a debate\b/,
    /\bthe part asking for shape\b/,
    /\bstop feeding scanning\b/,
    /\bwords you did not send gets\b/,
    /\blet [^.!?]{0,60} close the block\b/,
    /\banswer that can be kept without self-punishment\b/,
    /\bone useful detail finished\b/,
    /\bthe next thing that can be handled\b/,
    /\banother private rehearsal\b/,
    /\bstarts sounding larger than it is\b/,
    /\bday back inside a timed action\b/,
    /\bstarts coloring everything else\b/,
    /\bwithout a handle\b/,
    /\bas a handle\b/,
    /\bcleaner handle\b/,
    /\bcloseness still needs a shape\b/,
    /\bhandled detail deserves more trust\b/,
    /\bplaced somewhere practical\b/,
    /\bsomewhere practical before\b/,
    /\bvisible stopping point placed\b/,
    /\bone visible appointment\b/,
    /\bvisible stopping point one\b/,
    /\bgets handled before the story grows\b/,
    /\bis the part asking to be handled\b/,
    /\bvisible work shape\b/,
    /\bwith a named hour attached\b/,
    /\bwhole report card\b/,
    /\bone ordinary job\b/,
    /\bpractical container\b/,
    /\bthe real pressure\b/,
    /\bmodest and workable\b/,
    /\bcalendar square\b/,
    /\bhonest appointment\b/,
    /\bwarmth loses?\b/,
    /\bvisible finish\b/,
    /\bprivate trial\b/,
    /\bplain answer\b/,
    /\bcleaner floor\b/,
    /\bpractical part asking for shape\b/,
    /\bone action with an ending\b/,
    /\bnext private debate begins\b/,
    /\bturns into evidence\b/,
    /\bevidence against\b/,
    /\btable before the thought starts arguing again\b/,
    /\bworkspace pressure\b/,
    /\breading each shift as a verdict\b/,
    /\bhidden trial\b/,
    /\bthe reply stay\b/,
    /\bstarts carrying too much meaning\b/,
    /\bgathers extra meaning\b/,
    /\bcollects more meaning\b/,
    /\bmood catch up to something already shaped\b/,
    /\banswer carries only the part\b/,
    /\banswer handles only the real request\b/,
    /\breply loses\b/,
    /\bevery room\b/,
    /\bstarts speaking for the whole day\b/,
    /\bstarts speaking for more than itself\b/,
    /\breply names the request and leaves\b/,
    /\bhunger should not get to argue\b/,
    /\bfood first, then the decision\b/,
    /\bwith a place you can use\b/,
    /\bborrows tone from everything else\b/,
    /\bcontainer that can be seen from the outside\b/,
    /\breply has a shape instead of an open tab\b/,
    /\baffection can stay present without making access endless\b/,
    /\bcare lands better when timing is visible\b/,
    /\bvisible hour keeps care\b/,
    /\bkeeps care from turning into open access\b/,
    /\bname the available hour\b/,
    /\breply widens\b/,
    /\bkindness works better when\b/,
    /\broom asking\b/,
    /\bbody first\b/,
    /\bbody gets the first vote\b/,
    /\bbody as the first clock\b/,
    /\blarger story\b/,
    /\bless explanation\b/,
    /\bclosed work with a real ending\b/,
    /\bbody makes the next choice cleaner\b/,
    /\bcollecting one more assignment for bedtime\b/,
    /\bturn the insight into motion\b/,
    /\bbe enough for this block\b/,
    /\bkeep bedtime free from a fresh private audit\b/,
    /\bloses some authority when food, water, breath, or rest enters first\b/,
    /\bless braced starting point\b/,
    /\bbody that is not rushing to defend itself\b/,
    /\bbedtime become a second review meeting\b/,
    /\bform the day can actually hold\b/,
    /\bend the return trip\b/,
    /\bslower body to travel through\b/,
    /\berrand waiting near the doorway\b/,
    /\baction a time and place by choosing\b/,
    /\bnext reply can wait for\b/,
    /\bworry turns it into a symbol\b/,
    /\bturned into a larger verdict\b/,
    /\bfollow-through can earn trust\b/,
    /\bstarts sounding like a judgment\b/,
    /\bcorner asking for one contained repair\b/,
    /\broom the real pressure around creative work\b/,
    /\broom detail needing a contained repair\b/,
    /\bvisible container, not emotional polish\b/,
    /\bevery demand that arrives without timing\b/,
    /\bcare with availability that arrives\b/,
    /\broom detail needing one contained repair\b/,
    /\bstay available when timing is missing\b/,
    /\banother hour of private negotiation\b/,
    /\bavailability needs a clock before kindness\b/,
    /\bconfidence than another private rehearsal\b/,
    /\bdeserves a practical repair before it becomes\b/,
    /\bshould receive one practical repair\b/,
    /\bwill help more than another private rehearsal\b/,
    /\bdo more than another explanation rehearsed alone\b/,
    /\bpromise can lower the volume\b/,
    /\baffection does not require unlimited access\b/,
    /\bpromise kept quietly can settle\b/,
    /\bvague plan into a visible appointment\b/,
    /\baction needs to replace rehearsal\b/,
    /\bcertainty the mind keeps requesting\b/,
    /\bmaking the next action concrete enough\b/,
    /\bdetail that keeps catching the eye\b/,
    /\beating before the difficult conversation\b/,
    /\banswer the rehearsal instead of feeding it\b/,
    /\bmain request needs a container\b/,
    /\bfinish the promise you made to yourself\b/,
    /\bdesk corner waiting for a reset\b/,
    /\blimit stated without a speech\b/,
    /\blimit named without extra defense\b/,
    /\bwith no further negotiation from the mood\b/,
    /\bnot the meaning of the entire day\b/,
    /\brelationship tone improves\b/,
    /\bthe pressure asking for a smaller container\b/,
    /\bstarts charging interest on every delay\b/,
    /\bthe useful move is physical\b/,
    /\ba fed, watered, or rested body\b/,
    /\bgive more credit to the handled detail\b/,
    /\bdoes not get to decide the whole tone\b/,
    /\bleave the remaining interpretation outside the block\b/,
    /\bthe sharper work\b/,
    /\buseful and short enough\b/,
    /\bpractical finish deserves\b/,
    /\bbody that has been included\b/,
    /\basking small changes to explain\b/,
    /\bdoes not need to carry asking\b/,
    /\bstarts carrying over-reading\b/,
    /\bneeding a surface cleared a place\b/,
    /\bfeeling asks for court\b/,
    /\bwhole story of self-worth\b/,
    /\bone fewer explanation\b/,
    /\bfirst task needing a surface cleared\b/,
    /\bthe actual strain around\b/,
    /\bgive it a limit that can be checked\b/,
    /\bwater and a slower breath\b/,
    /\bbody is protected before availability is promised\b/,
    /\bmake the day respond to motion first\b/,
    /\blet the loop end\b/,
    /\bnot a bigger mood\b/,
    /\bwritten into one hour, reply, or task\b/,
    /\bcloseness arrive with shape\b/,
    /\bappointment needing\b/,
    /\bdue line asking\b/,
    /\bfinal review outside the bed\b/,
    /\bleave the last review for daylight\b/,
    /\bproof enough\b/,
    /\bbody protected before availability\b/,
    /\beverything asks for a verdict\b/,
    /\bthe day respond to motion\b/,
    /^[^.!?]{0,120}\b(phone|message|text|unread|inbox|notification|screen|reply)\b/,
    /^[^.!?]{0,90}:/,
    /^today[, ]/,
    /^you may\b/,
    /^you might\b/,
    /^you could\b/,
    /^there is\b/,
    /^this is a day\b/,
    /^the day\b/
  ];

  if (bannedPatterns.some((pattern) => pattern.test(normalized))) return true;

  const repeatedGenericWords = ["calm", "steady", "clarity", "boundary", "energy", "truth", "honest"]
    .filter((word) => (normalized.match(new RegExp(`\\b${word}\\b`, "g")) || []).length > 1);

  return repeatedGenericWords.length > 1;
}

export function getSoulWisdomSpecificityIssues(text) {
  const normalized = String(text || "").toLowerCase();
  const issues = [];

  if (!hasConcreteSoulWisdomAction(normalized)) {
    issues.push("missing one concrete short action");
  }

  const concreteCategoryCount = countSoulWisdomConcreteCategories(normalized);
  if (concreteCategoryCount < 1 && !hasMeasurableSoulWisdomEdge(normalized)) {
    issues.push("missing concrete object, scene, timing edge, or completion mark");
  }

  return issues;
}

function hasConcreteSoulWisdomAction(text) {
  return /\b(answer|approve|check|choose|clean|clear|close|decide|decline|drink|eat|finish|fold|keep|leave|mark|pack|pay|place|protect|put|send|settle|show|submit|write)\b/i.test(String(text || ""));
}

function hasMeasurableSoulWisdomEdge(text) {
  return [
    /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/,
    /\b\d+\s?-?\s?(?:minute|minutes|min|hour|hours|word|words|line|lines|item|items|page|pages|rupee|rupees|reply|replies|block|blocks)\b/,
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty|forty-five|sixty)\s+(?:minute|minutes|hour|hours|word|words|line|lines|item|items|page|pages|reply|replies|block|blocks|task|tasks)\b/,
    /\b(?:named|marked|dated|available|fixed|final)\s+(?:hour|time|date|deadline|line|reply|task|block|slot)\b/,
    /\b(?:before|after|by)\s+(?:breakfast|lunch|dinner|bedtime|daylight|evening|morning|the next meal|the next call|the next reply)\b/,
    /\b(?:deadline|due line|calendar date|appointment|timer|checklist|receipt|payment|bill|finish line)\b/,
    /\b(?:paid|checked|ticked|marked|submitted|sent|closed|finished|completed|recorded)\s+(?:bill|receipt|task|item|note|draft|reply|line|block|payment|deadline|finish)\b/,
    /\b(?:brief|shorter|clean|cleaner)\s+(?:reply|answer|message)\b/
  ].some((pattern) => pattern.test(text));
}

function countSoulWisdomConcreteCategories(text) {
  const categories = [
    /\b(?:calendar|appointment|deadline|due line|hour|time|timer|slot|morning|evening|bedtime|daylight)\b/,
    /\b(?:reply|answer|sentence|call|conversation|word|message|unsent|silence)\b/,
    /\b(?:water|food|meal|breakfast|lunch|dinner|cup|tea|coffee|rest|sleep|shoulder|jaw|body|breath)\b/,
    /\b(?:desk|room|drawer|chair|counter|notebook|page|pen|door|keys|bag|shoes|kitchen|bed)\b/,
    /\b(?:task|draft|work|finish|checklist|list|item|block|submitted|completed|promise)\b/,
    /\b(?:receipt|payment|bill|wallet|amount|number|expense|rupee|paid|invoice|money)\b/
  ];
  return categories.filter((pattern) => pattern.test(text)).length;
}

export function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}

export function createFallbackReading(wisdom = "") {
  return {
    wisdom,
    innerWeather: "Tender focus",
    todayMove: "Finish the nearest real task",
    release: "Drop the need to prove it"
  };
}

function parseReading(raw) {
  if (typeof raw === "object" && raw) return raw;
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function cleanShortField(text, fallback) {
  const cleaned = cleanWisdomText(text, fallback, 12);
  const value = cleaned.replace(/[.!?]+$/g, "");
  if (!isLowQualityCue(value)) return value;
  return cleanWisdomText(fallback, createFallbackReading().todayMove, 12).replace(/[.!?]+$/g, "");
}

function formatBirthLocation(location, user) {
  if (!location?.label) return user.birthPlace || "unknown";
  const details = [
    location.timezone,
    location.source ? `${location.source} resolution` : ""
  ].filter(Boolean).join(", ");
  return details ? `${location.label} (${details})` : location.label;
}

function limitWords(text, maxWords) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  const completeSentences = text.match(/[^.!?]+[.!?]+/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
  const kept = [];
  for (const sentence of completeSentences) {
    const candidate = [...kept, sentence].join(" ");
    if (candidate.split(/\s+/).filter(Boolean).length > maxWords) break;
    kept.push(sentence);
  }
  const sentenceLimited = kept.join(" ").trim();
  if (sentenceLimited && sentenceLimited.split(/\s+/).filter(Boolean).length >= Math.min(55, maxWords)) {
    return sentenceLimited;
  }
  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function isLowQualityCue(text) {
  const normalized = String(text || "").toLowerCase();
  return [
    /\bwrite the next step\b/,
    /\bnext step in one\b/,
    /\bone visible next step\b/,
    /\banother round of analysis\b/,
    /\bnot asking for (another|more) analysis\b/,
    /\balmost boring\b/,
    /\bquiet proof\b/,
    /\bverdict on your worth\b/
  ].some((pattern) => pattern.test(normalized));
}

export function buildParagraphArchitecture(user, context, today) {
  const architectures = [
    "4 sentences: object-rooted scene and immediate consequence; first name plus emotional friction in sentence 2; under-two-hour action with body cue; relationship or work close.",
    "5 sentences: scene observation; body or routine signal; first name plus emotional truth in sentence 3; concrete action; relational close.",
    "5 sentences: scene observation; first name plus today's specific pressure in sentence 2; relational consequence; practical action; quiet permission.",
    "6 sentences: scene observation; short body cue; first name plus core need in sentence 3; practical action; relational caution; grounded close.",
    "4 sentences: scene plus contradiction; practical action in sentence 2; first name plus need in sentence 3; relational caution and grounded close in sentence 4.",
    "6 sentences: scene observation; first name plus pressure in sentence 2; practical action; body signal; relational consequence; grounded close.",
    "5 sentences: scene observation; relationship mirror; first name plus personal edge in sentence 3; work or routine action; grounded close.",
    "6 sentences: scene observation; practical action; relational caution; first name plus need in sentence 4; avoid pattern; grounded close.",
    "4 sentences: scene as evidence; body/routine correction in sentence 2; first name plus private cost in sentence 3; practical close with one consequence.",
    "5 sentences: scene observation; work or money detail; relational caution; first name plus core need in sentence 4; grounded close.",
    "6 sentences: scene observation; consequence of the old habit; practical action; first name plus emotional truth in sentence 4; body cue; spare close.",
    "5 sentences: scene observation; first name plus hidden cost in sentence 2; body or routine signal; work repair; relational close.",
    "4 sentences: scene observation; relational consequence; first name plus personal edge in sentence 3; under-two-hour action and permission.",
    "6 sentences: scene observation; body cue; relational consequence; practical action; first name plus need in sentence 5; grounded close.",
    "5 sentences: scene and tension; practical action; first name plus work pressure in sentence 3; body cue; relational or self-respect close.",
    "6 sentences: scene observation; first name plus timing pressure in sentence 2; avoid pattern; body/routine correction; relational consequence; grounded close."
  ];
  const key = [
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today,
    context.sign,
    context.moonSign,
    context.element,
    context.lifePath,
    context.openingScene,
    classifyPromptScene(context.openingScene || context.dailyScene),
    context.dailyLunarMansion?.name,
    context.dailyLunarMansion?.pada,
    context.dailyLunarDay?.name,
    context.dailyLunarDay?.paksha,
    context.dailyArea,
    context.coreNeed,
    context.personalEdge,
    context.bodySignal,
    context.workSignal
  ].filter(Boolean).join("|");
  const base = architectures[mod(stableHash(key), architectures.length)];
  return `${base} ${buildSurfaceRhythm(user, context, today)}`;
}

export function buildSurfaceRhythm(user, context, today) {
  const rhythms = [
    "Opening bucket: condition. Final bucket: statement. Imperative target: 1. Sentence texture: one concrete correction, no slogan close.",
    "Opening bucket: scene. Final bucket: condition. Imperative target: 0. Sentence texture: observation-led, with the close starting from timing or relationship consequence.",
    "Opening bucket: statement. Final bucket: imperative. Imperative target: 1. Sentence texture: noun-led opening, spare command at the end.",
    "Opening bucket: condition. Final bucket: scene. Imperative target: 0. Sentence texture: cause-and-effect, with an ordinary object returning in the close.",
    "Opening bucket: scene. Final bucket: statement. Imperative target: 1. Sentence texture: object-first, practical middle, earned conclusion.",
    "Opening bucket: statement. Final bucket: condition. Imperative target: 0. Sentence texture: sensory detail first, consequence last.",
    "Opening bucket: imperative. Final bucket: statement. Imperative target: 2. Sentence texture: firm mentor note with one softened landing.",
    "Opening bucket: condition. Final bucket: imperative. Imperative target: 1. Sentence texture: pressure first, direct close.",
    "Opening bucket: statement. Final bucket: scene. Imperative target: 0. Sentence texture: unfinished detail first, ordinary proof last.",
    "Opening bucket: scene. Final bucket: imperative. Imperative target: 2. Sentence texture: visible object, decisive repair.",
    "Opening bucket: imperative. Final bucket: condition. Imperative target: 2. Sentence texture: command-led start, conditional relational close.",
    "Opening bucket: condition. Final bucket: statement. Imperative target: 0. Sentence texture: restraint and consequence, no command-heavy cadence.",
    "Opening bucket: statement. Final bucket: statement. Imperative target: 1. Sentence texture: private cost first, plain adult finish.",
    "Opening bucket: scene. Final bucket: scene. Imperative target: 0. Sentence texture: object echo without repeating the same noun.",
    "Opening bucket: imperative. Final bucket: imperative. Imperative target: 2. Sentence texture: compact, active, not harsh.",
    "Opening bucket: condition. Final bucket: condition. Imperative target: 1. Sentence texture: timing frame at both ends, different starting words."
  ];
  const key = [
    user.name,
    user.birthDate,
    user.birthTime,
    user.birthPlace,
    today,
    context.sign,
    context.moonSign,
    context.element,
    context.lifePath,
    context.openingScene,
    classifyPromptScene(context.openingScene || context.dailyScene),
    context.dailyLunarMansion?.name,
    context.dailyLunarMansion?.pada,
    context.dailyLunarDay?.name,
    context.dailyLunarDay?.paksha,
    context.dailyArea,
    context.emotionalKnot,
    context.decisionGate,
    context.bodySignal,
    context.relationalCaution
  ].filter(Boolean).join("|");
  return rhythms[mod(stableHash(key), rhythms.length)];
}

function classifyPromptScene(text) {
  const normalized = String(text || "").toLowerCase();
  if (/\b(phone|message|text|unread|inbox|notification|screen|reply)\b/.test(normalized)) return "device";
  if (/\b(water|glass|drink)\b/.test(normalized)) return "water";
  if (/\b(kitchen|counter|tea|cup|meal|food|breakfast|lunch)\b/.test(normalized)) return "kitchen";
  if (/\b(calendar|appointment|deadline|time|hour|slot)\b/.test(normalized)) return "calendar";
  if (/\b(notebook|page|pen|line|written|write)\b/.test(normalized)) return "notebook";
  if (/\b(wallet|receipt|payment|bill|price|money)\b/.test(normalized)) return "money";
  if (/\b(conversation|sentence|call|answer|agree|yes|say|reply|word|words|unsent|send)\b/.test(normalized)) return "conversation";
  if (/\b(chair|room|desk|workspace|surface|drawer|laundry|bed|domestic)\b/.test(normalized)) return "room";
  if (/\b(shoes|door|keys|bag|charger|errand)\b/.test(normalized)) return "door";
  if (/\b(mirror|shoulder|shoulders|jaw|body|breath)\b/.test(normalized)) return "body";
  if (/\b(list|task|item|draft|work|promise)\b/.test(normalized)) return "task";
  if (/\b(tab|worry|thought|mind)\b/.test(normalized)) return "worry";
  return "general";
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function mod(value, length) {
  return ((value % length) + length) % length;
}
