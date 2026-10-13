import { Link } from 'react-router-dom';
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

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <div className="group relative flex flex-col rounded-2xl bg-neutral-900/60 border border-neutral-800/80 overflow-hidden hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
      {/* Poster image container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-700">
            <span className="text-4xl">🎬</span>
          </div>
        )}

        {/* Rating badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border backdrop-blur-md ${getRatingBadgeColor(
              movie.rating,
            )}`}
          >
            {movie.rating}
          </span>
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent opacity-80" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold text-white tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors">
          {movie.title}
        </h3>

        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400 font-medium">
          <span>{movie.language}</span>
          <span>•</span>
          <span>{formatDuration(movie.durationMinutes)}</span>
        </div>

        {movie.description && (
          <p className="mt-2 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {movie.description}
          </p>
        )}

        <div className="mt-auto pt-4">
          <Link
            to={`/movies/${movie.id}`}
            className="flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:bg-amber-400 active:scale-[0.98] transition-all shadow-md shadow-amber-500/10"
          >
            Book Tickets
          </Link>
        </div>
      </div>
    </div>
  );
}
