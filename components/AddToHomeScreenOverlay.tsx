"use client";

import { useCallback, useEffect, useState } from "react";

export interface AddToHomeScreenOverlayProps {
  open: boolean;
  onClose: () => void;
  cityName?: string;
}

/**
 * Safari Share icon (iOS) – square with arrow pointing up.
 * Renders a high-visibility pointer to the Share button in the Safari toolbar.
 */
function SafariShareIcon({ highlighted = true }: { highlighted?: boolean }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={highlighted ? "drop-shadow-[0_0_12px_rgba(201,162,39,0.8)]" : ""}
      aria-hidden
    >
      <rect
        x="8"
        y="8"
        width="32"
        height="32"
        rx="8"
        fill={highlighted ? "#C9A227" : "#374151"}
        stroke={highlighted ? "#e5b84a" : "#4b5563"}
        strokeWidth="2"
      />
      <path
        d="M24 18v16M24 18l-5 5M24 18l5 5"
        stroke={highlighted ? "#0f172a" : "#9ca3af"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Simplified Safari toolbar mockup: address bar + Share button highlighted.
 */
function SafariToolbarMockup() {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-[#1e293b] px-4 py-3 shadow-xl"
      aria-hidden
    >
      <div className="h-8 flex-1 rounded-lg bg-white/10" />
      <div className="flex flex-col items-center gap-0.5">
        <SafariShareIcon highlighted />
        <span className="text-[10px] font-medium text-[#C9A227]">Share</span>
      </div>
    </div>
  );
}

export function AddToHomeScreenOverlay({
  open,
  onClose,
  cityName = "this city",
}: AddToHomeScreenOverlayProps) {
  const [showWhy, setShowWhy] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (open && (e.key === "Escape" || e.key === "Enter")) {
        e.preventDefault();
        onClose();
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ath-overlay-title"
      aria-describedby="ath-overlay-desc"
      /* We keep the container fixed and at the top z-index */
      className="fixed inset-0 z-[100] flex flex-col items-center justify-end"
    >
      {/* FIXED BACKDROP: 
          Changed bg-black/70 to bg-black/20 
          Reduced blur slightly for better performance/clarity on the Home Page
      */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-black/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* High-visibility pointer: arrow + "Tap Share" */}
      <div
        className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        aria-hidden
      >
        <p className="rounded-full bg-[#C9A227] px-4 py-1.5 text-sm font-bold text-[#0f172a] shadow-lg">
          Tap the Share icon below
        </p>
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          className="animate-bounce text-[#C9A227] drop-shadow-[0_0_12px_rgba(201,162,39,0.8)]"
        >
          <path
            d="M12 4v16M12 20l-6-6M12 20l6-6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Card with Safari toolbar mockup + instructions */}
      <div
        className="relative z-10 w-full max-w-md rounded-t-2xl border-t border-[#C9A227]/30 bg-gradient-to-b from-[#1e293b] to-[#0f172a] px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px 32px_rgba(0,0,0,0.6)]"
      >
        <h2
          id="ath-overlay-title"
          className="mb-2 text-center text-lg font-semibold text-white"
        >
          Add to Home Screen
        </h2>
        
        {/* Instruction Text */}
        <p
          id="ath-overlay-desc"
          className="mb-4 text-center text-sm leading-relaxed text-zinc-300"
        >
          Tap <span className="font-semibold text-[#C9A227]">Share</span> in the
          Safari toolbar (bottom), then choose{" "}
          <span className="font-semibold text-[#C9A227]">
            &ldquo;Add to Home Screen&rdquo;
          </span>
          .
        </p>

        <div className="mb-4 flex justify-center">
          <SafariToolbarMockup />
        </div>

        {/* Why Tooltip */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="text-center text-xs font-medium text-zinc-400 underline decoration-zinc-500 underline-offset-2 hover:text-zinc-300"
          >
            Why am I doing this?
          </button>
          {showWhy && (
            <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-zinc-400">
              Adding to Home Screen gives you <strong className="text-zinc-300">100% offline access</strong> to the{" "}
              {cityName} travel pack.
            </p>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-gradient-to-r from-[#C9A227] to-[#a67c1a] py-3.5 font-semibold text-[#0f172a] shadow-lg shadow-[#C9A227]/25 transition hover:opacity-95 active:scale-[0.99]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}