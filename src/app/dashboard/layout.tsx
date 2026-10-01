import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/dal";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col bg-zinc-100 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Sistema
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {user.name} · {user.email}
              </p>
            </div>

            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Painel
              </Link>
              <Link
                href="/dashboard/torneios"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Torneios
              </Link>
              {user.role === "admin" ? (
                <Link
                  href="/dashboard/users"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Usuários
                </Link>
              ) : null}
            </nav>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {children}
    </div>
  );
}
