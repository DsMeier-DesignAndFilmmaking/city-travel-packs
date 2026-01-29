import { getAllCities } from "@/lib/data/cities";

export async function GET() {
  const cities = getAllCities();
  const payload: Record<string, { lastUpdated: string; name: string }> = {};
  for (const c of cities) {
    payload[c.id] = { lastUpdated: c.lastUpdated, name: c.name };
  }
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
}
