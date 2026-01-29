"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Check, Loader2, Share2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

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
  const { state, progress, error, sync, isReady } = useOfflineSync();
  const [ready, setReady] = useState(false);

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

  const handleClick = useCallback(() => {
    const done = state === "ready" || ready;
    if (done && canShare) {
      void handleShare();
      return;
    }
    if (state !== "syncing") setReady(false);
    sync(id, { onSyncFailed: registerSync });
  }, [id, sync, state, registerSync, ready, handleShare]);

  const syncing = state === "syncing";
  const done = state === "ready" || ready;
  const failed = state === "error";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={syncing}
        className={className}
        style={style}
        aria-busy={syncing}
        aria-live="polite"
        title={
          done
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
            {canShare ? (
              <Share2 className="size-5 shrink-0" aria-hidden />
            ) : (
              <Check className="size-5 shrink-0" aria-hidden />
            )}
            <span>
              {canShare ? "Share / Add to Home Screen" : "Offline Ready"}
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
      {done && (
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
