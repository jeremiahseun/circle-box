"use client";

import { useState } from "react";

type SiteHeaderProps = {
  userEmail?: string | null;
};

export function SiteHeader({ userEmail }: SiteHeaderProps) {
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

          {userEmail ? (
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <a href="/dashboard" className="btn btn-primary btn-sm">Dashboard</a>
            </div>
          ) : (
            <>
                <a href="/login" className="btn btn-sm">Sign In</a>
                <a href="/signup" className="btn btn-primary btn-sm">Get Started</a>
            </>
          )}
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

          {userEmail ? (
              <a href="/dashboard" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setIsOpen(false)}>Dashboard</a>
          ) : (
              <>
                <a href="/login" className="btn" style={{ width: "100%" }} onClick={() => setIsOpen(false)}>Sign In</a>
                <a href="/signup" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setIsOpen(false)}>Get Started</a>
              </>
          )}
        </div>
      </div>
    </header>
  );
}
