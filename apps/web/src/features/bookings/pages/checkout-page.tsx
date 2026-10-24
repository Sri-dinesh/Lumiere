import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Tv,
  AlertTriangle,
  Hourglass,
  Info,
  CreditCard,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import {
  fetchHoldDetail,
  processPayment,
  releaseHold,
  extendHold,
  type HoldDetailResponse,
} from '../booking.api.js';
import { HoldTimerBanner } from '../../seats/components/hold-timer-banner.js';
import { formatPaiseToInr, formatIstDate, formatIstTime } from '../../../lib/formatters.js';
import { ApiError } from '../../../lib/api-client.js';

export function CheckoutPage() {
  const { holdId } = useParams<{ holdId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isHoldExpired, setIsHoldExpired] = useState(false);

  // 1. Fetch hold reservation details
  const {
    data: hold,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['hold-detail', holdId],
    queryFn: () => fetchHoldDetail(holdId!),
    enabled: !!holdId && !isHoldExpired,
    retry: false,
  });

  // Check if initial hold is already expired
  useEffect(() => {
    if (hold && (hold.status === 'EXPIRED' || hold.secondsRemaining <= 0)) {
      setIsHoldExpired(true);
    }
  }, [hold]);

  // 2. Extend hold mutation
  const extendMutation = useMutation({
    mutationFn: async () => {
      return extendHold(holdId!);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<HoldDetailResponse>(['hold-detail', holdId], (old) => {
        if (!old) return old;
        return {
          ...old,
          expiresAt: data.expiresAt,
          secondsRemaining: data.secondsRemaining,
          isExtended: data.isExtended,
          canExtend: false,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['show-seats'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setPaymentError(err.message);
      } else {
        setPaymentError('Failed to extend hold reservation.');
      }
    },
  });

  // 3. Mock payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (outcome: 'success' | 'failure') => {
      return processPayment(holdId!, outcome);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['show-seats'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });

      if (data.status === 'FAILED') {
        setPaymentError(
          data.message ||
            'Simulated payment declined by bank. You may try again before your hold expires.',
        );
      } else if (data.status === 'CONFIRMED') {
        setPaymentError(null);
        navigate(`/bookings/${data.bookingId}`, { replace: true });
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'HOLD_EXPIRED' || err.status === 409) {
          setIsHoldExpired(true);
          setPaymentError('Your seat hold reservation expired. Please select seats again.');
        } else {
          setPaymentError(err.message);
        }
      } else {
        setPaymentError('Payment processing failed. Please check your connection and retry.');
      }
    },
  });

  // 4. Release hold mutation
  const releaseMutation = useMutation({
    mutationFn: async () => {
      return releaseHold(holdId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-seats'] });
      if (hold?.showId) {
        navigate(`/shows/${hold.showId}`);
      } else {
        navigate('/');
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setPaymentError(err.message);
      } else {
        setPaymentError('Failed to release seats.');
      }
    },
  });

  const handleTimerExpired = useCallback(() => {
    setIsHoldExpired(true);
    setPaymentError(
      'Your reservation window has ended. Seats have been returned to available inventory.',
    );
    queryClient.invalidateQueries({ queryKey: ['show-seats'] });
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-neutral-800 rounded-lg" />
        <div className="h-40 bg-neutral-900 rounded-3xl border border-neutral-800" />
        <div className="h-64 bg-neutral-900 rounded-3xl border border-neutral-800" />
      </div>
    );
  }

  if (fetchError || !hold) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Hold Reservation Not Found</h2>
        <p className="text-sm text-neutral-400">
          This seat reservation may have already expired or does not belong to your account.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition"
        >
          Return to Movies
        </Link>
      </div>
    );
  }

  const seatCount = hold.seatCodes.length;
  const totalPricePaise = hold.pricePaise * seatCount;

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div>
        <Link
          to={`/shows/${hold.showId}`}
          className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1.5 mb-2 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Seat Selection</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Checkout & Mock Payment
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Review your reserved seats and simulate order payment confirmation.
        </p>
      </div>

      {/* Real-time Hold Expiration Banner */}
      {!isHoldExpired ? (
        <HoldTimerBanner
          expiresAt={hold.expiresAt}
          initialSecondsRemaining={hold.secondsRemaining}
          seatCodes={hold.seatCodes}
          onExpire={handleTimerExpired}
          onRelease={() => releaseMutation.mutate()}
          isReleasing={releaseMutation.isPending}
          canExtend={hold.canExtend}
          isExtended={hold.isExtended}
          isExtending={extendMutation.isPending}
          onExtend={() => extendMutation.mutate()}
        />
      ) : (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-6 text-center space-y-3">
          <Hourglass className="h-8 w-8 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-rose-300">Reservation Expired</h3>
          <p className="text-xs text-rose-200/80 max-w-md mx-auto">
            Your seat hold has expired. To prevent double-booking, the auditorium seats have been
            returned to the public pool.
          </p>
          <Link
            to={`/shows/${hold.showId}`}
            className="inline-block px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition"
          >
            Select Seats Again
          </Link>
        </div>
      )}

      {/* Order Summary Card */}
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 backdrop-blur space-y-6 shadow-xl">
        <div className="border-b border-neutral-800/80 pb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            Screening Details
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">{hold.movieTitle}</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300 mt-2 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              {formatIstDate(hold.startsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
              {formatIstTime(hold.startsAt)} IST
            </span>
            <span className="flex items-center gap-1.5">
              <Tv className="h-3.5 w-3.5 text-neutral-400" />
              Screen 1 (80 Seats)
            </span>
          </div>
        </div>

        {/* Seat breakdown */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Selected Seats ({seatCount})
          </div>
          <div className="flex flex-wrap gap-2">
            {hold.seatCodes.map((seat) => (
              <span
                key={seat}
                className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black"
              >
                Seat {seat}
              </span>
            ))}
          </div>
        </div>

        {/* Price Table */}
        <div className="rounded-2xl bg-neutral-950/60 p-4 border border-neutral-800/80 space-y-2 text-xs">
          <div className="flex justify-between text-neutral-400">
            <span>
              Ticket Price ({seatCount} × {formatPaiseToInr(hold.pricePaise)})
            </span>
            <span className="font-semibold text-neutral-200">
              {formatPaiseToInr(totalPricePaise)}
            </span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Booking Fee & Cinema Taxes</span>
            <span className="font-semibold text-emerald-400">₹0.00 (Waived)</span>
          </div>
          <div className="border-t border-neutral-800 pt-2 flex justify-between text-sm sm:text-base font-black text-white">
            <span>Total Payable</span>
            <span className="text-amber-400">{formatPaiseToInr(totalPricePaise)}</span>
          </div>
        </div>

        {/* Payment Error / Decline Notice */}
        {paymentError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Payment Status:</span> {paymentError}
            </div>
          </div>
        )}

        {/* Simulated Payment Actions */}
        {!isHoldExpired ? (
          <div className="space-y-3 pt-2">
            <div className="text-xs text-neutral-400 text-center font-medium flex items-center justify-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-neutral-500" />
              <span>Mock simulation sandbox: no actual financial transaction occurs.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => paymentMutation.mutate('success')}
                disabled={
                  paymentMutation.isPending || releaseMutation.isPending || extendMutation.isPending
                }
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-extrabold text-sm transition shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {paymentMutation.isPending ? (
                  'Processing Simulation...'
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Payment Success</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => paymentMutation.mutate('failure')}
                disabled={
                  paymentMutation.isPending || releaseMutation.isPending || extendMutation.isPending
                }
                className="w-full py-3.5 px-4 rounded-xl border border-neutral-700 hover:border-neutral-600 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 font-bold text-sm transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="h-4 w-4 text-neutral-400" />
                <span>Payment Failure</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => releaseMutation.mutate()}
                disabled={
                  paymentMutation.isPending || releaseMutation.isPending || extendMutation.isPending
                }
                className="text-xs text-neutral-400 hover:text-neutral-200 transition underline underline-offset-4 disabled:opacity-50 cursor-pointer"
              >
                {releaseMutation.isPending
                  ? 'Releasing seats...'
                  : 'Cancel Reservation & Release Seats'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
