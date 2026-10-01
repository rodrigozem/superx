import { requireUser } from "@/lib/dal";

export const metadata = {
  title: "Painel | Sistema",
};

const cards = [
  { title: "Usuários", value: "1", description: "Contas cadastradas" },
  { title: "Sessões ativas", value: "1", description: "Dispositivos conectados" },
  { title: "Status", value: "OK", description: "Todos os serviços operando" },
];

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Bem-vindo, {user.name}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Esta é a tela principal do sistema. Você está autenticado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {card.title}
            </p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
