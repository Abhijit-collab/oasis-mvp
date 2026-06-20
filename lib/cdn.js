/**
 * CloudFront CDN for oasis-metro S3 bucket.
 * Distribution: E1RATK1DP7ZOSU
 * Override with NEXT_PUBLIC_CDN_URL in .env.local if needed.
 */
export const CDN_BASE =
  process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, "") ||
  "https://d3oolleolpstzj.cloudfront.net";

/** Build a public CloudFront URL from an S3 object key (e.g. "360-images/Main_Gate.png"). */
export const cdnUrl = (key) => `${CDN_BASE}/${String(key).replace(/^\//, "")}`;
