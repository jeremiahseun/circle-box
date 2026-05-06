import { SkeletonCard, SkeletonTable, Skeleton } from "../../../../../../components/ui/skeleton";

export default function CrashDetailLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Skeleton width={140} height={32} radius="8px" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Skeleton width={280} height={28} />
        <Skeleton width={200} height={16} />
      </div>
      <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "14px 16px" }}>
        <Skeleton width={240} height={18} style={{ background: "#fca5a5" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SkeletonCard rows={5} height={180} />
        <SkeletonCard rows={5} height={180} />
      </div>
      <SkeletonCard rows={2} height={100} />
      <SkeletonTable cols={6} rows={12} />
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
