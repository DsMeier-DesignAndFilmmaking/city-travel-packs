import { NextRequest, NextResponse } from "next/server";
import { getCityBySlug } from "@/lib/data/cities";

/**
 * City-scoped PWA manifest. Uses default icons; scope and start_url without query params (STEP B).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  const raw = (await params).city;
  const citySlug = raw.endsWith(".json") ? raw.slice(0, -5) : raw;
  const city = getCityBySlug(citySlug);

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const manifest = {
    name: `${city.name} Travel Pack`,
    short_name: `${city.name} Pack`,
    description: "Premium city travel experiences",
    display: "standalone" as const,
    scope: `/city/${citySlug}/`,
    start_url: `/city/${citySlug}/`,
    background_color: "#ffffff",
    theme_color: "#C9A227",
    orientation: "portrait" as const,
    icons: [
      { src: "/icons/default-192.png", sizes: "192x192", type: "image/png" as const },
      { src: "/icons/default-512.png", sizes: "512x512", type: "image/png" as const },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
