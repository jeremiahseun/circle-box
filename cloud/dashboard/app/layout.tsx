import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="orb orb-a" aria-hidden />
        <div className="orb orb-b" aria-hidden />
        <header className="site-header">
          <div className="site-header-inner">
            <a href="/" className="brand">
              <span className="brand-mark">CB</span>
              <span>
                CircleBox
                <small>Native Flight Recorder for Mobile SDKs</small>
              </span>
            </a>
            <nav className="nav-links">
              <a href="/">Home</a>
              <a href="/docs">Docs</a>
              <a href="/pricing">Pricing</a>
              <a href="/app">Control Plane</a>
              <a href="/dashboard/crashes">Dashboard</a>
            </nav>
          </div>
        </header>
        <main className="page-shell">{props.children}</main>
      </body>
    </html>
  );
}
