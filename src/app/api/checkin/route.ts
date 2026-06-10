import { NextResponse, NextRequest } from "next/server";

const APPS_SCRIPT_URL = (process.env.APPS_SCRIPT_URL ?? "").replace(/^['"]|['"]$/g, "");

// In-memory cache for live attendance stats to handle 500+ participants
let cachedStats: { checked_in: number; total_registered: number } | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000; // Cache stats for 5 seconds to reduce Apps Script load

export async function GET() {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ error: "APPS_SCRIPT_URL not configured" }, { status: 500 });
  }

  const now = Date.now();
  if (cachedStats && now - lastCacheTime < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, ...cachedStats });
  }

  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "GET_CHECKIN_STATS" }),
      redirect: "follow",
    });

    if (!upstream.ok) {
      throw new Error(`Upstream returned ${upstream.status}`);
    }

    const text = await upstream.text();
    const data = JSON.parse(text);

    if (data && data.success) {
      cachedStats = {
        checked_in: data.checked_in || 0,
        total_registered: data.total_registered || 0,
      };
      lastCacheTime = Date.now();
      return NextResponse.json({ success: true, ...cachedStats });
    }

    return NextResponse.json({ error: "Invalid data from Apps Script" }, { status: 502 });
  } catch (err: any) {
    console.error("[API Check-In Stats] Error fetching stats:", err);
    if (cachedStats) {
      return NextResponse.json({ success: true, ...cachedStats, stale: true });
    }
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ error: "APPS_SCRIPT_URL not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json({ success: false, error: "Email address is required" }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();

    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json({ success: false, error: "Please enter a valid email address" }, { status: 400 });
    }

    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "CHECK_IN",
        email,
      }),
      redirect: "follow",
    });

    if (!upstream.ok) {
      throw new Error(`Upstream returned status ${upstream.status}`);
    }

    const text = await upstream.text();
    const data = JSON.parse(text);

    // Invalidate cached stats
    cachedStats = null;
    lastCacheTime = 0;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[API Check-In Submit] Error submitting check-in:", err);
    return NextResponse.json({ success: false, error: "Failed to connect to verification server" }, { status: 502 });
  }
}
