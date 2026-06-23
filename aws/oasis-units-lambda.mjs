// AWS Lambda handler for The Oasis unit data (Node.js 20.x runtime).
//
// Deploy with a Lambda Function URL (Auth type: NONE) so the Next.js site can
// read it publicly. Writes are protected by a shared secret header.
//
//   GET  /  -> returns all units as a JSON array (used by the website)
//   POST /  -> upserts units into DynamoDB (used by the Google Sheets sync).
//              Requires header  x-sync-secret: <SYNC_SECRET>
//
// Environment variables:
//   TABLE_NAME   (default "OasisUnits")  - DynamoDB table, partition key: Flat (String)
//   SYNC_SECRET                          - shared secret the Apps Script must send on POST
//
// The @aws-sdk/* packages are bundled with the Node.js 20 Lambda runtime,
// so no extra dependencies are needed.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE = process.env.TABLE_NAME || "OasisUnits";
const SYNC_SECRET = process.env.SYNC_SECRET;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,x-sync-secret",
  "content-type": "application/json",
};

const json = (statusCode, body) => ({
  statusCode,
  headers: CORS,
  body: JSON.stringify(body),
});

const NUMERIC_FIELDS = new Set(["bedroomscount", "beds", "baths", "area"]);

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === "" || v === null || v === undefined) continue;
    out[k] = NUMERIC_FIELDS.has(k) ? Number(v) : v;
  }
  if (!out.Flat && out.unitId) out.Flat = String(out.unitId).trim();
  if (!out.unitId && out.Flat) out.unitId = String(out.Flat).trim();
  return out;
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || "GET";

  if (method === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  try {
    if (method === "GET") {
      const items = [];
      let ExclusiveStartKey;
      do {
        const res = await ddb.send(
          new ScanCommand({ TableName: TABLE, ExclusiveStartKey })
        );
        items.push(...(res.Items || []));
        ExclusiveStartKey = res.LastEvaluatedKey;
      } while (ExclusiveStartKey);
      return json(200, items);
    }

    if (method === "POST") {
      const secret = event.headers?.["x-sync-secret"] || event.headers?.["X-Sync-Secret"];
      if (!SYNC_SECRET || secret !== SYNC_SECRET) {
        return json(401, { error: "unauthorized" });
      }

      const payload = JSON.parse(event.body || "[]");
      const rows = (Array.isArray(payload) ? payload : [])
        .filter((r) => r && (r.Flat || r.unitId))
        .map(normalizeRow);

      // DynamoDB BatchWrite handles max 25 items per request.
      for (let i = 0; i < rows.length; i += 25) {
        const chunk = rows.slice(i, i + 25);
        await ddb.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE]: chunk.map((Item) => ({ PutRequest: { Item } })),
            },
          })
        );
      }

      return json(200, { updated: rows.length });
    }

    return json(405, { error: "method not allowed" });
  } catch (err) {
    return json(500, { error: String(err?.message || err) });
  }
};
