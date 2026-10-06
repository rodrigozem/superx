import { createUserAction } from "@/app/actions/users";
import { requireAdmin } from "@/lib/dal";

import { UserForm } from "../user-form";

export const metadata = {
  title: "Novo usuário | Sistema",
};

export default async function NewUserPage() {
  await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-zinc-50">
          Novo usuário
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Preencha os dados para criar uma nova conta.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-navy-800 dark:bg-navy-900">
        <UserForm
          action={createUserAction}
          submitLabel="Criar usuário"
          requirePassword
        />
      </div>
    </main>
  );
}
