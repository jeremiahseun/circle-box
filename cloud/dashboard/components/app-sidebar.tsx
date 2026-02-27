"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { DashboardProject } from "../lib/control-plane";

type AppSidebarProps = {
  projects: DashboardProject[];
  userEmail: string;
};

export function AppSidebar({ projects, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  // Determine active project from pathname: /app/projects/[projectId]
  // This is a naive split, but sufficient for this structure.
  const pathParts = pathname?.split("/") || [];
  const projectIndex = pathParts.indexOf("projects");
  const projectIdFromUrl = projectIndex !== -1 && pathParts.length > projectIndex + 1 ? pathParts[projectIndex + 1] : null;

  const activeProject = projects.find(p => p.id === projectIdFromUrl) || projects[0];

  const NavItem = ({ href, icon, label, exact = false }: { href: string; icon: React.ReactNode; label: string; exact?: boolean }) => {
    const isActive = exact ? pathname === href : pathname?.startsWith(href);
    return (
      <a
        href={href}
        className={`nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">{icon}</span>
        <span className="nav-label">{label}</span>
      </a>
    );
  };

  return (
    <aside className="app-sidebar">
      {/* Project Switcher */}
      <div className="project-switcher-container">
        <button
          className="project-switcher-btn"
          onClick={() => setIsProjectsOpen(!isProjectsOpen)}
        >
          <div className="project-avatar">
            {activeProject ? activeProject.name.substring(0, 2).toUpperCase() : "+"}
          </div>
          <div className="project-info">
            <span className="project-name">{activeProject ? activeProject.name : "Select Project"}</span>
            <span className="project-plan">{activeProject ? activeProject.plan_tier : "Free"}</span>
          </div>
          <svg className="switcher-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown */}
        {isProjectsOpen && (
          <div className="project-dropdown">
            <div className="dropdown-header">Projects</div>
            {projects.map(project => (
              <a
                key={project.id}
                href={`/app/projects/${project.id}/keys`}
                className={`dropdown-item ${project.id === activeProject?.id ? "active" : ""}`}
              >
                {project.name}
              </a>
            ))}
            <div className="dropdown-divider" />
            <a href="/app/projects/new" className="dropdown-item create-new">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Create New Project
            </a>
          </div>
        )}
      </div>

      {/* Navigation */}
      {activeProject && (
        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className="nav-group-title">ANALYTICS</div>
            <NavItem
              href={`/app/projects/${activeProject.id}/crashes`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
              label="Crash Explorer"
            />
            <NavItem
              href={`/app/projects/${activeProject.id}/usage`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"></path></svg>}
              label="Usage"
            />
          </div>

          <div className="nav-group">
            <div className="nav-group-title">CONFIGURATION</div>
            <NavItem
              href={`/app/projects/${activeProject.id}/keys`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>}
              label="Project Keys"
            />
            <NavItem
              href={`/app/projects/${activeProject.id}/members`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
              label="Members"
            />
             <NavItem
              href={`/app/projects/${activeProject.id}/invites`}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>}
              label="Invites"
            />
          </div>
        </nav>
      )}

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{userEmail.substring(0, 1).toUpperCase()}</div>
          <span className="user-email" title={userEmail}>{userEmail}</span>
        </div>
        <form action="/api/auth/logout" method="POST">
            <button className="logout-btn" type="submit" aria-label="Sign out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
            </button>
        </form>
      </div>

      <style jsx>{`
        .app-sidebar {
          width: 260px;
          background: #f8fafc; /* Slate 50 */
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 72px); /* Minus header */
          position: sticky;
          top: 72px;
        }

        .project-switcher-container {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          position: relative;
        }

        .project-switcher-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .project-switcher-btn:hover {
          border-color: #cbd5e1;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .project-avatar {
          width: 32px;
          height: 32px;
          background: #0f4c3a;
          color: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }

        .project-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .project-name {
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .project-plan {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
        }

        .switcher-arrow {
          color: #94a3b8;
        }

        .project-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 8px;
          right: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          z-index: 50;
          padding: 4px;
        }

        .dropdown-header {
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font-size: 14px;
          color: #334155;
          text-decoration: none;
          border-radius: 4px;
          transition: background 0.1s;
        }

        .dropdown-item:hover {
          background: #f1f5f9;
        }

        .dropdown-item.active {
          background: #ecfdf5;
          color: #0f4c3a;
          font-weight: 500;
        }

        .dropdown-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 4px 0;
        }

        .create-new {
          color: #0f4c3a;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
        }

        .nav-group {
          margin-bottom: 24px;
        }

        .nav-group-title {
          padding: 0 12px;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          color: #64748b;
          text-decoration: none;
          border-radius: 6px;
          margin-bottom: 2px;
          transition: all 0.2s;
        }

        .nav-item:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .nav-item.active {
          background: #eef2ff; /* Using slate/indigo tint */
          background: #f0fdf4; /* Emerald tint */
          color: #0f4c3a;
          font-weight: 500;
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
        }

        .nav-item.active .nav-icon {
            opacity: 1;
        }

        .nav-label {
          font-size: 14px;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
        }

        .user-avatar {
          width: 28px;
          height: 28px;
          background: #cbd5e1;
          color: #475569;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
        }

        .user-email {
          font-size: 13px;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .logout-btn {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: color 0.2s;
        }

        .logout-btn:hover {
            color: #ef4444;
            background: #fee2e2;
        }

        @media (max-width: 768px) {
          .app-sidebar {
            display: none; /* Mobile handling needed later, simpler to hide for MVP sidebar */
          }
        }
      `}</style>
    </aside>
  );
}
