"use client";

import type { UsageRow } from "../../lib/control-plane";

type UsageChartProps = {
  rows: UsageRow[];
  metric: "reports_count" | "events_count" | "bytes_count";
  label: string;
  color?: string;
};

function formatMetric(value: number, metric: string): string {
  if (metric === "bytes_count") {
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)}KB`;
    return `${value}B`;
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function UsageChart({ rows, metric, label, color = "#10b981" }: UsageChartProps) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0", color: "var(--c-ink-faint)", fontSize: "0.9rem" }}>
        No data available for the selected period.
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  const values = sorted.map(r => r[metric] as number);
  const maxVal = Math.max(...values, 1);

  const chartWidth = 600;
  const chartHeight = 160;
  const padLeft = 48;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 36;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const n = sorted.length;
  const barGap = 3;
  const barW = Math.max(4, Math.floor((innerW - barGap * (n - 1)) / n));
  const step = n > 1 ? (innerW - barW) / (n - 1) : 0;

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(frac => ({
    y: padTop + innerH * (1 - frac),
    label: frac === 0 ? "0" : formatMetric(Math.round(maxVal * frac), metric),
  }));

  // Only show a subset of x-axis labels to avoid overlap
  const labelStep = n <= 7 ? 1 : n <= 14 ? 2 : n <= 21 ? 3 : 7;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`${label} over time`}
      >
        {/* Grid lines */}
        {gridLines.map(({ y, label: gl }) => (
          <g key={y}>
            <line
              x1={padLeft}
              y1={y}
              x2={chartWidth - padRight}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={gl === "0" ? undefined : "3 3"}
            />
            <text
              x={padLeft - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="#94a3b8"
              fontFamily="'JetBrains Mono', monospace"
            >
              {gl}
            </text>
          </g>
        ))}

        {/* Bars */}
        {sorted.map((row, i) => {
          const val = row[metric] as number;
          const barH = Math.max(2, (val / maxVal) * innerH);
          const x = padLeft + i * (step || barW + barGap);
          const y = padTop + innerH - barH;
          const showLabel = i % labelStep === 0 || i === n - 1;

          return (
            <g key={row.usage_date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={2}
                fill={color}
                fillOpacity={0.85}
              >
                <title>{`${formatDate(row.usage_date)}: ${formatMetric(val, metric)}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={chartHeight - padBottom + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#94a3b8"
                  fontFamily="'Inter', sans-serif"
                >
                  {formatDate(row.usage_date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
