import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Premium glassmorphism card. Use on dark/slate backgrounds for best effect.
 */
export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl " +
        "dark:border-white/10 dark:bg-white/[0.07] " +
        className
      }
    >
      {children}
    </div>
  );
}
