import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCw, X } from 'lucide-react';
import { fetchSeatMap, createHold, releaseHold } from '../seat.api.js';
import { SeatGrid } from '../components/seat-grid.js';
import { HoldTimerBanner } from '../components/hold-timer-banner.js';
import { useCurrentUser } from '../../auth/use-current-user.js';
import { ApiError } from '../../../lib/api-client.js';

function formatPaiseToInr(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

function formatUtcToDateTime(utcStr: string): string {
  const d = new Date(utcStr);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function SeatSelectionPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useCurrentUser();

  const [selectedSeatCodes, setSelectedSeatCodes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Poll seat map every 5 seconds for real-time concurrency status
  const {
    data: seatMap,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['show-seats', showId],
    queryFn: () => fetchSeatMap(showId!),
    enabled: !!showId,
    refetchInterval: 3000,
  });

  const activeHold = seatMap?.currentUserActiveHold;

  // Hold creation mutation
  const holdMutation = useMutation({
    mutationFn: async (seats: string[]) => {
      return createHold(showId!, seats);
    },
    onSuccess: (data) => {
      setSelectedSeatCodes([]);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['show-seats', showId] });
      navigate(`/checkout/${data.holdId}`);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'SEAT_UNAVAILABLE') {
          setErrorMessage(err.message);
          // Invalidate to fetch fresh seat states immediately
          queryClient.invalidateQueries({ queryKey: ['show-seats', showId] });
        } else if (err.code === 'HOLD_ALREADY_ACTIVE') {
          setErrorMessage(err.message);
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('Failed to hold selected seats. Please try again.');
      }
    },
  });

  // Hold release mutation
  const releaseMutation = useMutation({
    mutationFn: async (holdId: string) => {
      return releaseHold(holdId);
    },
    onSuccess: () => {
      setSelectedSeatCodes([]);
      setErrorMessage(null);
      setInfoMessage('Your seat hold has been released.');
      queryClient.invalidateQueries({ queryKey: ['show-seats', showId] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to release seats.');
      }
    },
  });

  const handleToggleSeat = useCallback((seatCode: string) => {
    setErrorMessage(null);
    setInfoMessage(null);

    setSelectedSeatCodes((prev) => {
      if (prev.includes(seatCode)) {
        return prev.filter((s) => s !== seatCode);
      }
      if (prev.length >= 6) {
        setErrorMessage('You can select a maximum of 6 seats per transaction.');
        return prev;
      }
      return [...prev, seatCode].sort();
    });
  }, []);

  const handleHoldSeats = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/shows/${showId}`);
      return;
    }

    if (selectedSeatCodes.length === 0) {
      setErrorMessage('Please select at least 1 seat before proceeding.');
      return;
    }

    holdMutation.mutate(selectedSeatCodes);
  };

  const handleTimerExpired = useCallback(() => {
    setInfoMessage(
      'Your seat hold has expired. The seats have been released back to the auditorium.',
    );
    setSelectedSeatCodes([]);
    queryClient.invalidateQueries({ queryKey: ['show-seats', showId] });
  }, [queryClient, showId]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse py-12">
        <div className="h-20 rounded-2xl bg-neutral-900 border border-neutral-800" />
        <div className="h-96 rounded-2xl bg-neutral-900 border border-neutral-800" />
      </div>
    );
  }

  if (isError || !seatMap) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Auditorium Not Found</h2>
        <p className="text-xs text-neutral-400">
          The requested screening is unavailable or has completed.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 transition"
        >
          &larr; Back to Catalog
        </Link>
      </div>
    );
  }

  const effectiveSeatCodes = activeHold ? activeHold.seatCodes : selectedSeatCodes;
  const totalPricePaise = effectiveSeatCodes.length * seatMap.pricePaise;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div>
          <Link
            to={`/movies/${seatMap.movieId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-amber-400 transition mb-1 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Movie Showtimes</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {seatMap.movieTitle}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span className="text-amber-400 font-semibold">Auditorium {seatMap.screenId}</span>
            <span>•</span>
            <span>{formatUtcToDateTime(seatMap.startsAt)}</span>
            <span>•</span>
            <span className="font-semibold text-white">
              {formatPaiseToInr(seatMap.pricePaise)} / ticket
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-emerald-400">
              {seatMap.availableCount} of {seatMap.totalSeats} seats available
            </div>
            <div className="text-[11px] text-neutral-500">Auto-syncs live updates every 5s</div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Refresh seat availability"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-neutral-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {infoMessage && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-center justify-between">
          <span>{infoMessage}</span>
          <button
            type="button"
            onClick={() => setInfoMessage(null)}
            className="text-neutral-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 5-Minute Hold Timer Banner (when hold is active) */}
      {activeHold && (
        <HoldTimerBanner
          expiresAt={activeHold.expiresAt}
          initialSecondsRemaining={activeHold.secondsRemaining}
          seatCodes={activeHold.seatCodes}
          onExpire={handleTimerExpired}
          onRelease={() => releaseMutation.mutate(activeHold.holdId)}
          isReleasing={releaseMutation.isPending}
        />
      )}

      {/* Main Seat Map Grid */}
      <div className="rounded-3xl border border-neutral-800/80 bg-neutral-900/30 p-6 sm:p-10 backdrop-blur">
        <SeatGrid
          seats={seatMap.seats}
          selectedSeatCodes={effectiveSeatCodes}
          onToggleSeat={handleToggleSeat}
          disabled={Boolean(activeHold)}
        />
      </div>

      {/* Bottom Sticky Checkout Bar */}
      <div className="sticky bottom-4 z-40 rounded-2xl border border-neutral-800 bg-neutral-900/90 backdrop-blur-md p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs text-neutral-400 font-medium">
            {effectiveSeatCodes.length === 0
              ? 'Select up to 6 seats above to continue'
              : `${effectiveSeatCodes.length} seat(s) selected: ${effectiveSeatCodes.join(', ')}`}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
            Total: <span className="text-amber-400">{formatPaiseToInr(totalPricePaise)}</span>
            <span className="text-xs font-normal text-neutral-500 ml-2">
              (incl. all cinema taxes)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeHold ? (
            <Link
              to={`/checkout/${activeHold.holdId}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-extrabold text-center transition shadow-lg shadow-amber-500/20 active:scale-[0.98]"
            >
              Pay (Continue to Checkout) &rarr;
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleHoldSeats}
              disabled={selectedSeatCodes.length === 0 || holdMutation.isPending}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-extrabold transition shadow-lg active:scale-[0.98] ${
                selectedSeatCodes.length === 0
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
              }`}
            >
              {holdMutation.isPending
                ? 'Reserving Seats...'
                : !isAuthenticated
                  ? 'Sign In to Reserve Seats'
                  : 'Continue (Hold 5 min)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
