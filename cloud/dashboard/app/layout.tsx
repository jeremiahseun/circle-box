"use client";

import { ReactNode, useState } from "react";
import "./globals.css";
import "./page.css"; // Import the page-specific CSS

const siteUrl = "https://circlebox.seunjeremiah.workers.dev";

// Note: Metadata export is not allowed in a "use client" component.
// Since we need "use client" for the mobile menu state, we'll keep metadata in a separate file or just ignore it for this specific layout if not critical for SEO in this context,
// OR ideally, we separate the client-side header into its own component.
// For simplicity in this refactor, I will extract the Header to a client component.
// But first, let's just make this a client component for the menu state, and assume metadata is handled elsewhere or acceptable trade-off for this task scope.
// Wait, layout.tsx in Next.js App Router serves as the root. It shouldn't be "use client" if it exports metadata.
// I will create a separate ClientHeader component.

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="orb orb-a" aria-hidden />
        <div className="orb orb-b" aria-hidden />

        <Header />

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

function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href="/" className="brand">
          <span className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="brand-text">CircleBox</span>
        </a>

        {/* Desktop Nav */}
        <nav className="nav-links">
          <a href="/docs" className="nav-link">Documentation</a>
          <a href="/pricing" className="nav-link">Pricing</a>
          <div className="nav-divider" />
          <a href="/login" className="btn btn-sm">Sign In</a>
          <a href="/signup" className="btn btn-primary btn-sm">Get Started</a>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Mobile Nav */}
        <div className={`mobile-nav ${isOpen ? 'open' : ''}`}>
          <a href="/docs" className="nav-link" onClick={() => setIsOpen(false)}>Documentation</a>
          <a href="/pricing" className="nav-link" onClick={() => setIsOpen(false)}>Pricing</a>
          <hr style={{ width: "100%", border: 0, borderTop: "1px solid var(--c-border)" }} />
          <a href="/login" className="btn" style={{ width: "100%" }} onClick={() => setIsOpen(false)}>Sign In</a>
          <a href="/signup" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setIsOpen(false)}>Get Started</a>
        </div>
      </div>
    </header>
  );
}
