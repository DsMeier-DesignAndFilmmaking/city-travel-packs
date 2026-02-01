import { NextRequest, NextResponse } from "next/server";
import { getCityBySlug } from "@/lib/data/cities";
import { getCitySwScript } from "@/lib/city-sw-script";

/**
 * Dynamic city service worker endpoint.
 * Now includes the Service-Worker-Allowed header to support cross-directory scoping.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  const { city: raw } = await params;
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
        // CRITICAL: This header allows the SW to control a scope outside its own folder.
        // Even with the Root Rewrite in next.config.ts, this is the safest way to
        // bypass "max scope allowed" browser errors.
        "Service-Worker-Allowed": "/",
        // Reduced max-age to ensure updates to the script are picked up faster during development
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error(`[SW API] Error generating script for ${citySlug}:`, err);
    return new NextResponse("Invalid city slug", { status: 400 });
  }
}