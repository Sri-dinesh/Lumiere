import React from 'react';
import type { ShowSeat } from '../seat.types.js';

interface SeatButtonProps {
  seat: ShowSeat;
  isSelected: boolean;
  onToggle: (seatCode: string) => void;
  disabled?: boolean;
}

export const SeatButton: React.FC<SeatButtonProps> = ({
  seat,
  isSelected,
  onToggle,
  disabled = false,
}) => {
  const isBooked = seat.status === 'BOOKED';
  const isHeldByOther = seat.status === 'HELD' && !seat.heldByCurrentUser;
  const isHeldByMe = seat.status === 'HELD' && seat.heldByCurrentUser;
  const isAvailable = seat.status === 'AVAILABLE';

  const handleClick = () => {
    if (disabled || isBooked || isHeldByOther) return;
    onToggle(seat.seatCode);
  };

  // Compute CSS classes based on state
  let styleClasses = '';
  let titleText = `${seat.seatCode} (Available)`;

  if (isBooked) {
    styleClasses =
      'bg-neutral-950 border-neutral-800/80 text-neutral-600 cursor-not-allowed opacity-50';
    titleText = `${seat.seatCode} (Sold / Reserved)`;
  } else if (isHeldByOther) {
    styleClasses =
      'bg-amber-950/20 border-dashed border-amber-700/60 text-amber-500/60 cursor-not-allowed';
    titleText = `${seat.seatCode} (Held by another customer)`;
  } else if (isHeldByMe) {
    styleClasses =
      'bg-amber-500/30 border-amber-400 text-amber-200 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400';
    titleText = `${seat.seatCode} (Held by you)`;
  } else if (isSelected) {
    styleClasses =
      'bg-amber-500 border-amber-300 text-neutral-950 font-extrabold shadow-lg shadow-amber-500/30 scale-105 ring-2 ring-amber-400';
    titleText = `${seat.seatCode} (Selected)`;
  } else if (isAvailable) {
    styleClasses =
      'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:border-amber-400/80 hover:bg-neutral-800 hover:text-white hover:scale-105 active:scale-95 cursor-pointer';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isBooked || isHeldByOther}
      title={titleText}
      aria-label={titleText}
      className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border text-[11px] sm:text-xs transition-all duration-150 select-none ${styleClasses}`}
    >
      {/* Top curved headrest aesthetic accent */}
      <span className="absolute -top-1 inset-x-1.5 h-1 rounded-t-sm bg-current opacity-25" />

      {/* Seat Number Label */}
      <span className="relative z-10">{seat.seatNumber}</span>

      {/* Lock or Status indicator */}
      {isBooked && (
        <span className="absolute inset-0 flex items-center justify-center text-neutral-600 text-[10px]">
          ✕
        </span>
      )}
      {isHeldByOther && (
        <span className="absolute -bottom-1 -right-1 text-[8px] bg-amber-950 border border-amber-700 rounded-full px-0.5 text-amber-400">
          ⏳
        </span>
      )}
    </button>
  );
};
