/**
 * Registro do service worker.
 *
 * Roda no cliente antes da hidratação. Em desenvolvimento o service worker é
 * ignorado para não servir chunks velhos; em produção, arquivos estáticos e o
 * shell das páginas ficam em cache e o app abre sem rede.
 */
if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o app continua funcionando normalmente.
    });
  });
}
