/**
 * Service worker do sistema de torneios.
 *
 * Estratégia:
 * - estáticos imutáveis (`/_next/static`, ícones, manifesto): cache-first;
 * - documentos (navegação): network-first com fallback para o cache e, por
 *   último, para uma página offline estática;
 * - demais requisições (payloads RSC, Server Actions, formulários): o service
 *   worker não interfere — quem cuida disso é o `experimental.useOffline` do
 *   Next.js, que detecta a falta de rede e repete a requisição automaticamente.
 */

const VERSION = "super12-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

const PRECACHE = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
];

const OFFLINE_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sem conexão</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #09090b; color: #fafafa;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      main { max-width: 22rem; padding: 1.5rem; text-align: center; }
      h1 { font-size: 1.125rem; margin: 0 0 0.5rem; }
      p { font-size: 0.875rem; color: #a1a1aa; margin: 0 0 1.25rem; }
      button { font: inherit; font-weight: 600; cursor: pointer; padding: 0.5rem 1rem;
        border: 0; border-radius: 0.5rem; background: #fafafa; color: #09090b; }
    </style>
  </head>
  <body>
    <main>
      <h1>Você está sem conexão</h1>
      <p>Os torneios já salvos continuam disponíveis. Acesse uma página aberta antes ou reconecte para continuar.</p>
      <button onclick="location.reload()">Tentar novamente</button>
    </main>
  </body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") void self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    void cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstDocument(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Payload parcial do App Router: cachear isso quebraria a navegação.
  const isRouterPayload =
    request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (isRouterPayload) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstDocument(request));
  }
});
