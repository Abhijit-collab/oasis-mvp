import { NextResponse } from "next/server";

const CDN = "https://d38jpb447hexfu.cloudfront.net";

const FILES = {
  rera: {
    path: "documents/rera+certificate/",
    filename: "Rera Certificate",
  },
};

export const dynamic = "force-dynamic";

/** Same-origin download. A direct CDN link cannot force a save in the browser. */
export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  const file = FILES[id];
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const upstream = await fetch(`${CDN}/${file.path}`, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  }

  const type = upstream.headers.get("content-type") || "application/octet-stream";
  const headers = {
    "Content-Type": type.startsWith("application/x-directory") ? "application/octet-stream" : type,
    "Content-Disposition": `attachment; filename="${file.filename}"`,
    "Cache-Control": "no-store",
  };
  const length = upstream.headers.get("content-length");
  if (length) headers["Content-Length"] = length;

  return new NextResponse(upstream.body, { status: 200, headers });
}
