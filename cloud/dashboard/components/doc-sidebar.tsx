"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "./ui/card";

type DocSidebarProps = {
  items: { title: string; slug: string }[];
  currentSlug: string;
};

export function DocSidebar({ items, currentSlug }: DocSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Group items by category if we had that info, for now flat list
  // Let's assume a single section for simplicity or enhance later

  return (
    <>
      {/* Mobile Toggle */}
      <div className="doc-sidebar-mobile-toggle">
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn btn-sm"
            style={{ width: "100%", justifyContent: "space-between" }}
        >
            <span>{isOpen ? "Hide Menu" : "Show Menu"}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </button>
      </div>

      <aside className={`doc-sidebar ${isOpen ? "open" : ""}`}>
        <Card className="doc-sidebar-card">
            <nav className="doc-nav">
                <div className="doc-section-header">GUIDES</div>
                <ul className="doc-nav-list">
                    {items.map((item) => {
                        const isActive = item.slug === currentSlug;
                        return (
                            <li key={item.slug}>
                                <Link
                                    href={`/docs/${item.slug}`}
                                    className={`doc-nav-link ${isActive ? "active" : ""}`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {item.title}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </Card>
      </aside>

      <style jsx>{`
        .doc-sidebar-mobile-toggle {
            display: none;
            margin-bottom: var(--space-4);
        }

        .doc-sidebar {
            position: sticky;
            top: 100px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
        }

        .doc-sidebar-card {
            padding: var(--space-4);
            background: var(--c-surface);
        }

        .doc-section-header {
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--c-ink-soft);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: var(--space-3);
        }

        .doc-nav-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .doc-nav-link {
            display: block;
            padding: 6px 12px;
            font-size: 0.9rem;
            color: var(--c-ink-soft);
            border-radius: var(--radius-sm);
            text-decoration: none;
            transition: all var(--trans-fast);
        }

        .doc-nav-link:hover {
            color: var(--c-primary);
            background: var(--c-surface-hover);
        }

        .doc-nav-link.active {
            color: var(--c-primary);
            font-weight: 600;
            background: rgba(16, 185, 129, 0.1); /* Emerald tint */
        }

        @media (max-width: 920px) {
            .doc-sidebar {
                display: none;
                position: static;
                max-height: none;
                margin-bottom: var(--space-6);
            }

            .doc-sidebar.open {
                display: block;
            }

            .doc-sidebar-mobile-toggle {
                display: block;
            }
        }
      `}</style>
    </>
  );
}
