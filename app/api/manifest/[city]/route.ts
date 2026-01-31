import { NextRequest, NextResponse } from "next/server";
import { getCityBySlug } from "@/lib/data/cities";

// Standalone city manifest — no reference to global manifest
const THEME_COLOR = "#C9A227";
const BACKGROUND_COLOR = "#ffffff";

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
    short_name: city.name,
    description: "Premium city travel experiences",
    display: "standalone" as const,
    scope: `/city/${citySlug}/`,
    start_url: `/city/${citySlug}?standalone=true`,
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    orientation: "portrait" as const,
    icons: [
      { src: "/globe.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/window.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
