import Link from "next/link";

import { requireUser } from "@/lib/dal";

import { InstallPrompt } from "@/components/install-prompt";

import { BackupControls } from "@/modules/super12/ui/backup-controls";
import { TournamentList } from "@/modules/super12/ui/tournament-list";

export const metadata = {
  title: "Torneios | Sistema",
};

export default async function TournamentsPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Torneios
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Super 8, Super 10 e Super 12 — salvos no navegador e sincronizados
            com a nuvem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InstallPrompt />
          <Link
            href="/dashboard/torneios/novo"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Novo torneio
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">
          Os torneios ficam salvos neste navegador e sobem para a nuvem
          automaticamente sempre que houver internet. Exporte um backup para
          levar os dados manualmente ou recuperá-los.
        </p>
        <BackupControls />
      </div>

      <TournamentList />
    </main>
  );
}
