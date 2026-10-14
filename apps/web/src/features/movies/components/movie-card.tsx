import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Clock, Film, Sparkles } from 'lucide-react';
import type { Movie, MovieRating } from '../movie.types.js';

interface MovieCardProps {
  movie: Movie;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getRatingBadgeStyle(rating: MovieRating): { badge: string; text: string } {
  switch (rating) {
    case 'U':
      return {
        badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10',
        text: 'Universal (All Ages)',
      };
    case 'UA':
      return {
        badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-amber-500/10',
        text: 'Parental Guidance (12+)',
      };
    case 'A':
      return {
        badge: 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-rose-500/10',
        text: 'Adults Only (18+)',
      };
    default:
      return {
        badge: 'bg-neutral-900/80 text-neutral-300 border-neutral-700',
        text: 'Standard',
      };
  }
}

export function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const ratingStyle = getRatingBadgeStyle(movie.rating);

  return (
    <div className="group relative flex flex-col rounded-2xl bg-neutral-900/70 border border-neutral-800/80 overflow-hidden hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 backdrop-blur-sm">
      {/* Poster image container with 2:3 aspect ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gradient-to-b from-neutral-900 to-neutral-950">
        {!imageError && movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border-b border-neutral-800/60">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 group-hover:scale-110 transition-transform">
              <Film className="h-8 w-8" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight line-clamp-2">
              {movie.title}
            </span>
            <span className="mt-1 text-xs text-amber-400/80 font-medium">Lumiere Cinema</span>
          </div>
        )}

        {/* Ambient Top Vignette */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-neutral-950/80 via-neutral-950/30 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-950/80 text-amber-300/90 border border-amber-500/30 backdrop-blur-md shadow-sm">
            <Sparkles className="h-3 w-3 text-amber-400" />
            4K Laser
          </span>
          <span
            title={ratingStyle.text}
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border backdrop-blur-md shadow-sm ${ratingStyle.badge}`}
          >
            {movie.rating}
          </span>
        </div>

        {/* Bottom Fade Gradient for text contrast */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent pointer-events-none" />
      </div>

      {/* Content block */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="text-base font-bold text-white tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors">
          {movie.title}
        </h3>

        {/* Meta badges */}
        <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-400 font-medium">
          <span className="px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-300 text-[11px] font-semibold">
            {movie.language}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-[11px]">
            <Clock className="h-3 w-3 text-neutral-500" />
            {formatDuration(movie.durationMinutes)}
          </span>
        </div>

        {/* Description snippet */}
        {movie.description && (
          <p className="mt-2 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {movie.description}
          </p>
        )}

        {/* Interactive action */}
        <div className="mt-auto pt-4">
          <Link
            to={`/movies/${movie.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:from-amber-400 hover:to-amber-300 active:scale-[0.98] transition-all shadow-md shadow-amber-500/15"
          >
            <Ticket className="h-3.5 w-3.5" />
            <span>Book Tickets</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
