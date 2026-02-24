import type { ReactNode } from "react";

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui" }}>
        <div style={{ padding: 24, background: "#ecfeff", borderBottom: "1px solid #99f6e4" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>CircleBox Cloud</h1>
          <p style={{ margin: "8px 0 0", color: "#0f766e" }}>Phase 3A Timeline-First Dashboard</p>
        </div>
        <main style={{ padding: 24 }}>{props.children}</main>
      </body>
    </html>
  );
}
