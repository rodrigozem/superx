import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/dal";
import { SyncStatus } from "@/modules/super12/ui/sync-status";

import { NavTabs } from "./nav-tabs";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="bg-navy-950 text-white">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-bold tracking-wide text-white">
                Sistema de Torneios
              </p>
              <p className="text-xs text-navy-300">
                {user.name} · {user.email}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <SyncStatus />

              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-full bg-crimson-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-crimson-700"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>

          <NavTabs isAdmin={user.role === "admin"} />
        </div>
      </header>

      {children}
    </div>
  );
}
