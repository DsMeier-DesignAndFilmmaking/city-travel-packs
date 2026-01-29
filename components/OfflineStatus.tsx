"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Subtle Live / Offline Mode indicator using navigator.onLine.
 */
export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors"
      role="status"
      aria-live="polite"
      aria-label={online ? "Live" : "Offline mode"}
      style={{
        borderColor: online ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
        backgroundColor: online ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
        color: online ? "rgb(34,197,94)" : "rgb(239,68,68)",
      }}
    >
      {online ? (
        <>
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <Wifi className="size-3 opacity-80" aria-hidden />
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff className="size-3" aria-hidden />
          <span>Offline Mode</span>
        </>
      )}
    </div>
  );
}
