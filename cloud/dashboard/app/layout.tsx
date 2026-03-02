import { ReactNode } from "react";
import "./globals.css";
import "./page.css";
import { getSession } from "../lib/session";
import { SiteHeader } from "../components/site-header";

export default async function RootLayout(props: { children: ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <div className="orb orb-a" aria-hidden />
        <div className="orb orb-b" aria-hidden />

        <SiteHeader userEmail={session?.email} />

        <main className="page-shell">{props.children}</main>

        <footer className="site-footer">
            <div className="site-footer-inner">
                <div className="footer-brand">
                  <span style={{ fontWeight: 600, color: "var(--c-ink)" }}>CircleBox</span>
                  <span style={{ margin: "0 8px", color: "var(--c-border)" }}>|</span>
                  <span style={{ color: "var(--c-ink-soft)", fontSize: "0.9rem" }}>Native Flight Recorder</span>
                </div>
                <div className="footer-links">
                    <a href="/docs">Docs</a>
                    <a href="/pricing">Pricing</a>
                    <a href="https://github.com/circlebox">GitHub</a>
                    <a href="/privacy">Privacy</a>
                    <a href="/terms">Terms</a>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--c-ink-faint)" }}>
                  &copy; {new Date().getFullYear()} CircleBox
                </p>
            </div>
        </footer>
      </body>
    </html>
  );
}
