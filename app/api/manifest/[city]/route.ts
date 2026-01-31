import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: { city: string } }
) {
  const city = params.city

  return NextResponse.json({
    name: `Offline ${city} Travel Pack`,
    short_name: city,
    description: `Offline city travel pack for ${city}`,
    display: "standalone",
    start_url: `/city/${city}?source=pwa`,
    scope: `/city/${city}/`,
    background_color: "#ffffff",
    theme_color: "#C9A227",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  })
}
