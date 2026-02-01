"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface StatusProps {
  cityId: string;
}

export function OfflineStatusDebugger({ cityId }: StatusProps) {
  const [status, setStatus] = useState({
    manifest: false,
    sw: false,
    cache: false,
    scope: "",
  });
  const [loading, setLoading] = useState(true);

  const runChecks = async () => {
    if (typeof window === "undefined") return;

    // 1. Check Manifest
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const manifestOk = !!link?.href?.includes(`/api/manifest/${cityId}`);

    // 2. Check SW and Scope
    let swOk = false;
    let registeredScope = "None";
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const scopeSuffix = `/city/${cityId}/`;
      const reg = regs.find((r) => r.scope.endsWith(scopeSuffix));
      swOk = !!reg?.active;
      registeredScope = reg?.scope || "None";
    }

    // 3. Check Cache
    let cacheOk = false;
    if ('caches' in window) {
      const cacheName = `city-pack-${cityId}-v1`;
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      // Look for the main city page in the keys
      cacheOk = keys.some(req => req.url.includes(`/city/${cityId}`));
    }

    setStatus({ manifest: manifestOk, sw: swOk, cache: cacheOk, scope: registeredScope });
    setLoading(false);
  };

  useEffect(() => {
    const interval = setInterval(runChecks, 1000);
    return () => clearInterval(interval);
  }, [cityId]);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-72 rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <Activity className="size-3" />
          Offline Debugger
        </h3>
        {loading && <Loader2 className="size-3 animate-spin" />}
      </div>

      <div className="space-y-3">
        <StatusRow 
          label="Manifest Injected" 
          active={status.manifest} 
          detail={`/api/manifest/${cityId}.json`} 
        />
        <StatusRow 
          label="Service Worker" 
          active={status.sw} 
          detail={status.scope} 
        />
        <StatusRow 
          label="Cache Populated" 
          active={status.cache} 
          detail={`city-pack-${cityId}-v1`} 
        />
      </div>

      <div className="mt-4 text-[10px] text-zinc-400">
        All three must be <span className="text-emerald-500">Green</span> for Airplane Mode to work.
      </div>
    </div>
  );
}

function StatusRow({ label, active, detail }: { label: string; active: boolean; detail: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        {active ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <XCircle className="size-4 text-red-500" />
        )}
      </div>
      <div className="truncate text-[10px] font-mono text-zinc-400">
        {detail}
      </div>
    </div>
  );
}