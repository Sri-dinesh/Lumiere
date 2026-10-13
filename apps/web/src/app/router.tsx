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

function Header() {
  const { user, isAuthenticated, isAdmin, logout, isLoggingOut } = useCurrentUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight text-amber-400 flex items-center gap-2"
        >
          <span>🎬</span> Lumiere
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-neutral-300 hover:text-white transition">
            Movies
          </Link>
          <Link to="/bookings" className="text-neutral-300 hover:text-white transition">
            My Bookings
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="text-amber-400 hover:text-amber-300 transition flex items-center gap-1.5 font-semibold"
            >
              <span>⚙️</span> Admin Portal
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{user.name}</div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-end gap-1">
                <span>{user.email}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-neutral-800 text-neutral-300'}`}
                >
                  {user.role}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-xs text-neutral-300 font-medium transition"
            >
              {isLoggingOut ? '...' : 'Sign Out'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white font-medium transition"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold transition shadow-sm shadow-amber-500/10"
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
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-800/80 py-6 text-center text-xs text-neutral-500">
        &copy; {new Date().getFullYear()} Lumiere Cinema. Real-time movie ticket booking engine.
      </footer>
    </div>
  );
}

function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>⚙️</span> Cinema Administration
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage movie listings, screen schedules, and auditorium inventory.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/movies"
          className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:border-amber-500/40 transition group"
        >
          <div className="text-2xl mb-2">🎞️</div>
          <h2 className="text-lg font-semibold text-white group-hover:text-amber-400 transition">
            Manage Movies
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Add, edit runtimes, or view cinema catalog titles.
          </p>
        </Link>
        <Link
          to="/admin/shows"
          className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:border-amber-500/40 transition group"
        >
          <div className="text-2xl mb-2">🕒</div>
          <h2 className="text-lg font-semibold text-white group-hover:text-amber-400 transition">
            Schedule Shows
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Create showtimes with non-overlapping screen protection.
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
