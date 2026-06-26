# SoulGuru Live AI Quality Report

Generated on 2026-06-26 from the local backend environment. This report records quality-gate evidence only; it does not include API keys, raw prompts, model secrets, or provider credentials.

## Commands

The live checks were run with a longer timeout so failures represent quality or provider behavior rather than a short local timeout:

```bash
OPENAI_TIMEOUT_MS=120000 OPENAI_MAX_RETRIES=2 npm run soul:quality:ai
OPENAI_TIMEOUT_MS=120000 OPENAI_MAX_RETRIES=2 npm run soul:daily:ai
OPENAI_TIMEOUT_MS=120000 OPENAI_MAX_RETRIES=2 npm run more-guidance:quality:ai
OPENAI_TIMEOUT_MS=120000 OPENAI_MAX_RETRIES=2 npm run astro:quality:ai
OPENAI_TIMEOUT_MS=120000 OPENAI_MAX_RETRIES=2 npm run shani:quality:ai
npm run soul:quality:ai -- --show-readings --case-set=base
```

## Results

| Surface | Live cases | Result | Max similarity | Attempts | Duration |
| --- | ---: | --- | ---: | --- | ---: |
| Soul Guru daily wisdom v21 | 5 | Pass | 0.16 | 4 cases first attempt, 1 case needed 3 attempts | 211.8s |
| Soul Guru live same-user daily variation v21 | 4 dates | Pass | 0.09 | 3 dates needed 3 attempts, 1 date needed 2 attempts | 321.9s |
| More Guidance paid reading | 5 | Pass | 0.14 | 3 cases first attempt, 2 cases needed 2 attempts | 147.7s |
| Astro Solves answers | 5 | Pass | 0.18 | All first attempt | 68.4s |
| Shani Pandit guidance | 5 | Pass | 0.20 | All first attempt | 45.3s |

## Product Notes

- Soul Guru live readings stayed under the 100-word cap and passed generic/repeated phrase checks after the v21 prompt update. The v21 pass also rejects repeated house phrases such as `the actual strain around`, `water and a slower breath`, and `give it a limit that can be checked`.
- Soul Guru live same-user daily variation now checks one profile across four dates, verifying that daily area, lunar mansion, tithi, and final wording change instead of repeating the same mentor card.
- More Guidance live readings passed paid overview diversity, word-count, concrete-cue, and no-astrology-leak checks.
- Astro Solves live answers passed root-cause, astrological relevance, solution usefulness, safety wording, and diversity checks.
- Shani Pandit live answers passed phase specificity, concrete seven-day practice, grounded caution, and diversity checks.

## Tuning Priorities

1. Reduce first-generation latency for Soul Guru and More Guidance. The quality repair loop is working, but one daily wisdom case still needed three attempts and two paid guidance cases needed two attempts.
2. Keep daily Supabase caching and generation locks enabled in production so successful readings are reused for the day and concurrent reloads do not multiply OpenAI calls.
3. Keep the five-minute client pending window and five-minute backend generation lock defaults for first reads, especially on mobile, because live daily wisdom and paid guidance can take more than two minutes in worst-case quality-repair runs.
4. Use `npm run soul:daily:ai` after any Soul Guru prompt or astrology-context change that could affect date-specific wording.
5. Keep the live AI gates out of every quick local loop. Run them intentionally before releases, after prompt changes, and after model/provider configuration changes.
