"use client";

import { useOffline } from "next/offline";

export default function TournamentsLoading() {
  const isOffline = useOffline();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div
        role="status"
        className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-navy-600 dark:text-zinc-400"
      >
        {isOffline
          ? "Sem conexão: abrindo o último conteúdo salvo…"
          : "Carregando torneios…"}
      </div>
    </main>
  );
}
