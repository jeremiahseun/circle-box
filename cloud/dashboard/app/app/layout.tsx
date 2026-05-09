import type { ReactNode } from "react";
import { listProjectsForUser } from "../../lib/control-plane";
import { requireSession } from "../../lib/session";
import { AppSidebar } from "../../components/app-sidebar";
import { MobileNav } from "../../components/mobile-nav";

export default async function AppLayout(props: { children: ReactNode; params: { projectId?: string } }) {
  const session = await requireSession();
  const projects = await listProjectsForUser(session.userId);

  return (
    <div className="app-shell">
      <AppSidebar
        projects={projects}
        userEmail={session.email}
      />
      <main className="app-content">
        {props.children}
      </main>
      <MobileNav projects={projects} />

      <style>{`
        .app-shell {
          display: flex;
          min-height: calc(100vh - 72px);
          background: #f8fafc;
        }

        .app-content {
          flex: 1;
          padding: 32px;
          overflow-x: hidden;
        }

        @media (max-width: 768px) {
          .app-content {
            padding: 16px;
            padding-bottom: 80px; /* Space for mobile nav bar */
          }
        }
      `}</style>
    </div>
  );
}
