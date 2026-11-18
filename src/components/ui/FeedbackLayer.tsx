import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Sparkles, X } from 'lucide-react';
import { eventBus, type ToastPayload } from '@/services/eventBus';
import { useAppStore } from '@/stores/useAppStore';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rot: number;
  color: string;
  isLeaf: boolean;
}

export function FeedbackLayer() {
  const reduceMotion = useAppStore((s) => s.reduceMotion);
  const [toasts, setToasts] = useState<ToastPayload[]>([]);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const offToast = eventBus.on('toast', (t) => {
      setToasts((prev) => [t, ...prev].slice(0, 4));
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== t.id));
      }, 4800);
    });

    const triggerBurst = () => {
      if (reduceMotion) return;
      const colors = ['#3FA374', '#F6B93B', '#2A7F58', '#7CC6E8'];
      const pieces: ConfettiPiece[] = Array.from({ length: 22 }, (_, idx) => ({
        id: Date.now() + idx,
        x: 25 + ((idx * 17) % 50),
        y: 25 + ((idx * 11) % 30),
        rot: (idx * 47) % 360,
        color: colors[idx % colors.length],
        isLeaf: idx % 2 === 0,
      }));
      setConfetti(pieces);
      setTimeout(() => setConfetti([]), 1700);
    };

    const offConf = eventBus.on('confetti', triggerBurst);
    const offPool = eventBus.on('pool_ready', triggerBurst);

    return () => {
      offToast();
      offConf();
      offPool();
    };
  }, [reduceMotion]);

  return (
    <>
      {/* Marigold & Green Leaf Confetti Burst */}
      <AnimatePresence>
        {confetti.length > 0 && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
            {confetti.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{
                  opacity: 1,
                  left: '50%',
                  top: '36%',
                  scale: 0.4,
                  rotate: 0,
                }}
                animate={{
                  opacity: 0,
                  left: `${p.x + (idx % 2 === 0 ? -14 : 14)}%`,
                  top: `${p.y + 38}%`,
                  scale: 1.15,
                  rotate: p.rot,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.45, ease: 'easeOut' }}
                className="absolute"
              >
                {p.isLeaf ? (
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path
                      d="M2 14 C2 6, 8 2, 14 2 C14 8, 10 14, 2 14 Z"
                      fill={p.color}
                    />
                  </svg>
                ) : (
                  <span
                    className="block h-3 w-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Spring Toast Stack */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(92vw,380px)] flex-col gap-2.5"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const borderCls =
              t.tone === 'coral'
                ? 'border-coral bg-coral-100/95'
                : t.tone === 'warning'
                  ? 'border-accent bg-accent-100/95'
                  : t.tone === 'info'
                    ? 'border-sky bg-sky-100/95'
                    : 'border-primary bg-surface';
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-elevated ${borderCls}`}
              >
                <div className="mt-0.5 shrink-0">
                  {t.tone === 'coral' || t.tone === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-coral" />
                  ) : t.tone === 'info' ? (
                    <Info className="h-5 w-5 text-primary-strong" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-primary-strong" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{t.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted leading-relaxed">{t.message}</p>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}

export function BrandedRoadLoader({ label = 'Preparing Kolar freight corridors...' }: { label?: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 p-8 text-center">
      <svg width="160" height="64" viewBox="0 0 160 64" aria-hidden="true">
        <line x1="12" y1="52" x2="148" y2="52" stroke="#E1EBE4" strokeWidth="4" strokeLinecap="round" />
        <line
          x1="20"
          y1="52"
          x2="140"
          y2="52"
          stroke="#3FA374"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
        <g className="animate-bounce">
          <rect x="52" y="24" width="38" height="20" rx="5" fill="#3FA374" />
          <rect x="90" y="30" width="18" height="14" rx="4" fill="#2A7F58" />
          <rect x="57" y="18" width="12" height="7" rx="2" fill="#F6B93B" />
          <rect x="72" y="18" width="12" height="7" rx="2" fill="#F6B93B" />
          <circle cx="64" cy="46" r="5" fill="#1E2B25" />
          <circle cx="96" cy="46" r="5" fill="#1E2B25" />
        </g>
      </svg>
      <div className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}
