"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Lette, tema-tilpassede grafer i ren SVG – ingen eksterne pakker.
 * Alle bruger LifeOS' design-tokens (var(--primary) osv.) og animerer blødt
 * ind med Framer Motion, så dashboardet føles levende og interaktivt.
 */

// ───────────────────────────── Donut (cirkeldiagram) ─────────────────────
export type DonutSegment = { label: string; value: number; color: string };

export function DonutChart({
  data,
  size = 168,
  thickness = 18,
  centerValue,
  centerLabel,
}: {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue?: string | number;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Spor i baggrunden */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={thickness}
            opacity={0.5}
          />
          {total > 0 &&
            data.map((seg, i) => {
              const fraction = seg.value / total;
              const dash = fraction * circumference;
              const segOffset = offsetAcc;
              offsetAcc += dash;
              if (seg.value === 0) return null;
              return (
                <motion.circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  initial={{ strokeDashoffset: -circumference }}
                  animate={{ strokeDashoffset: -segOffset }}
                  transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-2xl font-semibold tabular-nums">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
          )}
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {seg.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────────── Vandrette bjælker ─────────────────────────
export type BarItem = {
  label: string;
  value: number;
  color?: string;
  emoji?: string;
};

export function BarList({
  items,
  unit,
}: {
  items: BarItem[];
  unit?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.label} className="group">
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              {item.emoji && <span aria-hidden>{item.emoji}</span>}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {item.value}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/60">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: item.color ?? "var(--primary)" }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────────── Område-graf (trend) ───────────────────────
export function AreaChart({
  points,
  color = "var(--primary)",
  height = 72,
  className,
}: {
  points: { label: string; value: number }[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const width = 100; // viewBox-bredde (skaleres responsivt)
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const stepX = n > 1 ? width / (n - 1) : width;
  const gradId = React.useId();

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - (p.value / max) * (height - 8) - 4,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill={`url(#${gradId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {points.map((p, i) => (
          <span key={i} className="tabular-nums">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── Fremskridtsring ───────────────────────────
export function ProgressRing({
  value,
  max,
  label,
  sublabel,
  color = "var(--primary)",
  size = 120,
  thickness = 12,
}: {
  value: number;
  max: number;
  label?: string;
  sublabel?: string;
  color?: string;
  size?: number;
  thickness?: number;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={thickness}
            opacity={0.5}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - fraction) }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && <span className="text-xl font-semibold tabular-nums">{label}</span>}
          {sublabel && (
            <span className="text-[11px] text-muted-foreground">{sublabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}
