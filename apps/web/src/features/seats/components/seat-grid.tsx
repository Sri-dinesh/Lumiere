import React, { useMemo } from 'react';
import type { ShowSeat } from '../seat.types.js';
import { SeatButton } from './seat-button.js';

interface SeatGridProps {
  seats: ShowSeat[];
  selectedSeatCodes: string[];
  onToggleSeat: (seatCode: string) => void;
  disabled?: boolean;
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  seats,
  selectedSeatCodes,
  onToggleSeat,
  disabled = false,
}) => {
  // Group seats by row (A to H)
  const rowsMap = useMemo(() => {
    const map = new Map<string, ShowSeat[]>();
    for (const seat of seats) {
      if (!map.has(seat.row)) {
        map.set(seat.row, []);
      }
      map.get(seat.row)!.push(seat);
    }

    // Sort rows alphabetically (A, B, C...)
    return Array.from(map.entries())
      .sort(([rowA], [rowB]) => rowA.localeCompare(rowB))
      .map(([row, rowSeats]) => ({
        row,
        // Sort seats numerically within row (1 to 10)
        seats: rowSeats.sort((a, b) => a.seatNumber - b.seatNumber),
      }));
  }, [seats]);

  const selectedSet = useMemo(() => new Set(selectedSeatCodes), [selectedSeatCodes]);

  return (
    <div className="flex flex-col items-center justify-center space-y-10 py-4">
      {/* Cinema Curved Screen visual */}
      <div className="w-full max-w-2xl px-4 flex flex-col items-center space-y-3">
        <div className="relative h-12 w-full overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-16 rounded-[50%] border-t-4 border-amber-400/80 shadow-[0_-8px_25px_rgba(251,191,36,0.25)]" />
        </div>
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-neutral-500">
          Curved 4K Laser Screen
        </div>
      </div>

      {/* Auditorium Seat Layout */}
      <div className="overflow-x-auto w-full flex justify-center pb-4 scrollbar-none">
        <div className="flex flex-col space-y-2.5 sm:space-y-3 min-w-max px-4">
          {rowsMap.map(({ row, seats: rowSeats }) => {
            const leftHalf = rowSeats.slice(0, 5);
            const rightHalf = rowSeats.slice(5, 10);

            return (
              <div key={row} className="flex items-center gap-2 sm:gap-3">
                {/* Left Row Indicator */}
                <div className="w-6 text-center text-xs font-bold text-neutral-500 select-none">
                  {row}
                </div>

                {/* Left Block (Seats 1-5) */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {leftHalf.map((seat) => (
                    <SeatButton
                      key={seat.seatCode}
                      seat={seat}
                      isSelected={selectedSet.has(seat.seatCode)}
                      onToggle={onToggleSeat}
                      disabled={disabled}
                    />
                  ))}
                </div>

                {/* Central Walkway Aisle */}
                <div className="w-6 sm:w-10 flex items-center justify-center">
                  <div className="h-6 w-px bg-neutral-800/80" />
                </div>

                {/* Right Block (Seats 6-10) */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {rightHalf.map((seat) => (
                    <SeatButton
                      key={seat.seatCode}
                      seat={seat}
                      isSelected={selectedSet.has(seat.seatCode)}
                      onToggle={onToggleSeat}
                      disabled={disabled}
                    />
                  ))}
                </div>

                {/* Right Row Indicator */}
                <div className="w-6 text-center text-xs font-bold text-neutral-500 select-none">
                  {row}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seat Status Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 border-t border-neutral-800/80 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-md border border-neutral-700 bg-neutral-900" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-md border border-amber-300 bg-amber-500 shadow-sm shadow-amber-500/30" />
          <span className="font-semibold text-white">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-md border border-dashed border-amber-600 bg-amber-950/20" />
          <span>Held (in checkout)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-md border border-neutral-800 bg-neutral-950 opacity-60 flex items-center justify-center text-[10px] text-neutral-600">
            ✕
          </div>
          <span>Sold / Reserved</span>
        </div>
      </div>
    </div>
  );
};
