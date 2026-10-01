import { redirect } from "next/navigation";

import { getSession } from "@/lib/dal";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar | Painel",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-100 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Acessar o sistema
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Informe suas credenciais para continuar.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
