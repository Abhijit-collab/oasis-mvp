import "server-only";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

function filename(key) {
  const parts = String(key).split("/");
  return parts[parts.length - 1] || key;
}

function isImageKey(key) {
  if (!key || key.endsWith("/")) return false;
  const ext = filename(key).split(".").pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function altFromFilename(name) {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[_+-]+/g, " ").replace(/\s+/g, " ").trim() || "Gallery image";
}

function cdnBase() {
  return (
    process.env.NEXT_PUBLIC_HOK_CDN_URL || "https://d38jpb447hexfu.cloudfront.net"
  ).replace(/\/$/, "");
}

function cdnUrl(key) {
  const path = String(key)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${cdnBase()}/${path}`;
}

async function listGallery(prefix) {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_READER_KEY_ID;
  const secretAccessKey = process.env.S3_READER_SECRET;
  if (!bucket || !region || !accessKeyId || !secretAccessKey || !prefix) {
    throw new Error("S3 gallery is not configured");
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const keys = [];
  let continuationToken;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of page.Contents || []) {
      if (isImageKey(item.Key)) keys.push(item.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  keys.sort((a, b) =>
    filename(a).localeCompare(filename(b), undefined, { numeric: true, sensitivity: "base" })
  );

  return keys.map((key) => ({
    key,
    src: cdnUrl(key),
    alt: altFromFilename(filename(key)),
  }));
}

/** Cached list of gallery images for an S3 prefix. Revalidates every 5 minutes. */
export const getS3Gallery = unstable_cache(listGallery, ["hok-s3-gallery"], {
  revalidate: 300,
});
