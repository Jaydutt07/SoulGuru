# SoulGuru Prophecy And Subscription Strategy

## Reading Generation Truth

The backend does call OpenAI for Soul Guru readings through `createDailySoulWisdom` -> `requestSoulWisdom` -> `requestOpenAIResponse` -> `client.responses.create`.

Important behavior:

- If Supabase already has today's row in `daily_soul_readings`, the backend returns the cached reading and does not call OpenAI again.
- If the APK is built without `VITE_API_BASE_URL`, the app uses deterministic local fallback readings and OpenAI is not involved.
- If production Supabase is missing and `SOUL_WISDOM_ALLOW_UNCACHED` is not explicitly enabled, the backend refuses to generate an uncached reading.
- The reading cache key includes `SOUL_WISDOM_PROMPT_VERSION`, so changing the prompt version forces fresh daily readings under the new contract.

## Current Prompt Problem

The previous Soul Guru prompt tried hard to avoid generic readings, but it forced the final wisdom into 18-34 words. That is too little space for a reading to feel like a divine prophecy. It naturally becomes a small advice card: useful, but not magical enough.

The old prompt also said things like:

```text
This is not a generic horoscope. It must read like a careful mentor noticed one exact pressure in the user's day and gave one clean direction.
The free Words of Wisdom is intentionally short. Maximum impact, minimum words.
Before returning, silently check: 18-34 words, one or two sentences...
```

## New Prompt Direction

Version: `soul-wisdom-v30`

New contract:

- 44-72 words.
- Two or three sentences.
- One sacred verdict about the user's hidden pattern.
- One strength and one shadow shown together.
- One practical cheat-code correction the user can act on today.
- One forward-moving blessing, without guaranteeing external outcomes.
- Divine mentorship voice: sharper, more emotionally exposing, and less daily wellness.

Core prompt language now frames the reading as:

```text
This is not a generic horoscope. It must read like a daily prophecy from a careful divine mentor: one exact omen from the user's ordinary day, one hidden pressure, one clean direction, and one earned blessing.
```

## More Guidance Subscription

Current configured price in the repo is `MORE_GUIDANCE_PRICE_PAISE=49900`, meaning INR 499 for 3 months.

Recommended offer:

Soul Guru More Guidance - INR 499 for 3 months as launch pricing.

What the user gets:

- Deeper Daily Prophecy: expands the free reading into "why this came today", "what pattern is repeating", and "what to do before night".
- Weekly Pattern Map: every seventh day, Soul Guru connects the user's last readings and names the repeating lesson.
- Evening Reflection: one short check-in question based on today's prophecy.
- Saved Prophecy Memory: saved readings influence future readings through memory search.
- Astro Solve Bonus: 15 additional Astro Solve questions for 3 months.
- Monthly Life Chapter: a monthly reading naming the user's current chapter, pressure, opportunity, and discipline.

Better language than "More detailed Soul Guru readings":

- "Your prophecy explained"
- "Weekly pattern map"
- "Evening reflection ritual"
- "Saved guidance memory"
- "15 deeper Astro Solves"

Potential future pricing:

- Launch: INR 499 / 3 months.
- Standard after traction: INR 699 / 3 months.
- Bundle with Shani: discount only if the user has active Saade Sati, so the bundle feels relevant instead of forced.

## Shani Subscription Positioning

Current configured Shani prices:

- 3 months: INR 299
- 6 months: INR 549
- 1 year: INR 999
- Remaining timeline: INR 1499

Recommended stronger pricing after content is upgraded:

- 3 months: INR 399
- 6 months: INR 699
- 1 year: INR 1199
- Remaining timeline: INR 1799

Keep the current lower prices for launch if we want faster early adoption. Shani should become the main revenue stream only after the member area feels alive enough to justify renewal.

## Shani Timeline Content

Use Vedic Moon sign as the primary sign for Saade Sati guidance.

Rising phase, Saturn 12th from Moon:

- Theme: expenses, sleep, isolation, endings, foreign/distant pressure, preparation.
- Product promise: reduce leakage.
- Remedy map: expense fasting, sleep discipline, Saturday seva, one obligation closed weekly, private charity, digital quiet after sunset.

Peak phase, Saturn over Moon:

- Theme: body, identity, emotional heaviness, self-respect, patience.
- Product promise: stabilize the self.
- Remedy map: morning discipline, food/sleep protection, speech restraint, weekly duty ledger, elder/service practice, anger delay ritual.

Setting phase, Saturn 2nd from Moon:

- Theme: family, money, speech, stored values, repayment, closure.
- Product promise: close the lesson cleanly.
- Remedy map: repayment plan, family duty boundaries, food discipline, truth-with-restraint speech practice, Saturday donation, release review.

## Shani Plan Depth

3-month Shani plan:

- 12-week discipline track.
- Weekly remedy and Saturday practice.
- Phase-specific pressure guidance.
- Moon-sign remedy theme.
- Pandit chat for member questions.

6-month Shani plan:

- Everything in 3 months.
- Monthly Shani review.
- Habit tracker for speech, debt, sleep, duty, and seva.
- Family/work/money pressure mapping.

1-year Shani plan:

- Everything in 6 months.
- Full annual Shani calendar.
- Monthly "what Saturn is teaching now" report.
- Quarterly release ritual and progress reflection.

Remaining timeline plan:

- Full Saade Sati map until completion.
- Entry, peak, and release phase timeline.
- Renewal-free access for the remaining period.
- Major transition reports near phase changes.
- Personalized remedy library by Moon sign, phase, and pressure type.

## Moon Sign Remedy Themes

These should be framed as devotional and practical support, not guaranteed cures.

Aries Moon:

- Pressure: anger, haste, independence, conflict with authority.
- Helpful guidance: delay reaction, finish physical effort, serve without needing control.
- Remedy feel: Saturday discipline plus Hanuman-style courage, exercise, restraint before speech.

Taurus Moon:

- Pressure: money, comfort, food, voice, attachment.
- Helpful guidance: budget clarity, food moderation, speech softness.
- Remedy feel: donate food or essentials, clean money ledger, avoid comfort spending on Saturdays.

Gemini Moon:

- Pressure: overthinking, messages, siblings, study, scattered speech.
- Helpful guidance: reduce information noise, write facts, keep replies short.
- Remedy feel: mantra repetition, study discipline, phone quiet window, service through teaching/helping.

Cancer Moon:

- Pressure: home, mother, emotional safety, sleep.
- Helpful guidance: protect routine, clean home space, avoid emotional flooding.
- Remedy feel: simple Saturday lamp, water/body care, service to elders, one home duty completed quietly.

Leo Moon:

- Pressure: pride, recognition, father/authority, being seen.
- Helpful guidance: humility, complete work before asking for attention.
- Remedy feel: seva without display, respect elders/workers, finish duty without performance.

Virgo Moon:

- Pressure: worry, health routines, criticism, service overload.
- Helpful guidance: one checklist, one repair, less perfection.
- Remedy feel: clean neglected space, food/sleep discipline, serve practically without self-punishment.

Libra Moon:

- Pressure: partnership, fairness, people-pleasing, agreements.
- Helpful guidance: measured speech, written terms, balanced duty.
- Remedy feel: relationship restraint, charity without display, avoid making promises from guilt.

Scorpio Moon:

- Pressure: fear, control, secrecy, sudden emotional intensity.
- Helpful guidance: document facts, avoid revenge, choose lawful/clean conduct.
- Remedy feel: breath before response, Saturday silence window, service to vulnerable people, release rituals.

Sagittarius Moon:

- Pressure: belief, teachers, travel, legal/ethical choices.
- Helpful guidance: humility before truth, complete study/duty, avoid preaching.
- Remedy feel: scripture/study discipline, donate learning materials, keep promises small and ethical.

Capricorn Moon:

- Pressure: work, burden, duty, loneliness, ambition.
- Helpful guidance: rest without guilt, realistic workload, elder/service humility.
- Remedy feel: duty ledger, Saturday seva, protect sleep, stop carrying everyone's task.

Aquarius Moon:

- Pressure: community, distance, ideals, networks, isolation.
- Helpful guidance: serve the group without disappearing, simplify social duties.
- Remedy feel: service to workers/elderly/poor, clean digital commitments, reduce detached avoidance.

Pisces Moon:

- Pressure: faith, confusion, escape, sleep, emotional absorption.
- Helpful guidance: routine before interpretation, fewer fantasies, grounded devotion.
- Remedy feel: morning prayer, sleep discipline, charity quietly, write one truth before advising others.

## What Keeps Shani Users Hooked

- A visible countdown with phase milestones.
- Weekly "Saturn task" that feels specific and finishable.
- Saturday ritual screen with check marks.
- Moon-sign remedy theme that changes the wording and focus.
- A "pressure ledger" where users track debt, duty, speech, sleep, and seva.
- Pandit answers that refer to the user's current phase, Moon sign, Saturn sign, and exact question.
- Monthly progress message: "This pressure has reduced", "This pattern is repeating", "This duty needs closure."
