import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'UA':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'A':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['movie-detail', movieId],
    queryFn: () => fetchMovieDetail(movieId!),
    enabled: !!movieId,
    staleTime: 15_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-64 rounded-3xl bg-neutral-900 border border-neutral-800" />
        <div className="h-12 w-96 rounded-xl bg-neutral-900" />
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
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Movie Not Found</h2>
        <p className="text-xs text-neutral-400">
          The requested movie could not be located or may have been updated.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition"
          >
            &larr; Back to Movies
          </Link>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-neutral-950 transition"
          >
            Retry
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
      {/* Breadcrumb navigation */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-amber-400 transition"
        >
          <span>&larr;</span> Back to All Movies
        </Link>
      </div>

      {/* Movie Details Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 backdrop-blur">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster image */}
          <div className="w-full md:w-56 flex-shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-2xl">
            {movie.posterUrl ? (
              <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">🎬</div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getRatingBadgeColor(
                  movie.rating,
                )}`}
              >
                {movie.rating}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-medium">
                {movie.language}
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                • {formatDuration(movie.durationMinutes)}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                Screen 1 • 80 Seats
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {movie.title}
            </h1>

            {movie.description && (
              <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl">
                {movie.description}
              </p>
            )}

            <div className="pt-2 text-xs text-neutral-500 flex items-center gap-4">
              <span>Auditorium: Dolby Atmos 7.1</span>
              <span>•</span>
              <span>Projection: Barco 4K Laser</span>
            </div>
          </div>
        </div>
      </div>

      {/* Showtimes Scheduling Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>📅</span> Select Date & Showtime
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Choose an available showtime below to proceed to real-time seat selection.
          </p>
        </div>

        {showsByDate.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-12 text-center space-y-2">
            <div className="text-3xl">🕒</div>
            <h3 className="text-base font-semibold text-white">No upcoming shows scheduled</h3>
            <p className="text-xs text-neutral-400">
              Check back soon for new showtime additions in Auditorium 1.
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
                    className={`flex flex-col items-center justify-center min-w-[5rem] px-4 py-2.5 rounded-2xl border transition-all text-center ${
                      isSelected
                        ? 'bg-amber-500 border-amber-400 text-neutral-950 font-bold shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 font-medium'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider">{label}</span>
                    <span className="text-sm font-extrabold">{sub}</span>
                  </button>
                );
              })}
            </div>

            {/* Showtimes Grid for selected date */}
            {currentGroup && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
                {currentGroup.shows.map((show) => {
                  const isSoldOut = show.availableCount <= 0;

                  return (
                    <div
                      key={show.id}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                        isSoldOut
                          ? 'border-neutral-800 bg-neutral-950 opacity-60 cursor-not-allowed'
                          : 'border-neutral-800/80 bg-neutral-900/50 hover:border-amber-500/60 hover:bg-neutral-900 hover:shadow-lg hover:shadow-amber-500/10'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white tracking-tight">
                          {show.localTime}
                        </div>
                        <div className="text-xs font-semibold text-amber-400">
                          {formatPaiseToInr(show.pricePaise)}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                        <span
                          className={`text-[11px] font-semibold ${
                            isSoldOut
                              ? 'text-rose-400'
                              : show.availableCount <= 10
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        >
                          {isSoldOut ? 'Sold Out' : `${show.availableCount} seats left`}
                        </span>

                        {!isSoldOut && (
                          <Link
                            to={`/shows/${show.id}`}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition shadow-sm"
                          >
                            Select
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
