import Link from "next/link";

import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/users";

import { DeleteUserButton } from "./delete-user-button";

export const metadata = {
  title: "Usuários | Sistema",
};

const errorMessages: Record<string, string> = {
  self: "Você não pode excluir a própria conta.",
  "last-admin": "Não é possível excluir o último administrador.",
};

export default async function UsersPage({
  searchParams,
}: PageProps<"/dashboard/users">) {
  await requireAdmin();
  const users = listUsers();
  const { error } = await searchParams;
  const errorMessage =
    typeof error === "string" ? errorMessages[error] : undefined;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-zinc-50">
            Usuários
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie as contas com acesso ao sistema.
          </p>
        </div>

        <Link
          href="/dashboard/users/new"
          className="rounded-lg bg-crimson-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-crimson-700 dark:bg-crimson-600 dark:text-white dark:hover:bg-crimson-500"
        >
          Novo usuário
        </Link>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-navy-200 bg-navy-100 text-xs uppercase tracking-wide text-navy-600 dark:border-navy-800 dark:bg-navy-800/60 dark:text-navy-300">
            <tr>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Perfil</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-200 dark:divide-navy-800">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-3 font-medium text-navy-900 dark:text-zinc-50">
                  {user.name}
                </td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">
                  {user.email}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={
                      user.role === "admin"
                        ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }
                  >
                    {user.role === "admin" ? "Administrador" : "Usuário"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/users/${user.id}/edit`}
                      className="rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
                    >
                      Editar
                    </Link>
                    <DeleteUserButton id={user.id} name={user.name} />
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400"
                >
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
