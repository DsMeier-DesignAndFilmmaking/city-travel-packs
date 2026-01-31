"use client";

import { useEffect, useState } from "react";

/**
 * Detects offline state via navigator.onLine and online/offline events.
 * Lightweight client flag; no global store.
 */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const update = () => setOffline(!navigator.onLine);
    update();

    window.addEventListener("offline", update);
    window.addEventListener("online", update);
    return () => {
      window.removeEventListener("offline", update);
      window.removeEventListener("online", update);
    };
  }, []);

  return offline;
}
