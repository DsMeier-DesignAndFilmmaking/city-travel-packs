"use client";

import { useCallback, useEffect } from "react";

export interface CoachMarkOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function CoachMarkOverlay({ open, onClose }: CoachMarkOverlayProps) {
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
      aria-labelledby="coachmark-title"
      aria-describedby="coachmark-desc"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-end"
    >
      {/* Clickable backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Animated arrow pointing down to Safari share */}
      <div
        className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+4rem)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        aria-hidden
      >
        <div className="animate-bounce-slow flex flex-col items-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white drop-shadow-[0_0_8px_rgba(201,162,39,0.6)]"
          >
            <path
              d="M12 5v14M12 19l-6-6M12 19l6-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#C9A227]"
            style={{ filter: "drop-shadow(0 0 6px rgba(201,162,39,0.5))" }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-t-2xl border-t border-[#C9A227]/30 bg-gradient-to-b from-[#1e293b] to-[#0f172a] px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px 32px_rgba(0,0,0,0.4)]"
      >
        <h2
          id="coachmark-title"
          className="mb-2 text-center text-lg font-semibold text-white"
        >
          Add to Home Screen
        </h2>
        <p
          id="coachmark-desc"
          className="mb-5 text-center text-sm leading-relaxed text-zinc-300"
        >
          Tap <span className="font-medium text-[#C9A227]">Share</span>, then{" "}
          <span className="font-medium text-[#C9A227]">&ldquo;Add to Home Screen&rdquo;</span>{" "}
          for 1-tap offline access.
        </p>
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
