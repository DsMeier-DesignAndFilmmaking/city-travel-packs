"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Check, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useIsStandalone } from "@/hooks/useIsStandalone";

interface SyncButtonProps {
  /** City id (slug). */
  id: string;
  /** City display name. */
  cityName?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Mobile detection hook to hide "Add to Home Screen" instructions on Desktop.
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export function SyncButton({
  id,
  cityName,
  className = "",
  style,
}: SyncButtonProps) {
  const isStandalone = useIsStandalone();
  const isMobile = useIsMobile();
  const { state, progress, error, sync, isReady, removeOfflineData } = useOfflineSync();
  
  const [ready, setReady] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isReady(id).then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => { cancelled = true; };
  }, [id, isReady, state]);

  useEffect(() => {
    if (state === "ready") setReady(true);
  }, [state]);

  const registerSync = useCallback(() => {
    const sw = navigator.serviceWorker?.controller;
    if (sw) sw.postMessage({ type: "REGISTER_SYNC", id });
  }, [id]);

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
    
    // If installed and done, we don't handle clicks here (handled by View A)
    if (done && isStandalone) return;

    // If done but in browser, clicking does nothing or could trigger your 
    // instructional overlay if you choose to import it here as well.
    if (done && !isStandalone) return;

    if (state !== "syncing") setReady(false);
    sync(id, { onSyncFailed: registerSync });
  }, [id, sync, state, registerSync, ready, isStandalone]);

  const syncing = state === "syncing";
  const done = state === "ready" || ready;
  const failed = state === "error";
  const doneAndStandalone = done && isStandalone;

  return (
    <div className="flex flex-col gap-1">
      {doneAndStandalone ? (
        /* VIEW A: Installed App State */
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={syncing}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C9A227]/40 bg-[#C9A227]/10 px-3 py-1.5 text-sm font-medium transition disabled:opacity-70 ${className}`}
              style={style}
            >
              {syncing ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                  <span>{progress}%</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 shrink-0" />
                  <span>Update</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRemoveOffline}
              disabled={removing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <Trash2 className="size-4 shrink-0" />
            </button>
          </div>
        </div>
      ) : (
        /* VIEW B: Browser State */
        <button
          type="button"
          onClick={handleClick}
          disabled={syncing}
          className={className}
          style={style}
          aria-busy={syncing}
        >
          {syncing ? (
            <>
              <Loader2 className="size-5 shrink-0 animate-spin" />
              <span>{progress}%</span>
            </>
          ) : done ? (
            <>
              <Check className="size-5 shrink-0 text-emerald-500" />
              <span>
                {isMobile ? "Add to Home Screen" : "Offline Ready"}
              </span>
            </>
          ) : failed ? (
            <>
              <Download className="size-5 shrink-0" />
              <span>Retry</span>
            </>
          ) : (
            <>
              <Download className="size-5 shrink-0" />
              <span>Download</span>
            </>
          )}
        </button>
      )}

      {/* Instructional Helper Text: Only show on Mobile */}
      {done && !isStandalone && isMobile && (
        <p className="text-center text-[10px] leading-tight text-zinc-400" role="status">
          Tap to add to Home Screen for offline access.
        </p>
      )}

      {syncing && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full bg-[#C9A227] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}