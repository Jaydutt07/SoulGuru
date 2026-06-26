import {
  normalizeSoulWisdomFeedback,
  submitSoulWisdomFeedback
} from "../src/backend/soulWisdomFeedbackService.js";

const checks = [];

await checkInvalidRating();
await checkUnconfiguredSupabase();
await checkStoredFeedback();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

async function checkInvalidRating() {
  await expectRejects(
    "Soul Guru feedback rejects unknown rating values",
    () => normalizeSoulWisdomFeedback({
      rating: "generic",
      readingDate: "2026-06-26",
      wisdom: "A real daily reading."
    }),
    (error) => error.statusCode === 400 && /accurate or missed/i.test(error.message)
  );
}

async function checkUnconfiguredSupabase() {
  const result = await submitSoulWisdomFeedback({
    user: feedbackUser(),
    rating: "missed",
    readingDate: "2026-06-26",
    wisdom: "The day asks for a simpler promise and a cleaner reply."
  }, {}, { supabase: null });

  pushCheck("Soul Guru feedback does not fake persistence without Supabase", [
    result.configured === false,
    result.stored === false,
    result.feedback.rating === "missed",
    result.feedback.readingDate === "2026-06-26"
  ].every(Boolean));
}

async function checkStoredFeedback() {
  const supabase = createFeedbackSupabase();
  const longReason = " ".repeat(4) + "felt accurate because the work message and body cue were specific ".repeat(6);
  const result = await submitSoulWisdomFeedback({
    user: feedbackUser(),
    rating: "accurate",
    readingDate: "2026-06-26",
    promptVersion: "soul-wisdom-v21",
    dailyReadingId: "123e4567-e89b-42d3-a456-426614174000",
    wisdom: "Asha, answer the work message after breakfast and close the notebook before the old worry starts taking the room.",
    reason: longReason
  }, {}, {
    supabase,
    upsertUserProfileId: async () => "123e4567-e89b-42d3-a456-426614174111"
  });

  const row = supabase.state.upserts[0]?.row || {};
  const rowText = JSON.stringify(row);
  pushCheck("Soul Guru feedback persists a privacy-safe daily tuning signal", [
    result.configured === true,
    result.stored === true,
    result.feedback.rating === "accurate",
    result.feedback.readingDate === "2026-06-26",
    supabase.state.upserts[0]?.table === "soul_wisdom_feedback",
    supabase.state.upserts[0]?.options?.onConflict === "user_key,reading_date,prompt_version",
    /^sgu_[a-f0-9]{32}$/.test(row.user_key),
    /^swr_[a-f0-9]{32}$/.test(row.reading_hash),
    row.reason.length === 180,
    row.user_profile_id === "123e4567-e89b-42d3-a456-426614174111",
    !rowText.includes(feedbackUser().phone),
    !rowText.includes(feedbackUser().email),
    !rowText.includes("answer the work message")
  ].every(Boolean));
}

function feedbackUser() {
  return {
    id: "feedback-user-1",
    name: "Asha Rao",
    phone: "+919000000001",
    email: "asha@example.com",
    birthDate: "1994-08-17",
    birthTime: "06:20"
  };
}

function createFeedbackSupabase() {
  const state = { upserts: [] };
  return {
    state,
    from(table) {
      return new FeedbackQuery(state, table);
    }
  };
}

function FeedbackQuery(state, table) {
  this.state = state;
  this.table = table;
  this.row = null;
  this.upsert = (row, options) => {
    this.row = row;
    this.state.upserts.push({ table: this.table, row, options });
    return this;
  };
  this.select = () => this;
  this.single = () => ({
    data: {
      id: "123e4567-e89b-42d3-a456-426614174222",
      rating: this.row.rating,
      reason: this.row.reason,
      reading_date: this.row.reading_date,
      prompt_version: this.row.prompt_version,
      created_at: "2026-06-26T00:00:00.000Z",
      updated_at: this.row.updated_at
    },
    error: null
  });
}

async function expectRejects(label, action, predicate) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, predicate(error));
  }
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Soul Guru feedback contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
