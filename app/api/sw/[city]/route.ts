import { NextRequest, NextResponse } from "next/server";
import { getCityBySlug } from "@/lib/data/cities";
import { getCitySwScript } from "@/lib/city-sw-script";

/**
 * Dynamic city service worker endpoint at /api/sw/[city].js.
 * Does not reuse global SW logic.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  const raw = (await params).city;
  const citySlug = raw.endsWith(".js") ? raw.slice(0, -3) : raw;
  const city = getCityBySlug(citySlug);
  if (!city) {
    return new NextResponse("City not found", { status: 404 });
  }
  try {
    const script = getCitySwScript(citySlug);
    return new NextResponse(script, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Invalid city slug", { status: 400 });
  }
}
