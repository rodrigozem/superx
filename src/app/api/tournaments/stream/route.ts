import { getSession } from "@/lib/dal";
import { subscribeTournamentsChanged } from "@/lib/sync-bus";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

function encodeEvent(name: string): Uint8Array {
  return new TextEncoder().encode(`event: ${name}\ndata: 1\n\n`);
}

/**
 * SSE: mantém cada navegador conectado e avisa quando algum outro cliente
 * sincronizou algo novo, para o motor de sync baixar o snapshot na hora.
 * O proxy não intercepta `/api`, então a autenticação é feita aqui.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Não autenticado.", { status: 401 });
  }

  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (name: string) => {
        if (closed) return;
        try {
          controller.enqueue(encodeEvent(name));
        } catch {
          closed = true;
        }
      };

      const unsubscribe = subscribeTournamentsChanged(() => send("changed"));
      const heartbeat = setInterval(() => send("ping"), HEARTBEAT_MS);

      send("ready");

      cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // stream já encerrado pelo cliente
        }
      };
    },
    cancel() {
      cleanup();
    },
  });

  request.signal.addEventListener("abort", () => cleanup(), { once: true });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
