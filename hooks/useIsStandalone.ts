"use client";

import { useEffect, useState } from "react";

/**
 * Detects if the app is running in standalone mode (installed on home screen).
 * Uses navigator.standalone (iOS) and display-mode: standalone media query.
 */
export function useIsStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = window.navigator as Navigator & { standalone?: boolean };
    const check = (): boolean =>
      nav.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    setStandalone(check());

    const mql = window.matchMedia("(display-mode: standalone)");
    const listener = () => setStandalone(check());
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return standalone;
}
