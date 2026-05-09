"use client";

import { usePathname } from "next/navigation";
import type { DashboardProject } from "../lib/control-plane";

type MobileNavProps = {
  projects: DashboardProject[];
};

export function MobileNav({ projects }: MobileNavProps) {
  const pathname = usePathname();

  const pathParts = pathname?.split("/") ?? [];
  const projectIndex = pathParts.indexOf("projects");
  const projectIdFromUrl =
    projectIndex !== -1 && pathParts.length > projectIndex + 1
      ? pathParts[projectIndex + 1]
      : null;

  const activeProject =
    projects.find((p) => p.id === projectIdFromUrl) ?? projects[0];

  if (!activeProject) return null;

  const base = `/app/projects/${activeProject.id}`;

  const navItems = [
    {
      href: base,
      exact: true,
      label: "Overview",
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
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
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
      label: "Members",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      className="mobile-bottom-nav"
    >
      {navItems.map(({ href, label, icon, exact }) => {
        const isActive = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <a
            key={href}
            href={href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "8px 4px",
              color: isActive ? "#0f4c3a" : "#94a3b8",
              textDecoration: "none",
              fontSize: "10px",
              fontWeight: isActive ? 700 : 500,
              borderTop: isActive ? "2px solid #10b981" : "2px solid transparent",
              background: isActive ? "#f0fdf4" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.7 }}>{icon}</span>
            <span>{label}</span>
          </a>
        );
      })}

      <style>{`
        .mobile-bottom-nav {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
}
