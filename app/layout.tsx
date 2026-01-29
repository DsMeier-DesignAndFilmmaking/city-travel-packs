import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OfflineStatus } from "@/components/OfflineStatus";
import { AddToHomeScreenPrompt } from "@/components/AddToHomeScreenPrompt";
import { UpdateCheckProvider } from "@/components/UpdateCheckProvider";
import { PWABridge } from "@/components/PWABridge";
import { GlobalSyncStatusBar } from "@/components/GlobalSyncStatusBar";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "City Travel Packs",
  description: "Premium city travel experiences",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#C9A227",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ServiceWorkerRegistrar />
        <PWABridge />
        <UpdateCheckProvider>
          <GlobalSyncStatusBar />
          <div className="fixed top-4 right-4 z-50 md:top-5 md:right-5">
            <OfflineStatus />
          </div>
          {children}
          <AddToHomeScreenPrompt />
        </UpdateCheckProvider>
      </body>
    </html>
  );
}
