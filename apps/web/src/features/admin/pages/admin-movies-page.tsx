import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Film, X } from 'lucide-react';
import { fetchMovies, createMovie, updateMovie, deleteMovie } from '../../movies/movie.api.js';
import type { Movie, MovieRating, CreateMoviePayload } from '../../movies/movie.types.js';
import { ApiError } from '../../../lib/api-client.js';

export function AdminMoviesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [language, setLanguage] = useState('English');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [rating, setRating] = useState<MovieRating>('UA');

  const {
    data: movies = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-movies'],
    queryFn: () => fetchMovies({ limit: 100 }),
  });

  const openCreateModal = () => {
    setEditingMovie(null);
    setTitle('');
    setDescription('');
    setPosterUrl('');
    setLanguage('English');
    setDurationMinutes(120);
    setRating('UA');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: Movie) => {
    setEditingMovie(m);
    setTitle(m.title);
    setDescription(m.description || '');
    setPosterUrl(m.posterUrl || '');
    setLanguage(m.language);
    setDurationMinutes(m.durationMinutes);
    setRating(m.rating);
    setFormError(null);
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateMoviePayload) => {
      if (editingMovie) {
        return updateMovie(editingMovie.id, payload);
      }
      return createMovie(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Failed to save movie details.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMovie(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setDeleteError(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete movie.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Movie title is required.');
      return;
    }

    saveMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      posterUrl: posterUrl.trim() || null,
      language: language.trim(),
      durationMinutes: Number(durationMinutes),
      rating,
    });
  };

  const handleDelete = (m: Movie) => {
    setDeleteError(null);
    if (
      window.confirm(
        `Are you sure you want to delete "${m.title}"? Unbooked shows will be removed.`,
      )
    ) {
      deleteMutation.mutate(m.id);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <Link to="/admin" className="hover:text-white transition">
              Admin Portal
            </Link>
            <span>/</span>
            <span className="text-white">Movies</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Movie Management
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Create, update catalog entries, and maintain screen runtime metadata.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:from-amber-400 hover:to-amber-300 transition shadow-md shadow-amber-500/10 flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Movie</span>
        </button>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="text-neutral-400 hover:text-white font-bold cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Movies Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400 animate-pulse">
            Loading movie catalog...
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-xs text-rose-400">Failed to load movies.</div>
        ) : movies.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto">
              <Film className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-white">No movies found</p>
            <p className="text-xs text-neutral-400">
              Click &quot;Add New Movie&quot; to add your first title.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Poster</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {movies.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="h-12 w-9 rounded-md overflow-hidden bg-neutral-950 border border-neutral-800">
                        {m.posterUrl ? (
                          <img
                            src={m.posterUrl}
                            alt={m.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-amber-400">
                            <Film className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div>{m.title}</div>
                      {m.description && (
                        <div className="text-[11px] text-neutral-500 line-clamp-1 max-w-xs font-normal">
                          {m.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{m.language}</td>
                    <td className="py-3 px-4">{m.durationMinutes} min</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-neutral-700 bg-neutral-800 text-neutral-200">
                        {m.rating}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="px-2.5 py-1 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 font-medium transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m)}
                          disabled={deleteMutation.isPending}
                          className="px-2.5 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 font-medium transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Movie Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingMovie ? 'Edit Movie' : 'Add New Movie'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Movie Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Inception"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Description / Synopsis
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Plot summary or highlights..."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Poster Image URL</label>
                <input
                  type="url"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Language *</label>
                  <input
                    type="text"
                    required
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="English"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Duration (min) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={600}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Rating *</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value as MovieRating)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="U">U (Universal)</option>
                    <option value="UA">UA (Parental)</option>
                    <option value="A">A (Adults Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition shadow-sm"
                >
                  {saveMutation.isPending
                    ? 'Saving...'
                    : editingMovie
                      ? 'Update Movie'
                      : 'Create Movie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
