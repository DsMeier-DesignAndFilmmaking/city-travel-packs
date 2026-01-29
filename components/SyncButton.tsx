"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface SyncButtonProps {
  /** City id (slug). */
  id: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SyncButton({
  id,
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

  const handleClick = useCallback(() => {
    if (state !== "syncing") setReady(false);
    sync(id, { onSyncFailed: registerSync });
  }, [id, sync, state, registerSync]);

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
      >
        {syncing ? (
          <>
            <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
            <span>{progress}%</span>
          </>
        ) : done ? (
          <>
            <Check className="size-5 shrink-0" aria-hidden />
            <span>Offline Ready</span>
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
