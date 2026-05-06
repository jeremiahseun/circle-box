import type { CSSProperties } from "react";

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  radius?: string;
  style?: CSSProperties;
};

export function Skeleton({ width = "100%", height = 16, radius = "4px", style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        width,
        height,
        background: "linear-gradient(90deg, var(--c-border) 25%, var(--c-bg) 50%, var(--c-border) 75%)",
        backgroundSize: "200% 100%",
        borderRadius: radius,
        animation: "skeleton-shimmer 1.5s ease-in-out infinite",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ rows = 3, height = 80 }: { rows?: number; height?: number }) {
  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: "var(--radius-md)",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      height,
      boxSizing: "border-box",
    }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width={i === 0 ? "45%" : i === rows - 1 ? "30%" : "80%"} height={i === 0 ? 20 : 14} />
      ))}
    </div>
  );
}

export function SkeletonTable({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 24px", background: "var(--c-bg)", borderBottom: "1px solid var(--c-border)", display: "flex", gap: 24 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={80} height={12} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: "14px 24px", borderBottom: i < rows - 1 ? "1px solid var(--c-border)" : undefined, display: "flex", gap: 24, alignItems: "center" }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} width={j === 0 ? 120 : j === cols - 1 ? 60 : 90} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--c-border)", paddingBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton width={220} height={28} radius="6px" />
          <Skeleton width={180} height={14} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Skeleton width={130} height={38} radius="10px" />
          <Skeleton width={130} height={38} radius="10px" />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} rows={3} height={100} />
        ))}
      </div>

      {/* Action grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Skeleton width={120} height={20} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} rows={3} height={120} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonUsagePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Skeleton width={160} height={32} radius="8px" />
      <SkeletonCard rows={2} height={80} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[1, 2, 3].map(i => <SkeletonCard key={i} rows={3} height={90} />)}
      </div>
      {[1, 2, 3].map(i => <SkeletonCard key={i} rows={1} height={200} />)}
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCrashesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Skeleton width={140} height={32} radius="8px" />
      <SkeletonCard rows={2} height={90} />
      <SkeletonTable cols={4} rows={5} />
      <SkeletonTable cols={7} rows={8} />
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
