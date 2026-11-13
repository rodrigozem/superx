import Image from "next/image";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/dal";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar | Painel",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const stats = [
    { value: "12", label: "atletas" },
    { value: "3", label: "quadras" },
    { value: "100%", label: "ao vivo" },
  ];

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-12 lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,#1c3159_0%,#0c1830_55%,#070f21_100%)]" />
          <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-crimson-600/20 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-navy-500/25 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(circle at 30% 40%, black, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(circle at 30% 40%, black, transparent 75%)",
            }}
          />
          <div className="absolute -right-40 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full border border-white/10" />
          <div className="absolute -right-24 top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 rounded-full border border-white/10" />

          <svg
            viewBox="0 0 400 240"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            className="absolute -bottom-6 right-6 w-[30rem] opacity-20"
          >
            <rect x="10" y="10" width="380" height="220" rx="8" />
            <line x1="200" y1="10" x2="200" y2="230" />
            <line x1="10" y1="78" x2="390" y2="78" />
            <line x1="10" y1="162" x2="390" y2="162" />
            <line x1="84" y1="78" x2="84" y2="162" />
            <line x1="316" y1="78" x2="316" y2="162" />
          </svg>
        </div>

        <div className="relative flex items-center">
          <Image
            src="/logo.png"
            alt="Super X"
            width={800}
            height={366}
            priority
            className="h-11 w-auto"
          />
        </div>

        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-crimson-300">
            Super 6 · 8 · 10 · 12
          </p>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-white xl:text-5xl">
            Torneios de duplas com tabelas equilibradas e placar ao vivo.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-navy-200">
            Gere rodadas equilibradas, registre resultados e acompanhe a
            classificação em tempo real — tudo em um só lugar.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-xl font-semibold text-white">{stat.value}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-navy-300">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-navy-400">
          Painel de torneios · {new Date().getFullYear()} · dados salvos com
          segurança
        </p>
      </section>

      <section className="flex items-center justify-center bg-canvas px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo.png"
              alt="Super X"
              width={800}
              height={366}
              priority
              className="h-11 w-auto"
            />
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-[0_24px_70px_-28px_rgba(12,24,48,0.35)] dark:border-navy-800 dark:bg-navy-900 sm:p-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-crimson-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-crimson-700 dark:bg-crimson-900/30 dark:text-crimson-200">
              <span className="h-1.5 w-1.5 rounded-full bg-crimson-500" />
              Acesso restrito
            </span>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-navy-900 dark:text-zinc-50">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Entre com suas credenciais para gerenciar seus torneios.
            </p>

            <div className="mt-8">
              <LoginForm />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Acesso protegido · sessão segura
          </p>
        </div>
      </section>
    </main>
  );
}
