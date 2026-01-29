"use client";

import { useCallback, useEffect, useState } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { getCityPackMeta, getDownloadedIds } from "@/lib/city-pack-meta";
import type { UpdateBannerItem } from "@/components/UpdateBanner";
import { UpdateBanner } from "@/components/UpdateBanner";

const VERSION_CHECK = "/api/cities/version-check";

function registerSyncWithSW(id: string): void {
  const sw = navigator.serviceWorker?.controller;
  if (sw) sw.postMessage({ type: "REGISTER_SYNC", id });
}

export function UpdateCheckProvider({ children }: { children: React.ReactNode }) {
  const { sync, state } = useOfflineSync();
  const [updates, setUpdates] = useState<UpdateBannerItem[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdates = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch(VERSION_CHECK);
      if (!res.ok) return;
      const server = (await res.json()) as Record<
        string,
        { lastUpdated: string; name: string }
      >;
      const ids = await getDownloadedIds();
      const meta = await getCityPackMeta();
      const local = meta.lastUpdated ?? {};
      const list: UpdateBannerItem[] = [];
      for (const id of ids) {
        const s = server[id];
        if (!s) continue;
        const localTs = local[id];
        if (!localTs) continue;
        if (s.lastUpdated > localTs) list.push({ id, name: s.name });
      }
      setUpdates(list);
      setDismissed(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onOnline = () => {
      checkForUpdates();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [checkForUpdates]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    checkForUpdates();
  }, [checkForUpdates]);

  useEffect(() => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "RETRY_SYNC" && typeof d.id === "string") {
        sync(d.id, { onSyncFailed: () => registerSyncWithSW(d.id) });
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [sync]);

  const handleUpdate = useCallback(
    async (id: string) => {
      setUpdatingId(id);
      try {
        await sync(id, { onSyncFailed: () => registerSyncWithSW(id) });
        setUpdates((prev) => prev.filter((u) => u.id !== id));
      } finally {
        setUpdatingId(null);
      }
    },
    [sync]
  );

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setUpdates([]);
  }, []);

  const show = updates.length > 0 && !dismissed;

  return (
    <>
      {children}
      {show && (
        <UpdateBanner
          items={updates}
          onUpdate={handleUpdate}
          onDismiss={handleDismiss}
          updatingId={updatingId}
        />
      )}
    </>
  );
}
