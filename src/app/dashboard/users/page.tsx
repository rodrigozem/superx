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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Usuários
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie as contas com acesso ao sistema.
          </p>
        </div>

        <Link
          href="/dashboard/users/new"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Perfil</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {user.name}
                </td>
                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">
                  {user.email}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={
                      user.role === "admin"
                        ? "rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
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
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
