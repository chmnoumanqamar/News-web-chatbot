import { NextResponse } from "next/server";

// Many news publishers (Al Jazeera especially, but others too) block
// hotlinked <img> requests that come straight from a browser on a
// different domain — the request has no matching Referer and gets
// rejected, so the <img> fires onError and the app falls back to the
// plain color placeholder.
//
// Fetching the image from our own server instead sidesteps that: the
// request looks like a normal server-to-server fetch rather than a
// browser hotlink, so it isn't blocked the same way. The browser then
// loads the image from us (same-origin), never touching the original
// host directly.

const ALLOWED_PROTOCOLS = ["http:", "https:"];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
  }

  // Some publishers' hotlink protection does the opposite of what you'd
  // expect: they reject requests with NO Referer at all, but accept one
  // that matches their own origin (as if the image were embedded on their
  // own site). Sending the image's own origin as Referer satisfies both
  // cases better than sending nothing.
  const ownOriginReferer = `${parsed.protocol}//${parsed.hostname}/`;

  // Without a timeout, a slow/hanging upstream host keeps this request
  // (and the browser's <img> waiting on it) open indefinitely instead of
  // failing fast into the onError -> placeholder fallback.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        // A normal browser UA — some publishers reject requests with no
        // (or a clearly non-browser) User-Agent as an anti-scraping measure.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: ownOriginReferer,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Upstream image fetch failed" },
        { status: upstream.status || 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Not an image" },
        { status: 415 }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: err?.name === "AbortError" ? "Upstream image timed out" : "Could not fetch image" },
      { status: 502 }
    );
  }
}