# SoulGuru Runtime UI QA Report

Generated on 2026-06-26 against the local in-app browser at `http://127.0.0.1:5173/`.

This report records runtime UI evidence only. It does not include API keys, OTPs, payment data, or production provider secrets.

## Environment

- App URL: `http://127.0.0.1:5173/`
- Browser tab title: `SoulGuru | Personal Daily Guidance`
- Test profile state: already logged in with a local preview profile
- Console warnings/errors during walkthrough: none observed

## Tab Walkthrough

| Surface | Runtime evidence |
| --- | --- |
| Soul Guru | Top navigation shows `Soul Guru`, `Astro Solves`, `Shani`, `#Numbers`, and `Harmony`. Default Soul Guru tab renders `Words of Wisdom`, `Save Advice`, and `More Guidance`. The displayed wisdom article was 90 words, under the 100-word cap. |
| More Guidance | `More Guidance` opens the subscription/detail page. Page shows `Soul Guru + Astro Solve`, `3 months of deeper guidance`, `3-month tracking`, `Deeper guidance map`, `Reading history`, `Saved advice`, and copy for 15 additional Astro Solves questions. |
| Astro Solves | Tab renders `Solution for everything`, a problem text area, `Get solution`, remaining-analysis count, and existing Root/Astrology/Solution result sections. |
| Shani | Tab label is capitalized `Shani`. Saade Sati page renders current status, years/months/days countdown only, remedy membership plans, and member guide map. |
| #Numbers | Tab renders `Numbers that Build Life` with Birth number, Life path, Name number, Lucky number, and Avoid cards. |
| Harmony | Tab renders `Love Guru`, partner name/date inputs, and `Check harmony`. With synthetic partner data, the form produced a compatibility result with score, match label, Moon rhythm, Sun expression, and Growth edge details. |
| Settings | Header settings opens profile details, phone/email, birth date/time/place, Astro Solves usage, More Guidance entitlement, and backend connection status. |

## Notes

- Harmony date entry was verified with user-like keystrokes in the browser. The first automation-only date fill did not enable the submit button until the date input committed through keystrokes.
- The browser tab was returned to the Soul Guru tab after QA.
- This runtime pass complements the existing contract gates and APK artifact checks; it is not a substitute for final production-provider readiness.
