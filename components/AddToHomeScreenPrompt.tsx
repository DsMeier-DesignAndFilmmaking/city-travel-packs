"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Smartphone } from "lucide-react";

const DISMISS_KEY = "city-travel-packs-add-to-home-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const n = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (n.standalone === true) ||
    (document.referrer.includes("android-app://") ?? false)
  );
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function AddToHomeScreenPrompt() {
  const [installable, setInstallable] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<{ outcome: string }>;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored === "1") return;

    if (!isMobile() || isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      const ev = e as unknown as { prompt: () => Promise<{ outcome: string }> };
      setDeferredPrompt(ev);
      setInstallable(true);
      setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    dismiss();
  }, [deferredPrompt, dismiss]);

  if (!installable || dismissed) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-30 mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0f172a]/95 px-4 py-3 shadow-xl backdrop-blur-xl"
      role="dialog"
      aria-label="Add to Home Screen"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#C9A227]"
          style={{ backgroundColor: "rgba(201,162,39,0.15)" }}
        >
          <Smartphone className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">Add to Home Screen</p>
          <p className="mt-0.5 text-sm text-zinc-400">
            Install City Travel Packs for quick access and offline use.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-[#C9A227] px-3 py-1.5 text-sm font-medium text-[#0f172a] transition hover:opacity-90 active:scale-[0.98]"
            >
              Add
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
