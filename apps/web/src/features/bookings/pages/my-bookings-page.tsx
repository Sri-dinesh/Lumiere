import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMyBookings, cancelBooking } from '../booking.api.js';
import { formatPaiseToInr, formatIstDate, formatIstTime } from '../../../lib/formatters.js';
import { ApiError } from '../../../lib/api-client.js';

export function MyBookingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: bookings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => listMyBookings(),
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return cancelBooking(bookingId);
    },
    onSuccess: () => {
      setCancellingBookingId(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['show-seats'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to cancel booking.');
      }
    },
  });

  const now = new Date();

  const upcomingBookings = bookings.filter((b) => {
    const isFuture = new Date(b.startsAt) > now;
    return isFuture && b.status === 'CONFIRMED';
  });

  const pastBookings = bookings.filter((b) => {
    const isPast = new Date(b.startsAt) <= now;
    return isPast || b.status === 'CANCELLED';
  });

  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-4 animate-pulse">
        <div className="h-8 w-48 bg-neutral-800 rounded-lg" />
        <div className="h-10 w-64 bg-neutral-900 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-neutral-900 rounded-3xl border border-neutral-800" />
          <div className="h-48 bg-neutral-900 rounded-3xl border border-neutral-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">Failed to Load Bookings</h2>
        <p className="text-sm text-neutral-400">
          There was an error retrieving your bookings. Please try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          <span>🎟️</span> My Movie Bookings
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Review your upcoming cinema screenings and booking transaction history.
        </p>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <span>Upcoming Screenings</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'upcoming'
                ? 'bg-neutral-950/20 text-neutral-950'
                : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            {upcomingBookings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'past'
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <span>Past & Cancelled</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'past'
                ? 'bg-neutral-950/20 text-neutral-950'
                : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            {pastBookings.length}
          </span>
        </button>
      </div>

      {/* Bookings List */}
      {displayedBookings.length === 0 ? (
        <div className="rounded-3xl border border-neutral-800/80 bg-neutral-900/30 p-12 text-center space-y-4">
          <div className="text-4xl">🍿</div>
          <h3 className="text-lg font-bold text-white">
            {activeTab === 'upcoming' ? 'No Upcoming Screenings' : 'No Past Bookings'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? "You don't have any confirmed movie screenings lined up. Browse our featured movies and reserve your seats now!"
              : 'Your booking archive is currently empty.'}
          </p>
          {activeTab === 'upcoming' && (
            <Link
              to="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition shadow-md shadow-amber-500/20"
            >
              Browse Movies Now
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedBookings.map((b) => (
            <div
              key={b.id}
              className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur flex flex-col justify-between space-y-4 hover:border-neutral-700 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      b.status === 'CONFIRMED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {b.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    #{b.id.slice(0, 8)}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white leading-tight">{b.movieTitle}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">📅</span>
                    <span className="font-semibold text-white">{formatIstDate(b.startsAt)}</span>
                    <span className="text-amber-400 font-bold">
                      ({formatIstTime(b.startsAt)} IST)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">📽️</span>
                    <span>Auditorium 1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">💺</span>
                    <div className="flex flex-wrap gap-1">
                      {b.seatCodes.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-[11px] font-bold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase text-neutral-500">Total Paid</div>
                  <div className="text-sm font-black text-white">
                    {formatPaiseToInr(b.totalPaise)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {b.status === 'CONFIRMED' && b.canCancel && (
                    <button
                      type="button"
                      onClick={() => setCancellingBookingId(b.id)}
                      disabled={cancelMutation.isPending && cancellingBookingId === b.id}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition"
                    >
                      {cancelMutation.isPending && cancellingBookingId === b.id
                        ? 'Cancelling...'
                        : 'Cancel'}
                    </button>
                  )}

                  <Link
                    to={`/bookings/${b.id}`}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shadow-sm"
                  >
                    View Ticket &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Modal for history page */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl text-rose-400">
              ✕
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Cancel Booking?</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Confirming cancellation will release your reserved seats back to Auditorium 1. This
                action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBookingId(null)}
                disabled={cancelMutation.isPending}
                className="px-4 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={() => cancelMutation.mutate(cancellingBookingId)}
                disabled={cancelMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition shadow-lg shadow-rose-500/20 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
