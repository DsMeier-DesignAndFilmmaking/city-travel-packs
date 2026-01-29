"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { hasOfflineSlug, setOfflineSlug } from "@/lib/offline-store";

interface DownloadCityButtonProps {
  slug: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Download button that triggers "Pre-cache City" via SW message,
 * then downloads the city JSON. Shows "Available Offline" once sync is complete.
 */
export function DownloadCityButton({
  slug,
  className = "",
  style,
  children,
}: DownloadCityButtonProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "available" | "error">("idle");
  const [availableOffline, setAvailableOffline] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setAvailableOffline(hasOfflineSlug(slug));
    if (hasOfflineSlug(slug)) setStatus("available");
  }, [slug]);

  const handleClick = useCallback(async () => {
    if (!slug) return;
    if (availableOffline) {
      const a = document.createElement("a");
      a.href = `/api/download-city?slug=${encodeURIComponent(slug)}`;
      a.download = `city-travel-pack-${slug}.json`;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setStatus("pending");

    let precacheOk = false;
    const sw = navigator.serviceWorker?.controller;
    if (sw) {
      const channel = new MessageChannel();
      sw.postMessage({ type: "PRECACHE_CITY", slug }, [channel.port2]);
      try {
        await new Promise<void>((resolve, reject) => {
          channel.port1.onmessage = (e) => {
            const { ok, error } = e.data ?? {};
            if (ok) resolve();
            else reject(new Error(error ?? "Pre-cache failed"));
          };
        });
        setOfflineSlug(slug);
        setAvailableOffline(true);
        setStatus("available");
        precacheOk = true;
      } catch {
        setStatus("error");
      }
    }

    const a = document.createElement("a");
    a.href = `/api/download-city?slug=${encodeURIComponent(slug)}`;
    a.download = `city-travel-pack-${slug}.json`;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (!precacheOk && status !== "error") setStatus("idle");
  }, [slug, availableOffline, status]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "pending"}
      className={className}
      style={style}
      aria-busy={status === "pending"}
      aria-live="polite"
    >
      {children ?? (
        <>
          {status === "available" ? (
            <Check className="size-5 shrink-0" aria-hidden />
          ) : (
            <Download className="size-5 shrink-0" aria-hidden />
          )}
          {status === "pending"
            ? "Saving…"
            : status === "available"
              ? "Available Offline"
              : status === "error"
                ? "Retry"
                : "Download for Offline"}
        </>
      )}
    </button>
  );
}
