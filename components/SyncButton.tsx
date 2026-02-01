"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Check, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import { updateManifest } from "@/lib/pwa-utils";

// Overlays
import { CoachMarkOverlay } from "@/components/CoachMarkOverlay";
import { AddToHomeScreenOverlay } from "@/components/AddToHomeScreenOverlay";

interface SyncButtonProps {
  id: string;
  cityName?: string;
  className?: string;
  style?: React.CSSProperties;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

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
  const [coachOpen, setCoachOpen] = useState(false);

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

  /**
   * CRITICAL: Register the City-Specific Service Worker with a trailing slash scope.
   * This ensures the SW intercepts requests for /city/[id]/ in Airplane Mode.
   */
  const ensureCitySw = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return null;
    
    // UPDATED: Now using the root-level path handled by our rewrite
    const swUrl = `/sw-${id}.js`; 
    const scope = `/city/${id}/`; 
    
    try {
      const reg = await navigator.serviceWorker.register(swUrl, { scope });
      
      // Optional: Log success to verify the fix
      console.log(`[PWA] Successfully registered ${id} scope:`, reg.scope);
  
      if (reg.installing || reg.waiting) {
        await new Promise<void>((resolve) => {
          const sw = reg.installing || reg.waiting;
          sw?.addEventListener('statechange', (e: any) => {
            if (e.target.state === 'activated') resolve();
          });
        });
      }
      return reg;
    } catch (err) {
      console.error("[SyncButton] SW Registration failed:", err);
      return null;
    }
  }, [id]);

  const handleSync = useCallback(async () => {
    setReady(false);
    // 1. Swap the manifest
    updateManifest(id);
    // 2. Lay the pipes (register SW with scope)
    await ensureCitySw();
    // 3. Start the sync
    sync(id);
  }, [id, ensureCitySw, sync]);

  const handleCheckForUpdates = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSync();
  };

  const handleRemoveOffline = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    await removeOfflineData(id);
    setReady(false);
    setRemoving(false);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isDone = state === "ready" || ready;
    
    // Always ensure manifest and SW are aligned on click
    updateManifest(id);
    await ensureCitySw();

    if (isDone && isStandalone) return;

    if (isDone && !isStandalone) {
      if (isMobile) setCoachOpen(true);
      return;
    }

    if (state !== "syncing") {
      handleSync();
    }
  };

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
        <button
          type="button"
          onClick={handleClick}
          disabled={syncing}
          className={`${className} cursor-pointer`}
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
              <span>Offline Ready</span>
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

      {done && !isStandalone && isMobile && (
        <p className="text-center text-[10px] leading-tight text-zinc-400">
          Tap to add to Home Screen
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

      {!isStandalone && isMobile && (
        <div onClick={(e) => e.stopPropagation()}>
          {isIOS() ? (
            <AddToHomeScreenOverlay
              open={coachOpen}
              onClose={() => setCoachOpen(false)}
              cityName={cityName || "City"}
            />
          ) : (
            <CoachMarkOverlay 
              open={coachOpen} 
              onClose={() => setCoachOpen(false)} 
            />
          )}
        </div>
      )}
    </div>
  );
}