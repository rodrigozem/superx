import { requireUser } from "@/lib/dal";

import { TournamentClient } from "@/modules/super12/ui/tournament-client";

export const metadata = {
  title: "Torneio | Sistema",
};

export default async function TournamentPage({
  params,
}: PageProps<"/dashboard/torneios/[id]">) {
  await requireUser();

  const { id } = await params;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <TournamentClient id={id} />
    </main>
  );
}
