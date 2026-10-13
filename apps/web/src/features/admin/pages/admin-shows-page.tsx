import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchAdminShows, createShow, deleteShow, fetchShowReport } from '../../shows/show.api.js';
import { fetchMovies } from '../../movies/movie.api.js';
import type { AdminShow, CreateShowPayload, ShowReport } from '../../shows/show.types.js';
import { ApiError } from '../../../lib/api-client.js';

function formatPaiseToInr(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

function formatUtcToDateTime(utcStr: string): string {
  const d = new Date(utcStr);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function AdminShowsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReportShowId, setSelectedReportShowId] = useState<string | null>(null);
  const [filterMovieId, setFilterMovieId] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form states
  const [movieId, setMovieId] = useState('');
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('14:30');
  const [priceInr, setPriceInr] = useState(250);

  // Fetch movies for dropdown
  const { data: movies = [] } = useQuery({
    queryKey: ['admin-movies-lookup'],
    queryFn: () => fetchMovies({ limit: 100 }),
  });

  // Fetch scheduled shows
  const {
    data: shows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-shows', filterMovieId, filterDate],
    queryFn: () =>
      fetchAdminShows({
        movieId: filterMovieId || undefined,
        date: filterDate || undefined,
      }),
  });

  // Fetch show report when modal is open (Bonus B9)
  const { data: showReport, isLoading: isReportLoading } = useQuery<ShowReport>({
    queryKey: ['admin-show-report', selectedReportShowId],
    queryFn: () => fetchShowReport(selectedReportShowId!),
    enabled: !!selectedReportShowId,
  });

  const openScheduleModal = () => {
    setMovieId(movies[0]?.id || '');
    // Default to tomorrow's date in local ISO
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setLocalDate(tomorrow.toISOString().split('T')[0] || '');
    setLocalTime('14:30');
    setPriceInr(250);
    setFormError(null);
    setIsModalOpen(true);
  };

  const scheduleMutation = useMutation({
    mutationFn: (payload: CreateShowPayload) => createShow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shows'] });
      queryClient.invalidateQueries({ queryKey: ['movie-detail'] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'SHOW_INTERVAL_COLLISION') {
          setFormError(
            'Schedule Collision: Another show is already scheduled in Auditorium 1 during this time interval.',
          );
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError('Failed to schedule show.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shows'] });
      queryClient.invalidateQueries({ queryKey: ['movie-detail'] });
      setDeleteError(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete show.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!movieId) {
      setFormError('Please select a movie.');
      return;
    }

    if (!localDate) {
      setFormError('Please pick a date.');
      return;
    }

    scheduleMutation.mutate({
      movieId,
      localDate,
      localTime,
      pricePaise: Math.round(priceInr * 100),
    });
  };

  const handleDelete = (s: AdminShow) => {
    setDeleteError(null);
    if (
      window.confirm(
        `Are you sure you want to delete the show for "${s.movieTitle}" at ${formatUtcToDateTime(
          s.startsAt,
        )}?`,
      )
    ) {
      deleteMutation.mutate(s.id);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <Link to="/admin" className="hover:text-white transition">
              Admin Portal
            </Link>
            <span>/</span>
            <span className="text-white">Shows</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Auditorium Show Scheduling
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Schedule screenings in Auditorium 1 with automated 80-seat generation and conflict
            prevention.
          </p>
        </div>

        <button
          type="button"
          onClick={openScheduleModal}
          className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/10 flex items-center gap-1.5"
        >
          <span>➕</span> Schedule Show
        </button>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="text-neutral-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-neutral-400 font-medium">Filter by Movie:</label>
          <select
            value={filterMovieId}
            onChange={(e) => setFilterMovieId(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="">All Movies</option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-neutral-400 font-medium">Filter by Date:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-white focus:border-amber-500 focus:outline-none"
          />
        </div>

        {(filterMovieId || filterDate) && (
          <button
            type="button"
            onClick={() => {
              setFilterMovieId('');
              setFilterDate('');
            }}
            className="ml-auto text-amber-400 hover:text-amber-300 font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Shows Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400 animate-pulse">
            Loading scheduled shows...
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-xs text-rose-400">
            Failed to load shows schedule.
          </div>
        ) : shows.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-3xl">🕒</div>
            <p className="text-sm font-semibold text-white">No scheduled shows found</p>
            <p className="text-xs text-neutral-400">
              Click &quot;Schedule Show&quot; above to add a screening slot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Movie</th>
                  <th className="py-3 px-4">Screening Interval (IST)</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Seats Inventory</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {shows.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div>{s.movieTitle}</div>
                      <div className="text-[11px] text-neutral-500 font-normal">
                        Screen {s.screenId} • {s.movieDurationMinutes} min
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">
                        {formatUtcToDateTime(s.startsAt)}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        until {formatUtcToDateTime(s.endsAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400">
                      {formatPaiseToInr(s.pricePaise)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">
                          {s.availableCount} available
                        </span>
                        <span>•</span>
                        <span className="text-neutral-400">{s.bookedCount} booked</span>
                        <span className="text-neutral-600">/ 80 total</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReportShowId(s.id)}
                        className="px-2.5 py-1 rounded-lg border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-medium transition text-xs"
                      >
                        📊 Report
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        disabled={deleteMutation.isPending}
                        className="px-2.5 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 font-medium transition text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Show Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-white">Schedule Show (Auditorium 1)</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 leading-relaxed">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Select Movie *</label>
                <select
                  required
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.durationMinutes} min, {m.rating})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={localDate}
                    onChange={(e) => setLocalDate(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Showtime (HH:mm) *
                  </label>
                  <input
                    type="time"
                    required
                    value={localTime}
                    onChange={(e) => setLocalTime(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Ticket Price (INR ₹) *
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  max={10000}
                  value={priceInr}
                  onChange={(e) => setPriceInr(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Stored as {priceInr * 100} paise in database.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-neutral-400 space-y-1">
                <div className="font-semibold text-amber-300">Auditorium Guarantee:</div>
                <div>Screen 1 will automatically initialize exactly 80 seats (A1–H10).</div>
                <div>Overlap detection ensures no schedule collision can occur.</div>
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
                  disabled={scheduleMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition shadow-sm"
                >
                  {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show Report Modal (Bonus B9) */}
      {selectedReportShowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Performance Report (Bonus B9)
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  {showReport?.movieTitle || 'Loading Report...'}
                </h2>
                {showReport && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatUtcToDateTime(showReport.startsAt)} • Screen {showReport.screenId}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportShowId(null)}
                className="w-8 h-8 rounded-full border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {isReportLoading || !showReport ? (
              <div className="py-12 text-center text-xs text-neutral-400 animate-pulse">
                Fetching occupancy and financial report...
              </div>
            ) : (
              <div className="space-y-6">
                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] font-bold uppercase text-neutral-500">
                      Occupancy
                    </div>
                    <div className="text-xl font-black text-amber-400 mt-1">
                      {showReport.occupancyPercent}%
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] font-bold uppercase text-neutral-500">
                      Booked Seats
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      {showReport.bookedCount}{' '}
                      <span className="text-xs font-normal text-neutral-500">/ 80</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] font-bold uppercase text-neutral-500">Revenue</div>
                    <div className="text-xl font-black text-emerald-400 mt-1">
                      {formatPaiseToInr(showReport.simulatedRevenuePaise)}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] font-bold uppercase text-neutral-500">
                      Ticket Price
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      {formatPaiseToInr(showReport.pricePaise)}
                    </div>
                  </div>
                </div>

                {/* Mini Seat Inventory Overview */}
                <div className="rounded-2xl bg-neutral-950/50 p-4 border border-neutral-800 space-y-3">
                  <div className="text-xs font-bold text-neutral-300">
                    Auditorium Seat Layout (80 Seats)
                  </div>
                  <div className="grid grid-cols-10 gap-1 max-w-md mx-auto">
                    {showReport.seats.map((seat) => (
                      <div
                        key={seat.seatCode}
                        title={`Seat ${seat.seatCode} - ${seat.status}`}
                        className={`h-5 text-[9px] font-bold rounded flex items-center justify-center ${
                          seat.status === 'BOOKED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : seat.status === 'HELD'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-neutral-800/80 text-neutral-400 border border-neutral-700/50'
                        }`}
                      >
                        {seat.seatCode}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-[10px] text-neutral-400 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-neutral-800 border border-neutral-700" />{' '}
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500" />{' '}
                      Held
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500" />{' '}
                      Booked
                    </span>
                  </div>
                </div>

                {/* Attendee Bookings Table */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-neutral-300">
                    Confirmed Orders ({showReport.bookings.length})
                  </div>

                  {showReport.bookings.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-500">
                      No confirmed bookings yet for this screening.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-950 text-neutral-400 font-semibold sticky top-0">
                          <tr>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Seats</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Booked At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                          {showReport.bookings.map((b) => (
                            <tr key={b.bookingId} className="hover:bg-neutral-800/30">
                              <td className="p-3">
                                <div className="font-semibold text-white">{b.customerName}</div>
                                <div className="text-[10px] text-neutral-500">
                                  {b.customerEmail}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {b.seatCodes.map((s) => (
                                    <span
                                      key={s}
                                      className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 font-bold text-white">
                                {formatPaiseToInr(b.totalPaise)}
                              </td>
                              <td className="p-3 text-[11px] text-neutral-400">
                                {formatUtcToDateTime(b.bookedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
