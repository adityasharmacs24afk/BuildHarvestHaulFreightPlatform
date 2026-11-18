import { computeSpoilageStatus } from '@/engine/spoilage';
import type { CropOrCargo } from '@/types/domain';

interface SpoilageRingProps {
  crop: CropOrCargo;
  readyAt: string;
  ambientTempC: number;
  freshnessScore: number;
  size?: number;
  showLabel?: boolean;
}

export function SpoilageRing({
  crop,
  readyAt,
  ambientTempC,
  freshnessScore,
  size = 68,
  showLabel = true,
}: SpoilageRingProps) {
  const status = computeSpoilageStatus(crop, readyAt, ambientTempC, freshnessScore);
  const stroke = 6;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - status.remainingPct / 100);
  const lowTime = status.remainingPct <= 25;

  return (
    <div className="inline-flex items-center gap-2.5">
      <div className={`relative flex items-center justify-center ${lowTime ? 'animate-pulse' : ''}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EEF5F0"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={status.ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-ink leading-none">{status.remainingPct}%</span>
          <span className="text-[10px] text-ink-muted leading-tight">{Math.round(status.remainingHours)}h</span>
        </div>
      </div>
      {showLabel && (
        <div>
          <div className="text-xs font-semibold text-ink">
            Shelf life: {status.remainingHours}h left
          </div>
          <div className="text-[11px] text-ink-muted">
            At {ambientTempC}°C •{' '}
            <span
              className={
                status.urgencyTag === 'urgent'
                  ? 'text-coral font-semibold'
                  : status.urgencyTag === 'watch'
                    ? 'text-amber-700 font-semibold'
                    : 'text-primary-strong font-semibold'
              }
            >
              {status.urgencyTag === 'urgent'
                ? 'Priority dispatch'
                : status.urgencyTag === 'watch'
                  ? 'Pool within 2h'
                  : 'Fresh harvest'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
