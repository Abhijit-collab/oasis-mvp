const ALLOWED = "https://d38jpb447hexfu.cloudfront.net/360-view/";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stream a 360 image from CloudFront so the viewer is not blocked on a cross-origin fetch. */
export async function GET(request) {
  const target = new URL(request.url).searchParams.get("u") || "";
  if (!target.startsWith(ALLOWED)) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(target, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Image unavailable", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "image/png");
  headers.set("Cache-Control", "private, max-age=3600");
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
