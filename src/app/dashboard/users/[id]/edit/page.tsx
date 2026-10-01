import { notFound } from "next/navigation";

import { updateUserAction } from "@/app/actions/users";
import { requireAdmin } from "@/lib/dal";
import { getUserById } from "@/lib/users";

import { UserForm } from "../../user-form";

export const metadata = {
  title: "Editar usuário | Sistema",
};

export default async function EditUserPage({
  params,
}: PageProps<"/dashboard/users/[id]/edit">) {
  await requireAdmin();

  const { id } = await params;
  const user = getUserById(id);

  if (!user) notFound();

  const action = updateUserAction.bind(null, user.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Editar usuário
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <UserForm
          action={action}
          submitLabel="Salvar alterações"
          defaultValues={{
            name: user.name,
            email: user.email,
            role: user.role,
          }}
        />
      </div>
    </main>
  );
}
