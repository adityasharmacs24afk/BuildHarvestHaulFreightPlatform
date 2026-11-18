export interface ToastPayload {
  id: string;
  title: string;
  message: string;
  tone: 'success' | 'info' | 'warning' | 'coral';
}

type BusEventMap = {
  toast: ToastPayload;
  confetti: { reason: string };
  self_heal: { poolId: string; poolCode: string; newPlate: string; recoverySeconds: number };
  pool_ready: { poolId: string; poolCode: string };
};

type Handler<T> = (payload: T) => void;

class PlatformEventBus {
  private listeners = new Map<keyof BusEventMap, Set<Handler<unknown>>>();

  on<K extends keyof BusEventMap>(event: K, handler: Handler<BusEventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(handler as Handler<unknown>);
    return () => {
      set.delete(handler as Handler<unknown>);
    };
  }

  emit<K extends keyof BusEventMap>(event: K, payload: BusEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      fn(payload);
    }
  }
}

export const eventBus = new PlatformEventBus();

export function pushToast(
  title: string,
  message: string,
  tone: ToastPayload['tone'] = 'success',
): void {
  eventBus.emit('toast', {
    id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    message,
    tone,
  });
}
