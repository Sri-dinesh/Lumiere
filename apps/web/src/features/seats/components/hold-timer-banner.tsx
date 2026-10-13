import React, { useEffect, useState } from 'react';

interface HoldTimerBannerProps {
  expiresAt: string;
  initialSecondsRemaining: number;
  seatCodes: string[];
  onExpire: () => void;
  onRelease: () => void;
  isReleasing: boolean;
}

export const HoldTimerBanner: React.FC<HoldTimerBannerProps> = ({
  expiresAt,
  initialSecondsRemaining,
  seatCodes,
  onExpire,
  onRelease,
  isReleasing,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const targetMs = new Date(expiresAt).getTime();
    const nowMs = Date.now();
    const diff = Math.floor((targetMs - nowMs) / 1000);
    return Math.max(0, Math.min(diff, initialSecondsRemaining));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const targetMs = new Date(expiresAt).getTime();
      const nowMs = Date.now();
      const diff = Math.max(0, Math.floor((targetMs - nowMs) / 1000));

      setSecondsLeft(diff);

      if (diff <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = secondsLeft < 60;
  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / 300) * 100));

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
        isUrgent
          ? 'border-rose-500/60 bg-rose-950/30 text-rose-200 shadow-lg shadow-rose-500/10 animate-pulse'
          : 'border-amber-500/50 bg-amber-950/20 text-amber-200 shadow-md shadow-amber-500/10'
      }`}
    >
      {/* Dynamic progress bar underneath */}
      <div
        className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-linear ${
          isUrgent ? 'bg-rose-500' : 'bg-amber-500'
        }`}
        style={{ width: `${progressPercent}%` }}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold border ${
              isUrgent
                ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                : 'border-amber-500/50 bg-amber-500/20 text-amber-300'
            }`}
          >
            ⏱️
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">Seats Held For Checkout:</span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                {seatCodes.join(', ')}
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              Complete your payment before time expires to secure your reservation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Time Remaining
            </div>
            <div
              className={`text-xl font-mono font-black tracking-tight ${
                isUrgent ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {formattedTime}
            </div>
          </div>

          <button
            type="button"
            onClick={onRelease}
            disabled={isReleasing}
            className="rounded-xl border border-neutral-700 hover:border-neutral-500 bg-neutral-900/80 px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            {isReleasing ? 'Releasing...' : 'Change Seats'}
          </button>
        </div>
      </div>
    </div>
  );
};
