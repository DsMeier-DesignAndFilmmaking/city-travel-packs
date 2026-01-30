import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  // 1. Grab the slug from the query string (e.g., ?slug=tokyo)
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "City slug is required" }, { status: 400 });
  }

  try {
    // 2. Locate the cities.json file
    // Assumes cities.json is in your /data folder at the project root
    const jsonDirectory = path.join(process.cwd(), "data");
    const fileContents = await fs.readFile(jsonDirectory + "/cities.json", "utf8");
    
    // 3. Parse the full database
    const allCities = JSON.parse(fileContents);

    // 4. Find the specific city matching the slug
    // Note: This works whether your cities.json is an Array or an Object
    const cityData = Array.isArray(allCities) 
      ? allCities.find((c: any) => c.slug === slug)
      : allCities[slug];

    if (!cityData) {
      return NextResponse.json({ error: `City '${slug}' not found` }, { status: 404 });
    }

    // 5. Return the city data with long cache for offline storage
    return NextResponse.json(cityData, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("API Error reading cities.json:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}