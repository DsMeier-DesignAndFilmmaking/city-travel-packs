"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Check, Loader2, Share2, RefreshCw, Trash2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useIsStandalone } from "@/hooks/useIsStandalone";

interface SyncButtonProps {
  /** City id (slug). */
  id: string;
  /** City display name for share sheet. */
  cityName?: string;
  className?: string;
  style?: React.CSSProperties;
}

const canShare = typeof navigator !== "undefined" && !!navigator.share;

export function SyncButton({
  id,
  cityName,
  className = "",
  style,
}: SyncButtonProps) {
  const isStandalone = useIsStandalone();
  const { state, progress, error, sync, isReady, removeOfflineData } = useOfflineSync();
  const [ready, setReady] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isReady(id).then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [id, isReady, state]);

  useEffect(() => {
    if (state === "ready") setReady(true);
  }, [state]);

  const registerSync = useCallback(() => {
    const sw = navigator.serviceWorker?.controller;
    if (sw) sw.postMessage({ type: "REGISTER_SYNC", id });
  }, [id]);

  const handleShare = useCallback(async () => {
    if (!canShare || typeof window === "undefined") return;
    try {
      await navigator.share({
        title: cityName ? `${cityName} – City Travel Pack` : "City Travel Pack",
        text: "Add to Home Screen for 1-tap offline access.",
        url: window.location.href,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.warn("Share failed:", err);
      }
    }
  }, [cityName]);

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
    if (done && canShare) {
      void handleShare();
      return;
    }
    if (state !== "syncing") setReady(false);
    sync(id, { onSyncFailed: registerSync });
  }, [id, sync, state, registerSync, ready, isStandalone, handleShare]);

  const syncing = state === "syncing";
  const done = state === "ready" || ready;
  const failed = state === "error";
  const doneAndStandalone = done && isStandalone;

  return (
    <div className="flex flex-col gap-1">
      {doneAndStandalone ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={syncing}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C9A227]/40 bg-[#C9A227]/10 px-3 py-1.5 text-sm font-medium transition disabled:opacity-70 ${className}`}
              style={style}
              aria-busy={syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  <span>{progress}%</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 shrink-0" aria-hidden />
                  <span>Check for Updates</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRemoveOffline}
              disabled={removing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-busy={removing}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={syncing}
          className={className}
          style={style}
          aria-busy={syncing}
          aria-live="polite"
          title={
            done && !isStandalone
              ? "Save to Home Screen for 1-tap offline access"
              : undefined
          }
        >
          {syncing ? (
            <>
              <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
              <span>{progress}%</span>
            </>
          ) : done ? (
            <>
              {canShare && !isStandalone ? (
                <Share2 className="size-5 shrink-0" aria-hidden />
              ) : (
                <Check className="size-5 shrink-0" aria-hidden />
              )}
              <span>
                {canShare && !isStandalone
                  ? "Share / Add to Home Screen"
                  : "Offline Ready"}
              </span>
            </>
          ) : failed ? (
            <>
              <Download className="size-5 shrink-0" aria-hidden />
              <span>Retry</span>
            </>
          ) : (
            <>
              <Download className="size-5 shrink-0" aria-hidden />
              <span>Download</span>
            </>
          )}
        </button>
      )}
      {done && !isStandalone && (
        <p className="text-center text-xs text-zinc-400" role="status">
          {canShare
            ? "Tap to share or add to Home Screen for 1-tap offline."
            : "City is cached. Save to Home Screen for 1-tap offline access."}
        </p>
      )}
      {syncing && (
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[#C9A227] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
