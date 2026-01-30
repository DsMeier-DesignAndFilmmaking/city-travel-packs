import { NextRequest, NextResponse } from "next/server";
import { getCityBySlug } from "@/lib/data/cities";

const THEME_COLOR = "#C9A227";
const BACKGROUND_COLOR = "#ffffff";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  const { cityId } = await params;
  const city = getCityBySlug(cityId);
  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const startUrl = `/city/${encodeURIComponent(cityId)}?source=pwa`;
  const name = `Travel Pack: ${city.name}`;
  const shortName = `Travel Pack: ${city.name}`.slice(0, 12);

  const manifest = {
    name,
    short_name: shortName,
    description: `Offline travel pack for ${city.name}, ${city.country}. Transit, etiquette, and emergency info.`,
    display: "standalone" as const,
    scope: "/",
    start_url: startUrl,
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    orientation: "portrait" as const,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
