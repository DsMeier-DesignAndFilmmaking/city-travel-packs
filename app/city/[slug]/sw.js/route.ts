import { NextRequest, NextResponse } from "next/server";
import { getCityBySlug } from "@/lib/data/cities";
import { getCitySwScript } from "@/lib/city-sw-script";

/**
 * Serves the city service worker at /city/[slug]/sw.js so registration
 * with scope /city/[slug]/ is valid (scope must be under script URL).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) {
    return new NextResponse("City not found", { status: 404 });
  }
  try {
    const script = getCitySwScript(slug);
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
