import { createBrowserRouter, RouterProvider, Outlet, Link, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../features/auth/use-current-user.js';
import { LoginPage } from '../features/auth/login-page.js';
import { SignupPage } from '../features/auth/signup-page.js';
import { ProtectedRoute } from '../features/auth/protected-route.js';
import { AdminRoute } from '../features/auth/admin-route.js';
import { MovieCatalogPage } from '../features/movies/pages/movie-catalog-page.js';
import { MovieDetailPage } from '../features/movies/pages/movie-detail-page.js';
import { AdminMoviesPage } from '../features/admin/pages/admin-movies-page.js';
import { AdminShowsPage } from '../features/admin/pages/admin-shows-page.js';
import { SeatSelectionPage } from '../features/seats/pages/seat-selection-page.js';
import { CheckoutPage } from '../features/bookings/pages/checkout-page.js';
import { MyBookingsPage } from '../features/bookings/pages/my-bookings-page.js';
import { BookingDetailPage } from '../features/bookings/pages/booking-detail-page.js';

import { Film, Ticket, SlidersHorizontal, LogOut, Sparkles } from 'lucide-react';

function Header() {
  const { user, isAuthenticated, isAdmin, logout, isLoggingOut } = useCurrentUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-8">
        <Link to="/" className="group flex items-center gap-2.5 focus:outline-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Film className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-wider text-white uppercase font-sans">
              LUMIÈRE
            </span>
            <span className="text-[9px] font-bold tracking-[0.25em] text-amber-400/90 uppercase -mt-1">
              Cinema
            </span>
          </div>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider">
          <Link
            to="/"
            className="text-neutral-300 hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            <Film className="h-3.5 w-3.5 text-neutral-400" />
            <span>Now Showing</span>
          </Link>
          <Link
            to="/bookings"
            className="text-neutral-300 hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            <Ticket className="h-3.5 w-3.5 text-neutral-400" />
            <span>My Bookings</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 font-bold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white tracking-tight">{user.name}</div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-end gap-1.5">
                <span className="truncate max-w-[140px]">{user.email}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                    isAdmin
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                      : 'bg-neutral-800 text-neutral-300 border border-neutral-700/60'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-xs text-neutral-300 hover:text-white font-semibold transition active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5 text-neutral-400" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white font-semibold transition"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 text-xs font-bold transition shadow-md shadow-amber-500/15 active:scale-95"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 selection:bg-amber-500/30 selection:text-amber-200">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-800/80 bg-neutral-950/60 py-8 px-4 text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-neutral-400">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" /> 4K Barco Laser Projection
          </span>
          <span>•</span>
          <span>Dolby Atmos 7.1 Surround</span>
          <span>•</span>
          <span>80 Handcrafted Recliners</span>
          <span>•</span>
          <span className="text-amber-400/90 font-semibold">Zero Double-Booking Guarantee</span>
        </div>
        <p className="text-[11px] text-neutral-500">
          &copy; {new Date().getFullYear()} Lumière Cinema. High-concurrency ACID ticket booking
          engine.
        </p>
      </footer>
    </div>
  );
}

function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <span>Cinema Administration</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage movie listings, schedule non-overlapping showtimes, and monitor auditorium
          inventory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/admin/movies"
          className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 hover:border-amber-500/40 hover:bg-neutral-900/80 transition-all group shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4 group-hover:scale-105 transition-transform">
            <Film className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
            Manage Movies
          </h2>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            Add new titles, update descriptions, assign maturity ratings, and maintain poster
            assets.
          </p>
        </Link>

        <Link
          to="/admin/shows"
          className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 hover:border-amber-500/40 hover:bg-neutral-900/80 transition-all group shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4 group-hover:scale-105 transition-transform">
            <Ticket className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
            Schedule Shows
          </h2>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            Create showtimes with automated PostgreSQL GiST exclusion buffer preventing overlaps.
          </p>
        </Link>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <MovieCatalogPage /> },
      { path: 'movies/:movieId', element: <MovieDetailPage /> },
      { path: 'shows/:showId', element: <SeatSelectionPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      // Customer protected routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'checkout/:holdId', element: <CheckoutPage /> },
          { path: 'bookings', element: <MyBookingsPage /> },
          { path: 'bookings/:bookingId', element: <BookingDetailPage /> },
        ],
      },
      // Admin protected routes
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'movies', element: <AdminMoviesPage /> },
          { path: 'shows', element: <AdminShowsPage /> },
        ],
      },
      {
        path: '*',
        element: <div className="text-center py-20 text-neutral-400">Page not found</div>,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
