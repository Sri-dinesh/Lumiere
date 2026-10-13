import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMovies } from '../movie.api.js';
import { MovieCard } from '../components/movie-card.js';

export function MovieCatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');

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

  // Extract unique languages
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    movies.forEach((m) => {
      if (m.language) langs.add(m.language);
    });
    return Array.from(langs).sort();
  }, [movies]);

  // Filter movies by language on client
  const filteredMovies = useMemo(() => {
    if (selectedLanguage === 'ALL') return movies;
    return movies.filter((m) => m.language.toLowerCase() === selectedLanguage.toLowerCase());
  }, [movies, selectedLanguage]);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-amber-950/30 p-8 sm:p-12 border border-neutral-800">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <span>✨</span> Lumiere Cinema • Auditorium 1
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Cinematic Magic, <br />
            <span className="text-amber-400">Guaranteed Precision.</span>
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 max-w-lg leading-relaxed">
            Experience 4K Laser Projection and Dolby Atmos in our intimate 80-seat auditorium.
            Reserve your exact seats in real time without booking surprises.
          </p>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500 text-sm">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search films by title..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-amber-500/60 focus:bg-neutral-900 focus:outline-none transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Language Filter Chips */}
        {availableLanguages.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedLanguage('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedLanguage === 'ALL'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              All Languages
            </button>
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedLanguage.toLowerCase() === lang.toLowerCase()
                    ? 'bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Movies Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-2xl bg-neutral-900/60 border border-neutral-800/50"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center space-y-3">
          <p className="text-sm text-rose-300">Unable to load movies at this time.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition"
          >
            Try Again
          </button>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-12 text-center space-y-3">
          <div className="text-3xl">🎞️</div>
          <h3 className="text-base font-semibold text-white">No movies found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchTerm
              ? `No film titles matched "${searchTerm}". Try a different search query.`
              : 'No movies are currently scheduled in this language.'}
          </p>
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
