import { NextRequest } from "next/server";
import { getCityBySlug } from "@/lib/data/cities";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const city = getCityBySlug(slug);
  if (!city) {
    return new Response("City not found", { status: 404 });
  }

  const json = JSON.stringify(city, null, 2);
  const filename = `city-travel-pack-${city.slug}.json`;

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
