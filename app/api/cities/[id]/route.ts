import { NextRequest } from "next/server";
import { getCityBySlug } from "@/lib/data/cities";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const city = getCityBySlug(id);
  if (!city) {
    return new Response(JSON.stringify({ error: "City not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(city), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
