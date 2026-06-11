/**
 * Google Apps Script: sync the "Units" sheet -> AWS Lambda -> DynamoDB.
 *
 * SETUP
 * 1. Open your Google Sheet. Extensions > Apps Script. Paste this file.
 * 2. Fill in FUNCTION_URL (the Lambda Function URL) and SYNC_SECRET (must match
 *    the Lambda's SYNC_SECRET env var) below.
 * 3. Your sheet tab must be named "Units" with a header row. First column header
 *    MUST be: unitId. Suggested columns:
 *
 *      unitId | status    | price     | area | beds | baths | facing
 *      101    | available | ₹1.26 Cr  | 1880 | 3    | 2     | East
 *      102    | sold      | ₹1.58 Cr  | 2300 | 4    | 3     | North-East
 *      ... (201, 202, 301, 302, 401, 402)
 *
 *    Only include the columns you want to control from the sheet; anything you
 *    omit keeps its value from data/building.js. `status` must be exactly
 *    "available" or "sold" (that's what drives the colors on the site).
 *
 * 4. Add a trigger so edits sync automatically:
 *    Triggers (clock icon) > Add Trigger > function: syncToAWS
 *      - Event source: From spreadsheet, Event type: On edit   (near-instant), OR
 *      - Time-driven, every 1 or 5 minutes                     (simplest/robust)
 *    NOTE: a *simple* onEdit(e) cannot call external URLs; you must add an
 *    INSTALLABLE trigger as above (it runs with your authorization).
 * 5. Run syncToAWS once manually to authorize the script.
 */

var FUNCTION_URL = "https://REPLACE_ME.lambda-url.us-east-1.on.aws/";
var SYNC_SECRET = "REPLACE_WITH_THE_SAME_SECRET_AS_LAMBDA";
var SHEET_NAME = "Units";

function syncToAWS() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found');

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return; // header only

  var headers = values.shift().map(function (h) {
    return String(h).trim();
  });

  var rows = values
    .filter(function (r) {
      return String(r[0]).trim() !== "";
    })
    .map(function (r) {
      var obj = {};
      headers.forEach(function (h, i) {
        if (!h) return;
        var v = r[i];
        if (typeof v === "string") v = v.trim();
        obj[h] = v;
      });
      obj.unitId = String(obj.unitId).trim();
      return obj;
    });

  var res = UrlFetchApp.fetch(FUNCTION_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-sync-secret": SYNC_SECRET },
    payload: JSON.stringify(rows),
    muteHttpExceptions: true,
  });

  Logger.log(res.getResponseCode() + " " + res.getContentText());
}
