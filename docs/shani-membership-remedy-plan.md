# Shani Membership Remedy Plan

This is the human review companion for the static backend catalog in `src/backend/shaniRemedyCatalog.js`. The app should use the backend catalog as the source of truth so paid remedy maps and reminders do not spend GPT tokens.

## Shagun Plans

| Plan ID | Name | Price Copy | Duration | Main Promise |
| --- | --- | --- | --- | --- |
| `3m` | Shani Aarambh | Shagun ke Rs 251 | 3 month | Start Saade Sati upay properly with a repeatable guidance routine. |
| `6m` | Shani Dhairya | Shagun ke Rs 501 | 6 month | Build patience through monthly review, daan rotation, and mantra sankalp. |
| `1y` | Shani Niyam | Shagun ke Rs 1001 | 1 year | Make Shani discipline a year-long path of niyam, seva, repayment, and restraint. |
| `full` | Shani Sampoorna | Shagun ke Rs 1111 | Remaining period of Saade Sati | Stay guided until the current Saade Sati or Shani watch period completes. |

## Plan Depth

| Plan | What User Gets |
| --- | --- |
| Shani Aarambh | Moon-sign remedy map, Friday preview, Saturday reminder, mantra/daan/seva/speech tracker, Pandit guidance access. |
| Shani Dhairya | Everything in Aarambh, longer guidance rhythm, 21/40-day mantra sankalp options, budget-aware daan rotation, monthly Moon-sign correction. |
| Shani Niyam | Everything in Dhairya, full-year guidance calendar, optional Shanivar vrat discipline, quarterly phase review, major Shani-window hooks. |
| Shani Sampoorna | Everything in Niyam, phase transition guidance, long-term seva and daan tracking, yearly remedy recalibration, high-intensity Shani alerts. |

## Phase Layer

| Phase | Focus | Saturday Action |
| --- | --- | --- |
| Rising phase | Simplify obligations before pressure becomes heavier. | Close one old promise and keep Saturday quieter than usual. |
| Peak phase | Let maturity show through fewer reactions and more completed duty. | Before hard speech, finish one practical task and settle the body. |
| Setting phase | Close lessons carefully and keep discipline after relief begins. | Complete one next honest step without reopening old emotional accounts. |

## Moon-Sign Remedy Matrix

Every paid plan uses the same Moon-sign core and increases duration/depth by plan.

| Moon Sign | Rashi | Core Pressure | Friday Prep | Saturday Remedy |
| --- | --- | --- | --- | --- |
| Aries | Mesh | Anger, urgency, expenses, sleep, impulsive decisions. | Write one avoidable expense, one unfinished duty, and one reply that can wait. | Black til or footwear daan, Hanuman Chalisa, one physical duty before noon. |
| Taurus | Vrishabh | Comfort spending, food discipline, stubborn emotional holding. | Review one comfort expense and choose one food/spending restraint. | Donate food, black urad, or daily-use essentials; keep meals simple. |
| Gemini | Mithun | Scattered mind, over-talking, messages, paperwork. | Pick one document, message, or study task for Saturday's first action. | 108 Shani mantras, donate stationery/food, one hour without unnecessary messages. |
| Cancer | Kark | Emotional safety, home duty, family sensitivity. | Name one home duty and one trigger that should not control Saturday. | Sesame-oil lamp, Hanuman Chalisa, elder or family seva without complaint. |
| Leo | Singh | Ego, authority, recognition, pride in service. | Replace one need to be right with one responsibility. | Quiet seva, black til or mustard-oil daan, no public display of charity. |
| Virgo | Kanya | Worry, perfectionism, health routine, service fatigue. | Write one health routine, one cleanup, and one worry time slot. | Food/black urad/hygiene support, clean one neglected space. |
| Libra | Tula | Relationships, contracts, fairness, delayed decisions. | Review one promise or boundary that needs fair wording. | Donate clothing/footwear, truthful soft speech, repair one delayed agreement. |
| Scorpio | Vrishchik | Resentment, control, secrecy, fear, intensity. | Name one resentment to release and one control-reducing action. | Hanuman Chalisa, black sesame or food daan, no revenge speech. |
| Sagittarius | Dhanu | Belief, teachers, travel, law, optimism without discipline. | Pick one dharmic promise, study, legal document, or travel duty. | Sacred reading, black til or food daan, finish one duty before advising others. |
| Capricorn | Makar | Overwork, duty burden, career pressure, fatigue. | List the oldest duty, one work block, and one rest boundary. | Black urad/work essentials daan, respect workers, finish one duty without adding more. |
| Aquarius | Kumbh | Community duty, isolation, family speech, money structure. | Choose one community service and one family/money conversation. | Serve poor, elderly, disabled, or isolated people; food/black til/warm essentials daan. |
| Pisces | Meen | Emotional fog, sleep, escapism, faith, boundaries. | Set one sleep boundary, one prayer, and one avoided duty. | Hanuman Chalisa, Shani mantra, food/black til daan, avoid escapist habits. |

## Notification Cadence

| Day | Notification |
| --- | --- |
| Friday | Preview of tomorrow's Saturday remedy: preparation, daan/seva, mantra, caution. |
| Saturday | Same-day reminder to perform the remedy simply and without fear. |

Notifications are currently implemented as email through Resend and recorded in `shani_remedy_notifications`. The payload is channel-neutral so push or in-app delivery can be added later.
