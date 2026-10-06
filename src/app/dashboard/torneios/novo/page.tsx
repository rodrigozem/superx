import { requireUser } from "@/lib/dal";

import { TournamentWizard } from "@/modules/super12/ui/tournament-wizard";

export const metadata = {
  title: "Novo torneio | Sistema",
};

export default async function NewTournamentPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-zinc-50">
          Novo torneio
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          A tabela é gerada no dispositivo a partir da seed informada.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-navy-800 dark:bg-navy-900">
        <TournamentWizard />
      </div>
    </main>
  );
}
