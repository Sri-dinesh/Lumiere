import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Film, Sparkles, Volume2, Tv, Armchair, RefreshCw } from 'lucide-react';
import { fetchMovies } from '../movie.api.js';
import { MovieCard } from '../components/movie-card.js';
import type { MovieRating } from '../movie.types.js';

export function MovieCatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [selectedRating, setSelectedRating] = useState<string>('ALL');

  const {
    data: movies = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['movies', searchTerm],
    queryFn: () => fetchMovies({ search: searchTerm || undefined }),
    staleTime: 30_000,
  });

  // Extract unique languages with counts
  const languageOptions = useMemo(() => {
    const counts = new Map<string, number>();
    movies.forEach((m) => {
      if (m.language) {
        counts.set(m.language, (counts.get(m.language) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [movies]);

  // Extract ratings present in catalog
  const ratingsList: MovieRating[] = ['U', 'UA', 'A'];

  // Filter movies by language and rating on client
  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchesLang =
        selectedLanguage === 'ALL' || m.language.toLowerCase() === selectedLanguage.toLowerCase();
      const matchesRating = selectedRating === 'ALL' || m.rating === selectedRating;
      return matchesLang && matchesRating;
    });
  }, [movies, selectedLanguage, selectedRating]);

  const hasActiveFilters =
    searchTerm !== '' || selectedLanguage !== 'ALL' || selectedRating !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedLanguage('ALL');
    setSelectedRating('ALL');
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Luxury Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/95 to-amber-950/30 p-8 sm:p-12 border border-neutral-800/80 shadow-2xl backdrop-blur-md">
        {/* Ambient background glow accents */}
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 h-64 w-64 rounded-full bg-amber-600/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          {/* Cinema Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-neutral-950/60 px-3.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Auditorium 1 • Screen Active</span>
            <span className="text-amber-500/40">|</span>
            <span className="text-neutral-400 font-normal">Real-Time Seat Hold Guaranteed</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Cinematic Magic, <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
              Guaranteed Precision.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-neutral-300 max-w-xl leading-relaxed font-normal">
            Immerse yourself in 4K Laser Projection and Dolby Atmos within our intimate 80-seat
            boutique auditorium. Pick your exact seat with zero double-booking risk.
          </p>

          {/* Auditorium Specs Chips */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-300">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-neutral-300 backdrop-blur">
              <Tv className="h-3.5 w-3.5 text-amber-400" />
              <span>4K Barco Laser</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-neutral-300 backdrop-blur">
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Dolby Atmos 7.1</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-neutral-300 backdrop-blur">
              <Armchair className="h-3.5 w-3.5 text-amber-400" />
              <span>80 Luxury Recliners</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-neutral-300 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Instant Confirmation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search films by title (e.g. Dune, Oppenheimer, Interstellar)..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-amber-500/60 focus:bg-neutral-900 focus:outline-none transition shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-white transition"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Language Pills */}
            <div className="inline-flex items-center rounded-xl bg-neutral-900/80 p-1 border border-neutral-800/80 text-xs">
              <button
                type="button"
                onClick={() => setSelectedLanguage('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  selectedLanguage === 'ALL'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All Languages ({movies.length})
              </button>
              {languageOptions.map(([lang, count]) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    selectedLanguage.toLowerCase() === lang.toLowerCase()
                      ? 'bg-amber-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {lang} ({count})
                </button>
              ))}
            </div>

            {/* Rating Pills */}
            <div className="inline-flex items-center rounded-xl bg-neutral-900/80 p-1 border border-neutral-800/80 text-xs">
              <button
                type="button"
                onClick={() => setSelectedRating('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedRating === 'ALL'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All Certs
              </button>
              {ratingsList.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSelectedRating(rating)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    selectedRating === rating
                      ? 'bg-amber-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-xs text-neutral-300 font-medium transition"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Catalog summary count */}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-neutral-800/50">
          <span>
            Showing <strong className="text-white font-semibold">{filteredMovies.length}</strong> of{' '}
            <strong className="text-white font-semibold">{movies.length}</strong> blockbuster
            productions
          </span>
          <span className="hidden sm:inline text-neutral-500">
            Screen 1 • Daily shows scheduled with verified seating
          </span>
        </div>
      </div>

      {/* Movies Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-2xl bg-neutral-900/60 border border-neutral-800/50"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-10 text-center space-y-4">
          <Film className="h-10 w-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Unable to Load Movie Catalog</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            We encountered a temporary network issue connecting to the cinema database. Please check
            your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 px-4 py-2 text-xs font-semibold text-white transition border border-neutral-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-12 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto">
            <Film className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Movies Match Your Criteria</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchTerm
              ? `No films matched "${searchTerm}". Try a different title or reset your filters.`
              : 'No movies match the selected language and certificate filters.'}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-neutral-950 transition"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
