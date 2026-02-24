"use client";

import { useMemo, useState } from "react";

type CrashDetailActionsProps = {
  reportId: string;
  projectId: string;
  region: "us" | "eu";
};

export default function CrashDetailActions(props: CrashDetailActionsProps) {
  const [status, setStatus] = useState<string | null>(null);

  const deepLink = useMemo(() => {
    return `/dashboard/crashes/${props.reportId}?project_id=${encodeURIComponent(props.projectId)}&region=${encodeURIComponent(props.region)}`;
  }, [props.projectId, props.region, props.reportId]);

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(message);
    } catch {
      setStatus("Copy failed");
    }
  }

  async function handleShare() {
    if (!("share" in navigator)) {
      setStatus("Web Share API not available");
      return;
    }

    const url = `${window.location.origin}${deepLink}`;
    try {
      await navigator.share({
        title: `CircleBox crash ${props.reportId}`,
        text: `Crash report ${props.reportId}`,
        url,
      });
      setStatus("Share completed");
    } catch {
      setStatus("Share cancelled");
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
      <button className="btn" type="button" onClick={() => copyText(props.reportId, "Report ID copied")}>
        Copy report ID
      </button>
      <button
        className="btn"
        type="button"
        onClick={() => {
          const absolute = `${window.location.origin}${deepLink}`;
          void copyText(absolute, "Deep link copied");
        }}
      >
        Copy deep link
      </button>
      <button className="btn" type="button" onClick={() => void handleShare()}>
        Share link
      </button>
      {status && <span style={{ color: "#0f766e" }}>{status}</span>}
    </div>
  );
}
