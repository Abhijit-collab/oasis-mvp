/**
 * Server-only: load live unit rows (status, price, etc.) from DynamoDB.
 *
 * DynamoDB schema: partition key `Flat`, availability in `Availability`.
 * Rows are normalized to { unitId, status, ... } for the app.
 */

import { normalizeLiveUnits } from "@/lib/normalizeLiveUnit";

function awsConfig() {
  return {
    region:
      process.env.MY_AWS_REGION ||
      process.env.AWS_REGION ||
      "us-east-1",
    accessKeyId:
      process.env.MY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey:
      process.env.MY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
    table:
      process.env.UNITS_TABLE ||
      process.env.DYNAMODB_TABLE_NAME ||
      process.env.TABLE_NAME ||
      "oasis-units",
  };
}

async function fetchFromLambdaUrl(url) {
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeLiveUnits(data);
}

async function scanDynamoTable() {
  const { region, accessKeyId, secretAccessKey, table } = awsConfig();

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient, ScanCommand } = await import("@aws-sdk/lib-dynamodb");

  const ddb = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  );

  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddb.send(new ScanCommand({ TableName: table, ExclusiveStartKey }));
    items.push(...(res.Items || []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return normalizeLiveUnits(items);
}

export async function getLiveUnits() {
  const url = process.env.UNITS_API_URL;
  if (url) {
    try {
      const fromLambda = await fetchFromLambdaUrl(url);
      if (fromLambda) return fromLambda;
    } catch {
      // fall through to DynamoDB or static data
    }
  }

  try {
    return await scanDynamoTable();
  } catch {
    return null;
  }
}
