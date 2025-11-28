"use client";

import { useEffect, useState } from "react";

interface ActivityBarProps {
  namespace: string;
  percentage: number;
  blobCount: number;
  isActive: boolean;
  activityHistory: number[];
}

const ActivityBar = ({
  namespace,
  percentage,
  blobCount,
  isActive,
  activityHistory,
}: ActivityBarProps) => {
  const [currentPercentage, setCurrentPercentage] = useState(percentage);
  const [glowing, setGlowing] = useState(false);

  // Animate percentage changes
  useEffect(() => {
    setCurrentPercentage(percentage);
    if (Math.abs(percentage - currentPercentage) > 5) {
      setGlowing(true);
      setTimeout(() => setGlowing(false), 500);
    }
  }, [percentage, currentPercentage]);

  // Generate bar segments (htop style)
  const segments = 30;
  const filledSegments = Math.round((currentPercentage / 100) * segments);

  // Color based on activity level - blue to coral gradient
  const getBarColor = (index: number, filled: number) => {
    if (index >= filled) return "bg-muted/30";
    const ratio = index / segments;
    if (ratio < 0.5) return "bg-primary";
    if (ratio < 0.75) return "bg-accent";
    return "bg-[hsl(35_90%_55%)]"; // amber
  };

  return (
    <div
      className={`p-3 rounded-lg transition-all duration-300 ${
        glowing ? "glow-green" : ""
      } ${isActive ? "glass" : "bg-muted/20"}`}
    >
      {/* Namespace label and stats */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? "bg-primary animate-pulse" : "bg-muted-foreground"
            }`}
          />
          <span className="font-mono text-sm text-foreground">{namespace}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span>{currentPercentage.toFixed(0)}%</span>
          <span className="text-accent">
            {blobCount.toLocaleString()} blobs
          </span>
        </div>
      </div>

      {/* Activity bar (htop style) */}
      <div className="flex gap-[2px] h-4 items-center">
        <span className="text-muted-foreground font-mono text-xs mr-1">[</span>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-3 w-1.5 rounded-sm transition-all duration-150 ${getBarColor(
              i,
              filledSegments
            )}`}
            style={{
              opacity: i < filledSegments ? 0.7 + (i / segments) * 0.3 : 0.3,
            }}
          />
        ))}
        <span className="text-muted-foreground font-mono text-xs ml-1">]</span>
      </div>

      {/* Mini sparkline showing history */}
      <div className="flex items-end gap-[1px] h-3 mt-2">
        {activityHistory.map((value, i) => (
          <div
            key={i}
            className="w-1.5 bg-primary/50 rounded-t-sm transition-all duration-300"
            style={{
              height: `${Math.max(2, (value / 100) * 12)}px`,
              opacity: 0.4 + (i / activityHistory.length) * 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ActivityBar;
