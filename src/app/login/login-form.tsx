"use client";

import { useActionState } from "react";

import { login } from "@/app/actions/auth";
import type { LoginState } from "@/lib/definitions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
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
          autoComplete="username"
          required
          placeholder="voce@empresa.com"
          className="w-full rounded-lg border border-zinc-200 bg-field px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/15 dark:border-navy-600 dark:bg-navy-950 dark:text-zinc-50 dark:focus:border-crimson-400"
        />
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
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full rounded-lg border border-zinc-200 bg-field px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/15 dark:border-navy-600 dark:bg-navy-950 dark:text-zinc-50 dark:focus:border-crimson-400"
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-crimson-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-crimson-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-crimson-600 dark:text-white dark:hover:bg-crimson-500"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
