const NUMBER_MEANINGS = {
  1: {
    instinct: "quick starts, courage, and direct choices",
    path: "leadership through clean initiative",
    presence: "independent, memorable, and hard to ignore",
    lucky: "first steps, launches, and honest decisions",
    avoid: "ego battles and rushing before listening"
  },
  2: {
    instinct: "sensitivity, timing, and quiet observation",
    path: "partnership, patience, and emotional intelligence",
    presence: "soft-spoken, receptive, and calming",
    lucky: "conversation, repair, and gentle agreements",
    avoid: "over-dependence or waiting too long"
  },
  3: {
    instinct: "expression, humor, and visible feeling",
    path: "creative honesty and social confidence",
    presence: "bright, expressive, and easy to remember",
    lucky: "messages, ideas, and first drafts",
    avoid: "scattered promises and unfinished stories"
  },
  4: {
    instinct: "order, proof, and practical footing",
    path: "discipline, structure, and patient building",
    presence: "steady, reliable, and quietly serious",
    lucky: "plans, systems, and long-term repairs",
    avoid: "rigidity when the heart needs room"
  },
  5: {
    instinct: "movement, curiosity, and fast adaptation",
    path: "freedom with responsibility",
    presence: "restless, magnetic, and change-friendly",
    lucky: "travel, learning, and flexible choices",
    avoid: "impulse when stability is needed"
  },
  6: {
    instinct: "care, beauty, and protective loyalty",
    path: "responsibility without self-erasure",
    presence: "warm, supportive, and emotionally polished",
    lucky: "home, love, healing, and artful effort",
    avoid: "rescuing people who need accountability"
  },
  7: {
    instinct: "silence, depth, and private analysis",
    path: "wisdom, research, and inner trust",
    presence: "thoughtful, observant, and a little mysterious",
    lucky: "study, spiritual practice, and careful timing",
    avoid: "isolation that pretends to be peace"
  },
  8: {
    instinct: "ambition, stamina, and material judgment",
    path: "authority, money lessons, and ethical power",
    presence: "commanding, capable, and results-focused",
    lucky: "business, discipline, and measurable progress",
    avoid: "control when collaboration would work better"
  },
  9: {
    instinct: "compassion, closure, and wide perspective",
    path: "service, maturity, and meaningful endings",
    presence: "generous, intense, and emotionally broad",
    lucky: "forgiveness, completion, and public goodwill",
    avoid: "carrying everyone else's unfinished lessons"
  }
};

export function getNumbers(user = {}) {
  const birthNumber = reduceDigits(String(user.birthDate || "").split("-")[2] || "");
  const lifePath = reduceDigits(user.birthDate);
  const nameNumber = reduceName(user.name);
  const lucky = reduceDigits(`${birthNumber}${lifePath}${nameNumber}`);
  const avoid = ((lucky + 4) % 9) || 9;

  return [
    {
      label: "Birth number",
      value: birthNumber,
      note: `Your instinctive style: ${NUMBER_MEANINGS[birthNumber].instinct}.`
    },
    {
      label: "Life path",
      value: lifePath,
      note: `The rhythm life keeps teaching: ${NUMBER_MEANINGS[lifePath].path}.`
    },
    {
      label: "Name number",
      value: nameNumber,
      note: `How your presence lands: ${NUMBER_MEANINGS[nameNumber].presence}.`
    },
    {
      label: "Lucky number",
      value: lucky,
      note: `Use it for ${NUMBER_MEANINGS[lucky].lucky}.`
    },
    {
      label: "Avoid",
      value: avoid,
      note: `Go light on it when it pulls you toward ${NUMBER_MEANINGS[avoid].avoid}.`
    }
  ];
}

export function reduceDigits(value) {
  let sum = String(value || "").replace(/\D/g, "").split("").reduce((total, digit) => total + Number(digit), 0);
  while (sum > 9) {
    sum = String(sum).split("").reduce((total, digit) => total + Number(digit), 0);
  }
  return sum || 1;
}

export function reduceName(name) {
  const total = String(name || "").toUpperCase().replace(/[^A-Z]/g, "").split("").reduce((sum, letter) => {
    return sum + ((letter.charCodeAt(0) - 64 - 1) % 9) + 1;
  }, 0);
  return reduceDigits(total);
}
