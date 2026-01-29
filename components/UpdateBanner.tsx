"use client";

import { useCallback } from "react";
import { RefreshCw, X } from "lucide-react";

export interface UpdateBannerItem {
  id: string;
  name: string;
}

interface UpdateBannerProps {
  items: UpdateBannerItem[];
  onUpdate: (id: string) => void;
  onDismiss: () => void;
  updatingId: string | null;
}

export function UpdateBanner({
  items,
  onUpdate,
  onDismiss,
  updatingId,
}: UpdateBannerProps) {
  const handleUpdate = useCallback(
    (id: string) => {
      onUpdate(id);
    },
    [onUpdate]
  );

  if (items.length === 0) return null;

  const first = items[0];
  const label =
    items.length === 1
      ? `New travel hacks available for ${first.name}.`
      : `New travel hacks available for ${items.length} cities.`;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-xl rounded-2xl border border-[#C9A227]/30 bg-[#0f172a]/95 px-4 py-3 shadow-lg backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#C9A227]"
          style={{ backgroundColor: "rgba(201,162,39,0.15)" }}
        >
          <RefreshCw className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {items.map(({ id, name }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleUpdate(id)}
                disabled={updatingId !== null}
                className="rounded-lg bg-[#C9A227] px-3 py-1.5 text-sm font-medium text-[#0f172a] transition hover:opacity-90 disabled:opacity-50"
              >
                {updatingId === id ? "Updating…" : "Update Now"}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
