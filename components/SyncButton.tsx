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

  // Check the actual cache storage for this specific environment
  useEffect(() => {
    let cancelled = false;
    const checkCache = async () => {
      const ok = await isReady(id);
      if (!cancelled) setReady(ok);
    };
    checkCache();
    // Re-check periodically or when state changes
    const interval = setInterval(checkCache, 3000);
    return () => { 
      cancelled = true; 
      clearInterval(interval);
    };
  }, [id, isReady, state]);

  const ensureCitySw = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return null;
    const swUrl = `/sw-${id}.js`; 
    const scope = `/city/${id}/`; 
    try {
      const reg = await navigator.serviceWorker.register(swUrl, { scope });
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
    updateManifest(id);
    await ensureCitySw();
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

    // If we are currently syncing, don't do anything
    if (state === "syncing") return;

    // We check the 'ready' state which reflects the CURRENT container's cache
    if (ready) {
      if (isStandalone) {
        // In standalone, 'Ready' means we can just treat this as an update trigger
        handleSync();
      } else {
        // In browser, 'Ready' means show the "Add to Home Screen" coach marks
        if (isMobile) setCoachOpen(true);
      }
      return;
    }

    // If not ready, trigger the initial sync
    handleSync();
  };

  const syncing = state === "syncing";
  const failed = state === "error";

  // LOGIC UPDATE: Even in standalone, if the cache is empty (ready === false), 
  // we show the primary "Download" button to force population.
  const showManagementUI = ready && isStandalone;

  return (
    <div className="flex flex-col gap-1 w-full">
      {showManagementUI ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={syncing}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-3 text-sm font-bold text-white transition disabled:opacity-70 ${className}`}
              style={style}
            >
              {syncing ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                  <span>Syncing {progress}%</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 shrink-0" />
                  <span>Update Pack</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRemoveOffline}
              disabled={removing || syncing}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="size-5 shrink-0" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={syncing}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold text-white transition ${className} ${syncing ? 'opacity-70' : ''}`}
          style={style}
        >
          {syncing ? (
            <>
              <Loader2 className="size-5 shrink-0 animate-spin" />
              <span>Downloading {progress}%</span>
            </>
          ) : ready ? (
            <>
              <Check className="size-5 shrink-0 text-emerald-400" />
              <span>Offline Ready</span>
            </>
          ) : failed ? (
            <>
              <RefreshCw className="size-5 shrink-0" />
              <span>Retry Download</span>
            </>
          ) : (
            <>
              <Download className="size-5 shrink-0" />
              <span>{isStandalone ? "Finish Offline Setup" : "Download for Offline"}</span>
            </>
          )}
        </button>
      )}

      {ready && !isStandalone && isMobile && (
        <p className="text-center text-[10px] mt-1 font-medium uppercase tracking-wider text-zinc-500">
          Ready • Tap to Install on Home Screen
        </p>
      )}

      {syncing && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {error && <p className="mt-1 text-center text-xs font-medium text-red-400">{error}</p>}

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