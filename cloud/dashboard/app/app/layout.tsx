import type { ReactNode } from "react";
import { listProjectsForUser } from "../../lib/control-plane";
import { requireSession } from "../../lib/session";
import { AppSidebar } from "../../components/app-sidebar";

export default async function AppLayout(props: { children: ReactNode; params: { projectId?: string } }) {
  const session = await requireSession();
  const projects = await listProjectsForUser(session.userId);

  // Note: Since this layout wraps nested routes like /app/projects/[projectId]/...,
  // accessing params here might be tricky in Next.js 14 layouts depending on hierarchy.
  // However, we can just pass the projects list to the client sidebar
  // and let the client sidebar determine the active project from the URL using usePathname.

  // Actually, we can try to extract projectId from children or context, but client-side matching is robust.

  return (
    <div className="app-shell">
      <AppSidebar
        projects={projects}
        userEmail={session.email}
        // We let the client component determine active ID via usePathname
      />
      <main className="app-content">
        {props.children}
      </main>

      <style>{`
        .app-shell {
          display: flex;
          min-height: calc(100vh - 72px); /* Minus header height */
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
          }
        }
      `}</style>
    </div>
  );
}
