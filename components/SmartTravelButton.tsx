"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import { CoachMarkOverlay } from "@/components/CoachMarkOverlay";
import { AddToHomeScreenOverlay } from "@/components/AddToHomeScreenOverlay";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function shareUrlWithStandalone(): string {
  if (typeof window === "undefined") return "";
  const u = new URL(window.location.href);
  u.searchParams.set("mode", "standalone");
  return u.toString();
}

function setManifestForCity(citySlug: string): void {
  if (typeof document === "undefined") return;
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link) link.setAttribute("href", `/api/manifest/${encodeURIComponent(citySlug)}`);
}

export interface SmartTravelButtonProps {
  id: string;
  cityName: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SmartTravelButton({
  id,
  cityName,
  className = "",
  style,
}: SmartTravelButtonProps) {
  const isStandalone = useIsStandalone();
  const { state, progress, error, sync, isReady, removeOfflineData } = useOfflineSync();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    isReady(id).then((ok) => {
      if (!cancelled) {
        setReady(ok);
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, isReady]);

  useEffect(() => {
    if (state === "ready") {
      setReady(true);
      setChecking(false);
    }
  }, [state]);

  const registerSync = useCallback(() => {
    const sw = navigator.serviceWorker?.controller;
    if (sw) sw.postMessage({ type: "REGISTER_SYNC", id });
  }, [id]);

  const handleShare = useCallback(
    async (opts?: { openCoachMarkOnIOS?: boolean }) => {
      if (typeof navigator === "undefined" || !navigator.share) return;
      const url = shareUrlWithStandalone();
      if (opts?.openCoachMarkOnIOS && isIOS()) setCoachOpen(true);
      try {
        await navigator.share({
          title: `${cityName} Offline Travel Pack`,
          text: `Access your ${cityName} guides, maps, and hacks without data.`,
          url,
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.warn("Share failed:", e);
      }
    },
    [cityName]
  );

  const handleCheckForUpdates = useCallback(() => {
    setReady(false);
    sync(id, { onSyncFailed: registerSync });
  }, [id, sync, registerSync]);

  const handleRemoveOffline = useCallback(async () => {
    setRemoving(true);
    await removeOfflineData(id);
    setReady(false);
    setRemoving(false);
  }, [id, removeOfflineData]);

  const handleClick = useCallback(() => {
    const done = state === "ready" || ready;
    if (done && isStandalone) return; // standalone + done uses separate buttons

    if (done && !isStandalone) {
      if (isIOS()) {
        setCoachOpen(true);
        if (navigator.share) void handleShare({ openCoachMarkOnIOS: false });
        return;
      }
      if (navigator.share) {
        void handleShare();
        return;
      }
      setCoachOpen(true);
      return;
    }

    setManifestForCity(id);
    setReady(false);
    sync(id, { onSyncFailed: registerSync });
  }, [id, sync, state, ready, isStandalone, registerSync, handleShare, handleCheckForUpdates]);

  const syncing = state === "syncing";
  const done = state === "ready" || ready;
  const failed = state === "error";
  const disabled = checking || syncing;

  const isPremiumReady = done && !checking && !syncing;
  const premiumReadyClass =
    isPremiumReady &&
    "bg-gradient-to-r from-[#C9A227] via-[#b8860b] to-[#a67c1a] text-[#0f172a] shadow-[0_4px_20px_rgba(201,162,39,0.35)] hover:shadow-[0_6px_24px_rgba(201,162,39,0.4)] active:scale-[0.99]";

  const doneAndStandalone = done && isStandalone;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {doneAndStandalone ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={syncing}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
              style={style}
              aria-busy={syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
                  <span>{progress}%</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-5 shrink-0" aria-hidden />
                  <span>Check for Updates</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRemoveOffline}
              disabled={removing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-70"
              aria-busy={removing}
            >
              <Trash2 className="size-5 shrink-0" aria-hidden />
              <span>Remove Offline Data</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${syncing ? "animate-pulse" : ""} ${premiumReadyClass || ""} ${className}`}
            style={isPremiumReady ? undefined : style}
            aria-busy={checking || syncing}
            aria-live="polite"
          >
            {checking && (
              <>
                <Loader2 className="size-5 shrink-0 animate-spin text-zinc-400" aria-hidden />
                <span className="text-zinc-300">Checking Sync…</span>
              </>
            )}
            {!checking && syncing && (
              <>
                <span className="text-[#C9A227]" aria-hidden>⚡</span>
                <span className="animate-pulse text-zinc-100">
                  Saving {cityName}… {progress}%
                </span>
              </>
            )}
            {!checking && !syncing && done && (
              <>
                <span className="text-emerald-400" aria-hidden>✅</span>
                <span>Ready: Add to Home Screen</span>
              </>
            )}
            {!checking && !syncing && !done && failed && (
              <>
                <span className="text-amber-400" aria-hidden>↻</span>
                <span>Retry</span>
              </>
            )}
            {!checking && !syncing && !done && !failed && (
              <>
                <span className="text-[#C9A227]" aria-hidden>⚡</span>
                <span>Download {cityName}</span>
              </>
            )}
          </button>
        )}

        {syncing && (
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-gradient-to-r from-[#C9A227] to-[#a67c1a] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && (
          <p className="text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      {!isStandalone && isIOS() && (
        <AddToHomeScreenOverlay
          open={coachOpen}
          onClose={() => setCoachOpen(false)}
          cityName={cityName}
        />
      )}
      {!isStandalone && !isIOS() && (
        <CoachMarkOverlay open={coachOpen} onClose={() => setCoachOpen(false)} />
      )}
    </>
  );
}
