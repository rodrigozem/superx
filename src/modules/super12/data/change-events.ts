/**
 * Eventos de mudança local dos dados do torneio. Publicado pelo repositório
 * (e pelo import de backup) para que o motor de sincronização saiba quando
 * há alterações novas para levar à nuvem. Módulo puro: seguro em testes e
 * no servidor (sem assinantes, o evento vira um no-op).
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyLocalChange(): void {
  for (const listener of [...listeners]) listener();
}
