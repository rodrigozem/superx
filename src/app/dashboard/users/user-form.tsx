"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { UserFormState } from "@/lib/definitions";

type UserRole = "admin" | "user";

type UserFormProps = {
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  submitLabel: string;
  requirePassword?: boolean;
  defaultValues?: {
    name?: string;
    email?: string;
    role?: UserRole;
  };
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-400";

export function UserForm({
  action,
  submitLabel,
  requirePassword = false,
  defaultValues,
}: UserFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  const fieldError = (field: string) => state?.errors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name}
          className={inputClassName}
        />
        {fieldError("name") ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {fieldError("name")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={defaultValues?.email}
          className={inputClassName}
        />
        {fieldError("email") ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {fieldError("email")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="role"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Perfil
        </label>
        <select
          id="role"
          name="role"
          defaultValue={defaultValues?.role ?? "user"}
          className={inputClassName}
        >
          <option value="user">Usuário</option>
          <option value="admin">Administrador</option>
        </select>
        {fieldError("role") ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {fieldError("role")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={requirePassword}
          placeholder={requirePassword ? "" : "Deixe em branco para manter"}
          className={inputClassName}
        />
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Mínimo 8 caracteres, com letra, número e caractere especial.
        </p>
        {fieldError("password") ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {fieldError("password")}
          </p>
        ) : null}
      </div>

      {state?.message && !state?.errors ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Salvando..." : submitLabel}
        </button>
        <Link
          href="/dashboard/users"
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
