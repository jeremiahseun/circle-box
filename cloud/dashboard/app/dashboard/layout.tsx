import type { ReactNode } from "react";

export default function DashboardLayout(props: { children: ReactNode }) {
  return (
    <section>
      <p style={{ marginTop: 0, marginBottom: 14, color: "var(--ink-soft)" }}>
        Dashboard access is admin-scoped and uses server-side data plane credentials.
      </p>
      {props.children}
    </section>
  );
}
