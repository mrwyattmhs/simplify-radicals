/**
 * Prime Pairs — leaderboard backend.
 *
 * SETUP
 * 1. Create a blank Google Sheet. Keep it private — do not share it.
 * 2. Extensions → Apps Script.
 * 3. Delete the placeholder code, paste this whole file in.
 * 4. Deploy → New deployment → type: Web app.
 *      Execute as:  Me
 *      Who has access:  Anyone
 * 5. Click Deploy, authorize it (click through the "unverified app" warning —
 *    it's your own script, that warning is normal for personal projects).
 * 6. Copy the Web App URL it gives you.
 * 7. Paste that URL into LEADERBOARD_URL near the top of app.js.
 *
 * The script creates its own "Scores" tab in the Sheet the first time it
 * runs, with columns: timestamp | mode | score. You never touch the Sheet
 * by hand except to look at it or clear it out.
 *
 * Scores are anonymous — no name, no identifying info is stored or sent.
 */

const SHEET_NAME = 'Scores';
const VALID_MODES = ['advanced', 'extreme'];
const TOP_N = 10;
const MAX_REASONABLE_SCORE = 90; // sanity cap — 90s sprint, ~1 solve/sec is already absurd

function doGet(e) {
  const mode = String((e.parameter && e.parameter.mode) || '').toLowerCase();
  if (!VALID_MODES.includes(mode)) {
    return jsonOut({ error: 'invalid mode' });
  }
  return jsonOut({ mode: mode, scores: getTopScores(mode) });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ error: 'bad request' });
  }

  const mode = String(body.mode || '').toLowerCase();
  const score = Math.floor(Number(body.score));

  if (!VALID_MODES.includes(mode)) return jsonOut({ error: 'invalid mode' });
  if (!Number.isFinite(score) || score < 0 || score > MAX_REASONABLE_SCORE) {
    return jsonOut({ error: 'invalid score' });
  }

  getSheet().appendRow([new Date(), mode, score]);
  return jsonOut({ ok: true, scores: getTopScores(mode) });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['timestamp', 'mode', 'score']);
  }
  return sheet;
}

function getTopScores(mode) {
  const values = getSheet().getDataRange().getValues();
  const scores = values
    .slice(1) // skip header row
    .filter((row) => String(row[1]).toLowerCase() === mode)
    .map((row) => Number(row[2]))
    .filter((n) => Number.isFinite(n));
  scores.sort((a, b) => b - a);
  return scores.slice(0, TOP_N);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
