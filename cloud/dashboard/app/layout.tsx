import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./page.css"; // Import the page-specific CSS

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
              <span className="brand-mark">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="brand-text">CircleBox</span>
            </a>

            <nav className="nav-links">
              <a href="/docs" className="nav-link">Documentation</a>
              <a href="/pricing" className="nav-link">Pricing</a>
              <div className="nav-divider" />
              <a href="/login" className="btn btn-sm">Sign In</a>
              <a href="/signup" className="btn btn-primary btn-sm">Get Started</a>
            </nav>
          </div>
        </header>

        <main className="page-shell">{props.children}</main>

        <footer className="site-footer">
            <div className="site-footer-inner">
                <p>&copy; {new Date().getFullYear()} CircleBox. All rights reserved.</p>
                <div className="footer-links">
                    <a href="/privacy">Privacy</a>
                    <a href="/terms">Terms</a>
                    <a href="https://github.com/circlebox">GitHub</a>
                </div>
            </div>
        </footer>
      </body>
    </html>
  );
}
