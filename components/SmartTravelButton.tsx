"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useIsStandalone } from "@/hooks/useIsStandalone";
import { useCityInstallReady } from "@/hooks/useCityInstallReady";
import { CoachMarkOverlay } from "@/components/CoachMarkOverlay";
import { AddToHomeScreenOverlay } from "@/components/AddToHomeScreenOverlay";

/**
 * Detects if the user is on an iOS device.
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Simple check for mobile screens (typically < 768px).
 * This prevents mobile-specific "Tap Share" instructions from appearing on Desktop.
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

import { updateManifest } from "@/lib/pwa-utils";

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
  const isMobile = useIsMobile();
  const { state, progress, error, sync, isReady, removeOfflineData } = useOfflineSync();
  const { isCityInstallReady, recheck: recheckInstallReady } = useCityInstallReady(id);

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
    return () => { cancelled = true; };
  }, [id, isReady]);

  useEffect(() => {
    if (state === "ready") {
      setReady(true);
      setChecking(false);
    }
  }, [state]);

  useEffect(() => {
    if (state === "ready" || ready) void recheckInstallReady();
  }, [state, ready, recheckInstallReady]);

  // City page: always use city manifest so Add to Home Screen uses city start_url (Step 11).
  useEffect(() => {
    if ((state === "ready" || ready) && id) {
      updateManifest(id);
    }
  }, [id, state, ready]);

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
    const syncComplete = state === "ready" || ready;
    const isDone = syncComplete && isCityInstallReady;

    if (isDone && isStandalone) return;

    // Trigger Coach Marks ONLY on Mobile when install-ready (manifest + SW + cache).
    if (isDone && !isStandalone) {
      if (isMobile) {
        setCoachOpen(true);
      } else {
        console.log("Offline pack ready. Desktop save instructions coming soon.");
      }
      return;
    }

    updateManifest(id);
    setReady(false);
    sync(id, { onSyncFailed: registerSync });
  }, [id, sync, state, ready, isCityInstallReady, isStandalone, registerSync, isMobile]);

  const syncing = state === "syncing";
  const syncDone = state === "ready" || ready;
  const done = syncDone && isCityInstallReady;
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
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all duration-300 disabled:opacity-70 ${className}`}
              style={style}
            >
              {syncing ? (
                <>
                  <Loader2 className="size-5 shrink-0 animate-spin" />
                  <span>{progress}%</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-5 shrink-0" />
                  <span>Check for Updates</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRemoveOffline}
              disabled={removing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 font-semibold text-zinc-200 hover:bg-white/10"
            >
              <Trash2 className="size-5 shrink-0" />
              <span>Remove</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all duration-300 disabled:opacity-70 ${syncing ? "animate-pulse" : ""} ${premiumReadyClass || ""} ${className}`}
            style={isPremiumReady ? undefined : style}
          >
            {checking && (
              <>
                <Loader2 className="size-5 shrink-0 animate-spin text-zinc-400" />
                <span className="text-zinc-300">Checking Sync…</span>
              </>
            )}
            {!checking && syncing && (
              <>
                <span className="text-[#C9A227]">⚡</span>
                <span className="animate-pulse text-zinc-100">
                  Saving {cityName}… {progress}%
                </span>
              </>
            )}
            {!checking && !syncing && syncDone && !isCityInstallReady && (
              <>
                <span className="text-zinc-400">⏳</span>
                <span>Preparing install…</span>
              </>
            )}
            {!checking && !syncing && done && (
              <>
                <span className="text-emerald-400">✅</span>
                <span>{isMobile ? "Ready: Add to Home Screen" : "Ready for Offline"}</span>
              </>
            )}
            {!checking && !syncing && !done && failed && (
              <>
                <span className="text-amber-400">↻</span>
                <span>Retry Download</span>
              </>
            )}
            {!checking && !syncing && !done && !failed && (
              <>
                <span className="text-[#C9A227]">⚡</span>
                <span>Download {cityName}</span>
              </>
            )}
          </button>
        )}

        {syncing && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#C9A227] to-[#a67c1a] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <p className="text-center text-xs text-red-400">{error}</p>}
      </div>

      {/* Instructional Overlays Logic:
          - Only show if NOT in standalone mode
          - Only show if ON a mobile device
      */}
      {!isStandalone && isMobile && (
        <>
          {isIOS() ? (
            <AddToHomeScreenOverlay
              open={coachOpen}
              onClose={() => setCoachOpen(false)}
              cityName={cityName}
            />
          ) : (
            <CoachMarkOverlay 
              open={coachOpen} 
              onClose={() => setCoachOpen(false)} 
            />
          )}
        </>
      )}
    </>
  );
}