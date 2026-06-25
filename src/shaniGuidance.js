export function buildFallbackPanditAnswer({ user = {}, question = "", report = {}, membership = {} } = {}) {
  const name = firstName(user.name);
  const phase = report.phaseTitle || "Shani discipline window";
  const pressure = inferShaniPressure(question);
  const cue = questionCue(question, pressure);
  const phaseGuidance = getPhaseRoute(report.phaseIndex);
  const practice = pickPractice({ pressure, report, membership });
  const caution = pickCaution({ pressure, report });

  return {
    text: pickPanditText({ name, phase, pressure, cue, phaseGuidance, report }),
    practice,
    caution
  };
}

export function buildPanditFingerprint({ user = {}, question = "", report = {}, membership = {} } = {}) {
  const pressure = inferShaniPressure(question);
  return [
    `user=${firstName(user.name)}`,
    `questionCue=${questionCue(question, pressure)}`,
    `pressure=${pressure.id}`,
    `phase=${report.phaseTitle || "unknown"}`,
    `active=${report.active ? "yes" : "no"}`,
    `moonSign=${report.moonSign || "unknown"}`,
    `saturnSign=${report.saturnSign || "unknown"}`,
    `timeline=${report.endLabel || "unknown"}`,
    `plan=${membership.planName || membership.planId || "unknown"}`,
    `lesson=${pressure.lesson}`,
    `remedy=${pressure.remedy}`
  ].join("; ");
}

export function getPanditAnswerIssues(answer = {}, { user = {}, question = "", report = {} } = {}) {
  const issues = [];
  const textWords = words(answer.text).length;
  const practiceWords = words(answer.practice).length;
  const cautionWords = words(answer.caution).length;
  const allText = [answer.text, answer.practice, answer.caution].filter(Boolean).join(" ");

  if (textWords < 65 || textWords > 125) issues.push(`text expected 65-125 words, got ${textWords}.`);
  if (practiceWords < 16 || practiceWords > 45) issues.push(`practice expected 16-45 words, got ${practiceWords}.`);
  if (cautionWords < 10 || cautionWords > 35) issues.push(`caution expected 10-35 words, got ${cautionWords}.`);
  if (isLowQualityPanditText(allText)) issues.push("matched low-quality or fear-based Shani phrasing.");
  if (!mentionsShaniContext(answer.text)) issues.push("text should connect Shani/Saade Sati/phase context.");
  if (!hasQuestionCue(allText, question)) issues.push("answer does not reflect the member's question.");
  if (!hasRemedyCue(answer.practice)) issues.push("practice needs a concrete remedy or devotional action.");
  if (!hasSevenDayCue(allText)) issues.push("answer should guide the next seven days.");
  if (needsProfessionalHelp(question) && !mentionsProfessionalHelp(allText)) {
    issues.push("safety-sensitive question needs professional-help guidance.");
  }
  if (countWord(allText, firstName(user.name)) > 1) issues.push("used the member's first name more than once.");
  if (report.phaseTitle && !String(answer.text || "").toLowerCase().includes(String(report.phaseTitle).toLowerCase())) {
    issues.push("text does not mention the member's Shani phase.");
  }

  return issues;
}

export function isLowQualityPanditText(text) {
  const normalized = String(text || "").toLowerCase();
  if (!normalized.trim()) return true;

  return [
    /\bpanic\b/,
    /\bcurse\b/,
    /\bdoomed\b/,
    /\bguarantee(?:d)?\b/,
    /\bwill definitely\b/,
    /\bnothing bad will happen\b/,
    /\btrust the process\b/,
    /\bthe universe\b/,
    /\bpositive energy\b/,
    /\bstay positive\b/,
    /\bjust pray\b/,
    /\bshani is angry\b/,
    /\bpunishing you\b/,
    /\byou may\b/,
    /\byou might\b/,
    /\byou could\b/,
    /^do not fear this\b/i,
    /\bkeep the question simple\b/
  ].some((pattern) => pattern.test(normalized));
}

function inferShaniPressure(question) {
  const lower = String(question || "").toLowerCase();
  if (/\b(family|parent|mother|father|home|duty|duties)\b/.test(lower) && /\b(money|debt|loan|repay|support|resent)\b/.test(lower)) {
    return {
      id: "family-duty",
      cue: "family duty and repayment pressure",
      lesson: "support with limits, repayment order, and service without resentment",
      remedy: "write the amount, choose the oldest clear obligation, and serve at home without complaint"
    };
  }
  if (/\b(work|job|career|boss|business|money|salary|debt|loan)\b/.test(lower)) {
    return {
      id: "work-money",
      cue: "work and money pressure",
      lesson: "responsibility, proof of effort, and clean repayment",
      remedy: "finish one delayed duty before noon and keep Saturday service private"
    };
  }
  if (/\b(love|marriage|partner|family|parent|relationship|child|home)\b/.test(lower)) {
    return {
      id: "relationship-family",
      cue: "relationship and family pressure",
      lesson: "speech restraint, duty without resentment, and warmer boundaries",
      remedy: "speak after the body settles and serve at home without announcing sacrifice"
    };
  }
  if (/\b(health|sleep|anxiety|stress|fear|panic|ill|doctor|body)\b/.test(lower)) {
    return {
      id: "body-mind",
      cue: "body and mind pressure",
      lesson: "routine, food, sleep, and humility before overthinking",
      remedy: "protect sleep, reduce late-night checking, and sit quietly before sunrise"
    };
  }
  if (/\b(court|legal|enemy|fight|conflict|case|police|property)\b/.test(lower)) {
    return {
      id: "conflict-legal",
      cue: "conflict and authority pressure",
      lesson: "documentation, restraint, and lawful conduct",
      remedy: "write facts calmly, avoid public anger, and seek qualified guidance for legal steps"
    };
  }
  return {
    id: "general",
    cue: "the pressure you named",
    lesson: "patience, truthful conduct, and completed responsibility",
    remedy: "finish one pending duty, keep speech measured, and offer quiet Saturday service"
  };
}

function questionCue(question, pressure) {
  const lower = String(question || "").toLowerCase();
  const cues = [
    ["career", "career pressure"],
    ["job", "job pressure"],
    ["money", "money stress"],
    ["debt", "debt pressure"],
    ["marriage", "marriage pressure"],
    ["partner", "partner conflict"],
    ["family", "family duty"],
    ["sleep", "broken sleep"],
    ["anxiety", "anxiety"],
    ["court", "court matter"],
    ["legal", "legal matter"],
    ["enemy", "conflict with an opponent"]
  ];
  return cues.find(([needle]) => lower.includes(needle))?.[1] || pressure.cue;
}

function getPhaseRoute(phaseIndex) {
  if (phaseIndex === 1) return "Start by simplifying obligations before they become heavier.";
  if (phaseIndex === 2) return "Let maturity show through fewer reactions and more completed work.";
  if (phaseIndex === 3) return "Close the lesson carefully instead of dropping discipline when relief appears.";
  return "Use this calmer period to build discipline before pressure asks for it.";
}

function pickPanditText({ name, phase, pressure, cue, phaseGuidance, report }) {
  const moon = report.moonSign || "your Moon sign";
  const saturn = report.saturnSign || "the current Saturn sign";
  const phaseText = String(phase).toLowerCase();
  const routes = {
    "work-money": `${name}, career and money pressure should be handled as a discipline ledger, not as a verdict on your worth. In ${phaseText}, Shani asks for proof through completed responsibility: one visible work duty, one honest money number, and one promise made smaller. Moon in ${moon} shows where the pressure is felt; Saturn in ${saturn} shows where conduct must become cleaner. Keep ${cue} practical for the next seven days: document effort, repay what is clear, and avoid dramatic changes until the duty in front of you is finished. ${phaseGuidance}`,
    "relationship-family": `${name}, the marriage or family pressure is asking for speech discipline before remedy. In ${phaseText}, Shani watches how you carry duty when emotion becomes sharp. Moon in ${moon} shows the need for safety; Saturn in ${saturn} asks for restraint, timing, and service without resentment. Around ${cue}, do not win the argument by losing softness. For the next seven days, speak later, speak shorter, and complete one home duty quietly before asking to be understood. ${phaseGuidance}`,
    "family-duty": `${name}, family duty and debt should be handled as a boundary of dharma, not as silent suffering. In ${phaseText}, Shani is asking you to make support measurable so resentment does not poison service. Moon in ${moon} shows the emotional bond; Saturn in ${saturn} asks for order, repayment, and limits that can be repeated. Around ${cue}, use the next seven days to list what is owed, what is affordable, and what must wait. ${phaseGuidance}`,
    "body-mind": `${name}, weak sleep and anxiety need rhythm before interpretation. In ${phaseText}, Shani is not asking for fear; it is asking the body to trust routine again. Moon in ${moon} shows sensitivity, while Saturn in ${saturn} asks for food, rest, and repeated conduct. Around ${cue}, the next seven days should be simple: protect the first and last hour, reduce late checking, and make one duty visible early. ${phaseGuidance}`,
    "conflict-legal": `${name}, court or property conflict must be treated as a conduct test, not a battlefield. In ${phaseText}, Shani favors records, patience, lawful steps, and speech that cannot be used against you. Moon in ${moon} shows the emotional drain; Saturn in ${saturn} asks for clean documentation. Around ${cue}, keep the next seven days sober: write facts, avoid threats, follow qualified legal guidance, and let restraint become the remedy. ${phaseGuidance}`,
    general: `${name}, the pressure you named needs cleaner conduct, not fear. In ${phaseText}, Shani responds to truth, patience, completed responsibility, and humble service. Moon in ${moon} shows where the burden is felt; Saturn in ${saturn} shows where discipline must become ordinary. Keep the next seven days practical: finish one pending duty, reduce harsh speech, and make every promise small enough to keep. ${phaseGuidance}`
  };
  return routes[pressure.id] || routes.general;
}

function pickPractice({ pressure, report, membership }) {
  const plan = membership.planName || membership.planId || "";
  const timeline = report.endLabel ? ` Keep the timeline in view: ${report.endLabel}.` : "";
  if (pressure.id === "work-money") {
    return `For seven days, finish one delayed work or money duty before noon, then light a sesame-oil lamp on Saturday and offer quiet service.${timeline}`;
  }
  if (pressure.id === "relationship-family") {
    return `For seven days, delay hard replies until after food and breath, then do one private family service on Saturday without asking for credit.${timeline}`;
  }
  if (pressure.id === "family-duty") {
    return `For seven days, write each family duty with amount and date, repay the oldest clear item first, and do Saturday home service quietly.${timeline}`;
  }
  if (pressure.id === "body-mind") {
    return `For seven days, sleep and wake at fixed times, sit quietly for nine breaths before sunrise, and keep Saturday simple with lamp, service, and rest.${timeline}`;
  }
  if (pressure.id === "conflict-legal") {
    return `For seven days, write facts before speaking, keep documents clean, seek qualified legal guidance, avoid public anger, and do Saturday seva without display.${timeline}`;
  }
  return `For seven days, complete one pending duty daily, light a clean Saturday lamp, and serve quietly without display.${plan ? ` Keep the ${plan} plan practical.` : ""}`;
}

function pickCaution({ pressure, report }) {
  if (pressure.id === "work-money") return "Avoid sudden resignations, risky promises, or spending from fear; let proof and repayment lead.";
  if (pressure.id === "relationship-family") return "Do not use silence as punishment or service as proof that others owe you softness.";
  if (pressure.id === "family-duty") return "Do not promise from guilt; Shani favors support that can remain steady next month.";
  if (pressure.id === "body-mind") return "If distress or symptoms intensify, combine remedies with qualified medical or mental-health support.";
  if (pressure.id === "conflict-legal") return "Do not threaten, exaggerate, or act outside lawful advice; Shani favors clean records.";
  if (report.active) return "Do not confuse pressure with punishment; keep the remedy steady and ordinary.";
  return "Do not wait for crisis before becoming organized; prepare while the window is calmer.";
}

function mentionsShaniContext(text) {
  return /\b(Shani|Saade Sati|Saturn|phase|Moon sign|remedy|discipline)\b/i.test(String(text || ""));
}

function hasQuestionCue(text, question) {
  const tokens = significantTokens(question);
  if (!tokens.length) return true;
  const normalized = String(text || "").toLowerCase();
  return tokens.some((token) => normalized.includes(token));
}

function hasRemedyCue(text) {
  return /\b(lamp|Saturday|seva|service|prayer|breath|sunrise|duty|repay|clean|offer)\b/i.test(String(text || ""));
}

function hasSevenDayCue(text) {
  return /\b(seven days|7 days|next seven days|daily)\b/i.test(String(text || ""));
}

function needsProfessionalHelp(text) {
  return /\b(suicide|self-harm|abuse|violence|threat|unsafe|legal|court|police|health|doctor|panic|severe|harm|assault)\b/i.test(String(text || ""));
}

function mentionsProfessionalHelp(text) {
  return /\b(qualified|doctor|therapist|lawyer|police|legal advice|medical|mental-health|professional)\b/i.test(String(text || ""));
}

function significantTokens(text) {
  const stop = new Set([
    "what", "should", "during", "about", "this", "that", "with", "from", "have", "need", "feel", "feeling",
    "more", "less", "will", "would", "could", "might", "because", "before", "after", "there", "their",
    "shani", "saade", "sati", "remedy", "upay"
  ]);
  return words(String(text || "").toLowerCase())
    .map((word) => word.replace(/[^a-z0-9-]/g, ""))
    .filter((word) => word.length > 3 && !stop.has(word))
    .slice(0, 10);
}

function countWord(text, word) {
  if (!word) return 0;
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
  return (String(text || "").match(pattern) || []).length;
}

function firstName(name) {
  return String(name || "friend").trim().split(/\s+/)[0] || "friend";
}

function words(text) {
  return String(text || "").split(/\s+/).filter(Boolean);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
