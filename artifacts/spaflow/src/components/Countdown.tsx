import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

function formatDuration(ms: number) {
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

interface CountdownProps {
  expiresAt: Date;
  className?: string;
}

export function Countdown({ expiresAt, className }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => expiresAt.getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(expiresAt.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isUrgent = remaining < 30 * 60 * 1000; // < 30 min
  const isExpired = remaining <= 0;

  return (
    <span
      data-testid="text-countdown"
      className={cn(
        "text-xs font-mono font-medium tabular-nums",
        isExpired ? "text-destructive" : isUrgent ? "text-amber-600" : "text-muted-foreground",
        className
      )}
    >
      {formatDuration(remaining)}
    </span>
  );
}
