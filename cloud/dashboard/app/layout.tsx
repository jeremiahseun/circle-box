import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.DASHBOARD_PUBLIC_BASE_URL?.trim() || "https://circlebox.seunjeremiah.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CircleBox | Native Flight Recorder for Mobile SDKs",
    template: "%s | CircleBox",
  },
  description:
    "CircleBox captures pre-crash mobile context with fixed-memory ring buffers, crash-time persistence, and optional cloud triage.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CircleBox | Native Flight Recorder for Mobile SDKs",
    description:
      "Capture thermal, memory, lifecycle, connectivity, and crash-path context across iOS, Android, Flutter, and React Native.",
    url: siteUrl,
    siteName: "CircleBox",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CircleBox | Native Flight Recorder for Mobile SDKs",
    description:
      "Crash observability that starts before the crash.",
  },
};

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
              <a href="/login">Sign In</a>
            </nav>
          </div>
        </header>
        <main className="page-shell">{props.children}</main>
      </body>
    </html>
  );
}
