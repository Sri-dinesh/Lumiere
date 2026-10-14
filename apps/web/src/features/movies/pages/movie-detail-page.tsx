import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Film,
  Tv,
  Volume2,
  Armchair,
  Sparkles,
  Ticket,
  RefreshCw,
} from 'lucide-react';
import { fetchMovieDetail } from '../movie.api.js';
import type { MovieRating } from '../movie.types.js';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatPaiseToInr(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

function getRatingBadgeColor(rating: MovieRating): string {
  switch (rating) {
    case 'U':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10';
    case 'UA':
      return 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-amber-500/10';
    case 'A':
      return 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-rose-500/10';
    default:
      return 'bg-neutral-800 text-neutral-300 border-neutral-700';
  }
}

function formatDatePill(dateStr: string): { label: string; sub: string } {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const d = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  let label = d.toLocaleDateString('en-US', { weekday: 'short' });
  if (target.getTime() === today.getTime()) {
    label = 'Today';
  } else if (target.getTime() === tomorrow.getTime()) {
    label = 'Tomorrow';
  }

  const sub = `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
  return { label, sub };
}

export function MovieDetailPage() {
  const { movieId } = useParams<{ movieId: string }>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['movie-detail', movieId],
    queryFn: () => fetchMovieDetail(movieId!),
    enabled: !!movieId,
    staleTime: 15_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-72 rounded-3xl bg-neutral-900 border border-neutral-800" />
        <div className="h-12 w-80 rounded-xl bg-neutral-900" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-neutral-900 border border-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto">
          <Film className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Movie Not Found</h2>
        <p className="text-xs text-neutral-400">
          The requested movie listing could not be found or has concluded its screening schedule.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition border border-neutral-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Movies</span>
          </Link>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const { movie, showsByDate } = data;
  const activeDate = selectedDate || showsByDate[0]?.localDate;
  const currentGroup = showsByDate.find((g) => g.localDate === activeDate);

  return (
    <div className="space-y-10 pb-16">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-amber-400 transition group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to All Now Showing</span>
        </Link>
      </div>

      {/* Movie Details Hero Showcase */}
      <div className="relative overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-900/60 p-6 sm:p-10 backdrop-blur-md shadow-2xl">
        <div className="absolute right-0 top-0 -mr-24 -mt-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Image */}
          <div className="w-full md:w-60 flex-shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-2xl group">
            {!imageError && movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                onError={() => setImageError(true)}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-neutral-900 to-neutral-950">
                <Film className="h-12 w-12 text-amber-400 mb-2" />
                <span className="text-sm font-bold text-white">{movie.title}</span>
                <span className="text-xs text-amber-400/80 mt-1">Lumiere Cinema</span>
              </div>
            )}
          </div>

          {/* Details & Metadata */}
          <div className="flex-1 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getRatingBadgeColor(
                  movie.rating,
                )}`}
              >
                {movie.rating}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-200 font-semibold border border-neutral-700/60">
                {movie.language}
              </span>
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                <Clock className="h-3 w-3 text-neutral-500" />
                {formatDuration(movie.durationMinutes)}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Auditorium 1 • 80 Seats
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {movie.title}
            </h1>

            {movie.description && (
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl font-normal">
                {movie.description}
              </p>
            )}

            {/* Experience credentials */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400 border-t border-neutral-800/80">
              <span className="flex items-center gap-1.5">
                <Tv className="h-3.5 w-3.5 text-amber-400" /> Barco 4K Laser Projection
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-amber-400" /> Dolby Atmos 7.1 Surround
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Armchair className="h-3.5 w-3.5 text-amber-400" /> 80 Luxury Recliners
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Showtimes Scheduling Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-400" />
              <span>Select Date & Showtime</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Choose an available showtime below to proceed to real-time seat reservation.
            </p>
          </div>
        </div>

        {showsByDate.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-12 text-center space-y-3">
            <Clock className="h-8 w-8 text-neutral-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Upcoming Shows Scheduled</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Screenings for this film are currently being scheduled. Check back shortly for updated
              Auditorium 1 showtimes.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Date Selector Pills */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {showsByDate.map((group) => {
                const { label, sub } = formatDatePill(group.localDate);
                const isSelected = group.localDate === activeDate;

                return (
                  <button
                    key={group.localDate}
                    type="button"
                    onClick={() => setSelectedDate(group.localDate)}
                    className={`flex flex-col items-center justify-center min-w-[5.5rem] px-5 py-3 rounded-2xl border transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 border-amber-400 text-neutral-950 font-bold shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 font-medium'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider font-semibold">
                      {label}
                    </span>
                    <span className="text-sm font-extrabold mt-0.5">{sub}</span>
                  </button>
                );
              })}
            </div>

            {/* Showtimes Grid for selected date */}
            {currentGroup && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                {currentGroup.shows.map((show) => {
                  const isSoldOut = show.availableCount <= 0;

                  return (
                    <div
                      key={show.id}
                      className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all ${
                        isSoldOut
                          ? 'border-neutral-800/80 bg-neutral-950 opacity-60 cursor-not-allowed'
                          : 'border-neutral-800/80 bg-neutral-900/50 hover:border-amber-500/60 hover:bg-neutral-900/90 hover:shadow-xl hover:shadow-amber-500/10'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-extrabold text-white tracking-tight">
                            {show.localTime}
                          </span>
                          <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                            {formatPaiseToInr(show.pricePaise)}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                          <Tv className="h-3 w-3 text-neutral-500" />
                          <span>Auditorium 1 • 4K Laser</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-neutral-800/80 flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isSoldOut
                              ? 'text-rose-400'
                              : show.availableCount <= 10
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        >
                          {isSoldOut ? 'Sold Out' : `${show.availableCount} of 80 seats left`}
                        </span>

                        {!isSoldOut && (
                          <Link
                            to={`/shows/${show.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 px-4 py-2 text-xs font-bold text-neutral-950 transition shadow-md shadow-amber-500/15 active:scale-95"
                          >
                            <Ticket className="h-3.5 w-3.5" />
                            <span>Select Seats</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
