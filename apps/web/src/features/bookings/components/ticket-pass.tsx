import { useState } from 'react';
import type { BookingDetail, BookingSummary } from '../booking.types.js';
import { formatPaiseToInr, formatIstDate, formatIstTime } from '../../../lib/formatters.js';

interface TicketPassProps {
  booking: BookingDetail | BookingSummary;
  onCancel?: () => void;
  isCancelling?: boolean;
}

export function TicketPass({ booking, onCancel, isCancelling }: TicketPassProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(booking.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfirmed = booking.status === 'CONFIRMED';
  const seatCount = booking.seatCodes.length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Ticket Container */}
      <div className="relative rounded-3xl border border-neutral-800 bg-neutral-900/90 backdrop-blur shadow-2xl overflow-hidden transition-all duration-300 hover:border-neutral-700">
        {/* Amber top ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

        <div className="flex flex-col md:flex-row">
          {/* Main Ticket Section */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <span>🎬</span> LUMIERE CINEMAS
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    isConfirmed
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isConfirmed ? '● Confirmed Admission' : '✕ Cancelled Booking'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {booking.movieTitle}
              </h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">
                Auditorium 1 • Single Premium Screen • Dolby Atmos
              </p>
            </div>

            {/* Event Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-neutral-800/80">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Date
                </div>
                <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                  {formatIstDate(booking.startsAt)}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Showtime (IST)
                </div>
                <div className="text-sm sm:text-base font-bold text-amber-300 mt-0.5">
                  {formatIstTime(booking.startsAt)}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Seats ({seatCount})
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {booking.seatCodes.map((seat) => (
                    <span
                      key={seat}
                      className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black"
                    >
                      {seat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Total Amount
                </div>
                <div className="text-base sm:text-lg font-black text-white mt-0.5">
                  {formatPaiseToInr(booking.totalPaise)}
                </div>
              </div>
            </div>

            {/* Footer Notice & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-neutral-500 text-[11px]">
                Booked on {formatIstDate(booking.createdAt)} at {formatIstTime(booking.createdAt)}
              </div>

              {isConfirmed && booking.canCancel && onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                >
                  {isCancelling ? 'Processing...' : 'Cancel Booking'}
                </button>
              )}
            </div>
          </div>

          {/* Perforation Divider (Desktop vertical / Mobile horizontal) */}
          <div className="relative flex items-center md:flex-col justify-between md:justify-center">
            {/* Top Cutout */}
            <div className="hidden md:block absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-neutral-950 border-b border-neutral-800" />

            {/* Dashed line */}
            <div className="w-full md:w-0 h-0 md:h-full border-t md:border-t-0 md:border-l-2 border-dashed border-neutral-700/80 my-2 md:my-0 md:mx-0" />

            {/* Bottom Cutout */}
            <div className="hidden md:block absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-neutral-950 border-t border-neutral-800" />
          </div>

          {/* Ticket Stub (QR / Admission Stub) */}
          <div className="md:w-56 p-6 sm:p-8 bg-neutral-950/60 flex flex-col items-center justify-between text-center space-y-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Gate Pass
              </div>
              <div className="text-xs font-bold text-amber-400 mt-0.5">
                ADMIT {seatCount} {seatCount === 1 ? 'PERSON' : 'PERSONS'}
              </div>
            </div>

            {/* Stylized Simulated QR Code */}
            <div className="p-3 bg-white rounded-2xl shadow-inner flex flex-col items-center justify-center">
              <svg
                className="w-24 h-24"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* 3 Position Detection Patterns */}
                <rect x="5" y="5" width="28" height="28" rx="4" fill="#000" />
                <rect x="9" y="9" width="20" height="20" rx="2" fill="#fff" />
                <rect x="13" y="13" width="12" height="12" rx="1" fill="#000" />

                <rect x="67" y="5" width="28" height="28" rx="4" fill="#000" />
                <rect x="71" y="9" width="20" height="20" rx="2" fill="#fff" />
                <rect x="75" y="13" width="12" height="12" rx="1" fill="#000" />

                <rect x="5" y="67" width="28" height="28" rx="4" fill="#000" />
                <rect x="9" y="71" width="20" height="20" rx="2" fill="#fff" />
                <rect x="13" y="75" width="12" height="12" rx="1" fill="#000" />

                {/* QR Data Grid Dots */}
                <rect x="40" y="8" width="6" height="6" fill="#000" />
                <rect x="52" y="8" width="6" height="6" fill="#000" />
                <rect x="40" y="20" width="6" height="6" fill="#000" />
                <rect x="52" y="26" width="6" height="6" fill="#000" />
                <rect x="8" y="40" width="6" height="6" fill="#000" />
                <rect x="20" y="40" width="6" height="6" fill="#000" />
                <rect x="8" y="52" width="6" height="6" fill="#000" />
                <rect x="20" y="52" width="6" height="6" fill="#000" />

                <rect x="40" y="40" width="6" height="6" fill="#000" />
                <rect x="52" y="40" width="6" height="6" fill="#000" />
                <rect x="64" y="40" width="6" height="6" fill="#000" />
                <rect x="76" y="40" width="6" height="6" fill="#000" />
                <rect x="88" y="40" width="6" height="6" fill="#000" />

                <rect x="40" y="52" width="6" height="6" fill="#000" />
                <rect x="64" y="52" width="6" height="6" fill="#000" />
                <rect x="88" y="52" width="6" height="6" fill="#000" />

                <rect x="40" y="64" width="6" height="6" fill="#000" />
                <rect x="52" y="64" width="6" height="6" fill="#000" />
                <rect x="76" y="64" width="6" height="6" fill="#000" />

                <rect x="40" y="76" width="6" height="6" fill="#000" />
                <rect x="64" y="76" width="6" height="6" fill="#000" />
                <rect x="88" y="76" width="6" height="6" fill="#000" />

                <rect x="52" y="88" width="6" height="6" fill="#000" />
                <rect x="76" y="88" width="6" height="6" fill="#000" />
              </svg>
            </div>

            {/* Reference ID and Copy */}
            <div className="w-full">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Ticket Reference
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                title="Click to copy ticket reference"
                className="w-full mt-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 hover:text-white hover:border-neutral-700 transition flex items-center justify-center gap-1.5"
              >
                <span className="truncate">{booking.id.slice(0, 8)}...</span>
                <span>{copied ? '✓' : '📋'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
