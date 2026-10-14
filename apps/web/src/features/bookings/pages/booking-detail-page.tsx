import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, CheckCircle2, XCircle, Ticket, X } from 'lucide-react';
import { getBookingById, cancelBooking } from '../booking.api.js';
import { TicketPass } from '../components/ticket-pass.js';
import { ApiError } from '../../../lib/api-client.js';

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const queryClient = useQueryClient();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: booking,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: () => getBookingById(bookingId!),
    enabled: !!bookingId,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return cancelBooking(bookingId!);
    },
    onSuccess: () => {
      setShowCancelModal(false);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['booking-detail', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['show-seats'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to cancel booking. Please try again.');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-neutral-800 rounded-lg" />
        <div className="h-96 bg-neutral-900 rounded-3xl border border-neutral-800" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto">
          <Ticket className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <p className="text-sm text-neutral-400">
          The requested booking ticket could not be found or you do not have permission to view it.
        </p>
        <Link
          to="/bookings"
          className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition"
        >
          View My Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/bookings"
          className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1.5 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to My Bookings</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Pass</span>
          </button>
        </div>
      </div>

      {/* Booking Status Banner */}
      {booking.status === 'CONFIRMED' ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
          <span className="text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Booking Confirmed! Present this digital ticket at Auditorium 1 entrance.</span>
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-center">
          <span className="text-rose-400 text-sm font-bold flex items-center justify-center gap-2">
            <XCircle className="h-4 w-4" />
            <span>This booking has been cancelled and refunded. Seats released to inventory.</span>
          </span>
        </div>
      )}

      {/* Main Ticket Pass */}
      <TicketPass
        booking={booking}
        onCancel={() => setShowCancelModal(true)}
        isCancelling={cancelMutation.isPending}
      />

      {/* Cancellation policy note */}
      {booking.status === 'CONFIRMED' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-xs text-neutral-400 space-y-1">
          <div className="font-semibold text-neutral-300">Cancellation Policy (Bonus B8)</div>
          <p>
            Tickets can be cancelled up to 2 hours prior to scheduled showtime. Once cancelled,
            seats are immediately released for other patrons to book.
          </p>
          {!booking.canCancel && (
            <p className="text-amber-400 font-medium">
              ⚠️ This screening starts in less than 2 hours. Cancellations are no longer permitted.
            </p>
          )}
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <X className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Cancel Movie Booking?</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Are you sure you want to cancel your reservation for{' '}
                <strong className="text-white">{booking.movieTitle}</strong>? Your{' '}
                {booking.seatCodes.length} seat(s) ({booking.seatCodes.join(', ')}) will be released
                immediately back to the public pool.
              </p>
            </div>

            {actionError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setActionError(null);
                }}
                disabled={cancelMutation.isPending}
                className="px-4 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition shadow-lg shadow-rose-500/20 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel & Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
