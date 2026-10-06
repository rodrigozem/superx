"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS não expõe display-mode; usa o marcador do navigator.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** No iOS o app precisa ser adicionado manualmente pela tela de compartilhamento. */
function shouldShowIosHint() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari =
    /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
  return isIos && isSafari;
}

/**
 * Botão "Instalar app". O Chromium dispara `beforeinstallprompt`; no iOS o app
 * precisa ser adicionado manualmente pela tela de compartilhamento, então
 * nesses casos mostramos uma dica em vez do botão.
 */
export function InstallPrompt() {
  const [standalone] = useState(() => typeof window !== "undefined" && isStandalone());
  const [showIosHint] = useState(() => typeof window !== "undefined" && shouldShowIosHint());
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (standalone) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setFinished(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [standalone]);

  if (standalone || finished) return null;

  if (deferred) {
    return (
      <button
        type="button"
        onClick={() => {
          void deferred.prompt().then(() => deferred.userChoice);
          setDeferred(null);
        }}
        className="rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-4 py-2 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
      >
        Instalar app
      </button>
    );
  }

  if (showIosHint) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Para usar em tela cheia: Compartilhar → Adicionar à Tela de Início.
      </p>
    );
  }

  return null;
}
