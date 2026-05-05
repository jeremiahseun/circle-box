import type { ReactNode } from "react";
import { listProjectsForUser } from "../../lib/control-plane";
import { requireSession } from "../../lib/session";
import { AppSidebar } from "../../components/app-sidebar";
import { MobileBottomNav } from "../../components/mobile-bottom-nav";

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
      <MobileBottomNav projects={projects} />

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
            /* Add bottom padding so content isn't hidden behind the mobile nav bar */
            padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>
    </div>
  );
}
