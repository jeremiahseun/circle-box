"use client";

import { usePathname } from "next/navigation";
import type { DashboardProject } from "../lib/control-plane";

type MobileBottomNavProps = {
  projects: DashboardProject[];
};

export function MobileBottomNav({ projects }: MobileBottomNavProps) {
  const pathname = usePathname();

  const pathParts = pathname?.split("/") || [];
  const projectIndex = pathParts.indexOf("projects");
  const projectIdFromUrl = projectIndex !== -1 && pathParts.length > projectIndex + 1 ? pathParts[projectIndex + 1] : null;
  const activeProject = projects.find(p => p.id === projectIdFromUrl) || projects[0];

  if (!activeProject) return null;

  const base = `/app/projects/${activeProject.id}`;
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname?.startsWith(href);

  const navItems = [
    {
      href: base,
      exact: true,
      label: "Home",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      href: `${base}/crashes`,
      exact: false,
      label: "Crashes",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      href: `${base}/usage`,
      exact: false,
      label: "Usage",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
      ),
    },
    {
      href: `${base}/keys`,
      exact: false,
      label: "Keys",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
      ),
    },
    {
      href: `${base}/members`,
      exact: false,
      label: "Team",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <a
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${active ? "active" : ""}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </a>
        );
      })}

      <style jsx>{`
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 40;
          background: white;
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
          padding: 8px 0 env(safe-area-inset-bottom, 8px);
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
            justify-content: space-around;
          }
        }

        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 6px 12px;
          color: #94a3b8;
          text-decoration: none;
          border-radius: 8px;
          transition: color 0.15s;
          flex: 1;
          min-width: 0;
        }

        .mobile-nav-item:hover {
          color: #1e293b;
        }

        .mobile-nav-item.active {
          color: #0f4c3a;
        }

        .mobile-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-nav-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .mobile-nav-item.active .mobile-nav-label {
          font-weight: 700;
        }
      `}</style>
    </nav>
  );
}
