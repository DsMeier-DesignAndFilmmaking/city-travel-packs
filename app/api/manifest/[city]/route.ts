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
    description: `Premium travel guide for ${city.name}`,
    display: "standalone" as const,
    
    // 1. SCOPE LOCKDOWN
    // This restricts the PWA to only this city folder.
    // If the user tries to navigate to the main home page, 
    // it will open in a separate browser tab, keeping the app focused.
    scope: `/city/${citySlug}/`,
    
    // 2. START URL
    // Ensure this matches the scope exactly.
    start_url: `/city/${citySlug}/`, 
    
    // 3. THEME & VISUALS
    background_color: "#0f172a", // Matches your site's dark theme
    theme_color: "#C9A227",      // Matches your Gold theme
    orientation: "portrait" as const,
    
    // 4. CATEGORIES & PREFER_NATIVE
    // These hints help mobile OSs treat the web app more like a native app.
    categories: ["travel", "guide"],
    
    icons: [
      { 
        src: "/icons/default-192.png", 
        sizes: "192x192", 
        type: "image/png" as const,
        purpose: "any maskable" // Allows Android to shape the icon
      },
      { 
        src: "/icons/default-512.png", 
        sizes: "512x512", 
        type: "image/png" as const,
        purpose: "any" 
      },
    ],
  };

// inside /api/manifest/[city]/route.ts
return NextResponse.json(manifest, {
  headers: {
    "Content-Type": "application/manifest+json",
    // Lower max-age to 1 hour so changes propagate during testing
    "Cache-Control": "public, max-age=3600", 
  },
});
}
