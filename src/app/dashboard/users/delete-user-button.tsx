"use client";

import { deleteUserAction } from "@/app/actions/users";

type DeleteUserButtonProps = {
  id: string;
  name: string;
};

export function DeleteUserButton({ id, name }: DeleteUserButtonProps) {
  return (
    <form
      action={deleteUserAction}
      onSubmit={(event) => {
        if (!window.confirm(`Excluir o usuário "${name}"?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        Excluir
      </button>
    </form>
  );
}
