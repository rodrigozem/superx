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
  "w-full rounded-lg border border-zinc-200 bg-field px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/15 dark:border-navy-600 dark:bg-navy-950 dark:text-zinc-50 dark:focus:border-crimson-400";

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
          className="block text-sm font-semibold text-navy-800 dark:text-navy-200"
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
          className="block text-sm font-semibold text-navy-800 dark:text-navy-200"
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
          className="block text-sm font-semibold text-navy-800 dark:text-navy-200"
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
          className="block text-sm font-semibold text-navy-800 dark:text-navy-200"
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
          className="rounded-lg bg-crimson-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-crimson-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-crimson-600 dark:text-white dark:hover:bg-crimson-500"
        >
          {pending ? "Salvando..." : submitLabel}
        </button>
        <Link
          href="/dashboard/users"
          className="rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-4 py-2.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
