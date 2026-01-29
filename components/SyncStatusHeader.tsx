"use client";

import { useEffect, useState, useCallback } from "react";

const CITY_PACK_COUNT = 10;
const READY_DISMISS_MS = 5000;

type SyncStatus = "idle" | "syncing" | "ready" | "ready_mini";

export function SyncStatusHeader() {
  const [status, setStatus] = useState<SyncStatus>("idle");

  const checkCaches = useCallback(async () => {
    if (typeof caches === "undefined") return;
    try {
      const keys = await caches.keys();
      const hasPrecache = keys.some(
        (k) => k.includes("precache") || k.includes("serwist") || k === "city-pack-json"
      );
      if (hasPrecache) setStatus((s) => (s === "idle" ? "ready" : s));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== "string") return;
      if (data.type === "PRECACHE_STARTED") setStatus("syncing");
      if (data.type === "PRECACHE_COMPLETE") setStatus("ready");
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    void navigator.serviceWorker.ready.then((reg) => {
      if (reg.active && navigator.serviceWorker.controller) {
        timeoutId = setTimeout(() => {
          setStatus((s) => (s === "idle" ? "ready" : s));
        }, 400);
      }
    });

    void checkCaches();

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkCaches]);

  useEffect(() => {
    if (status !== "ready") return;
    const t = setTimeout(() => setStatus("ready_mini"), READY_DISMISS_MS);
    return () => clearTimeout(t);
  }, [status]);

  if (status === "idle") return null;

  if (status === "ready_mini") {
    return (
      <div
        role="status"
        aria-label="10 cities offline ready"
        className="flex justify-center border-b border-white/5 bg-[#0f172a]/80 py-1.5 backdrop-blur-sm"
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400/90">
          <span aria-hidden>✅</span>
          <span>10 Cities Offline Ready</span>
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-[#C9A227]/20 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-4 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.25)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-xl items-center justify-center gap-2">
        {status === "syncing" && (
          <>
            <span className="text-[#C9A227]" aria-hidden>⚡</span>
            <span className="text-sm font-medium text-zinc-200">
              [ Optimizing {CITY_PACK_COUNT} cities for offline travel… ]
            </span>
          </>
        )}
        {status === "ready" && (
          <>
            <span className="text-emerald-400" aria-hidden>✅</span>
            <span className="text-sm font-semibold text-emerald-400/95">
              [ {CITY_PACK_COUNT} Cities Offline Ready ]
            </span>
          </>
        )}
      </div>
    </div>
  );
}
