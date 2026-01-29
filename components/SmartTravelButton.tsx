"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { CoachMarkOverlay } from "@/components/CoachMarkOverlay";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function shareUrl(): string {
  if (typeof window === "undefined") return "";
  const u = new URL(window.location.href);
  u.searchParams.set("mode", "standalone");
  return u.toString();
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
  const { state, progress, error, sync, isReady } = useOfflineSync();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

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

  const handleShare = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title: `${cityName} Offline Travel Pack`,
        text: `Access your ${cityName} guides, maps, and hacks without data.`,
        url: shareUrl(),
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.warn("Share failed:", e);
    }
  }, [cityName]);

  const handleClick = useCallback(() => {
    const done = state === "ready" || ready;

    if (done) {
      if (isIOS()) {
        setCoachOpen(true);
        return;
      }
      if (navigator.share) {
        void handleShare();
        return;
      }
      setCoachOpen(true);
      return;
    }

    setReady(false);
    sync(id, { onSyncFailed: registerSync });
  }, [id, sync, state, ready, registerSync, handleShare]);

  const syncing = state === "syncing";
  const done = state === "ready" || ready;
  const failed = state === "error";
  const disabled = checking || syncing;

  const isPremiumReady = done && !checking && !syncing;
  const premiumReadyClass =
    isPremiumReady &&
    "bg-gradient-to-r from-[#C9A227] via-[#b8860b] to-[#a67c1a] text-[#0f172a] shadow-[0_4px_20px_rgba(201,162,39,0.35)] hover:shadow-[0_6px_24px_rgba(201,162,39,0.4)] active:scale-[0.99]";

  return (
    <>
      <div className="flex flex-col gap-1.5">
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

      <CoachMarkOverlay open={coachOpen} onClose={() => setCoachOpen(false)} />
    </>
  );
}
