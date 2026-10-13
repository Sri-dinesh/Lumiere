import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useCurrentUser } from './use-current-user.js';

export function AdminRoute() {
  const { isAuthenticated, isAdmin, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-r-transparent align-[-0.125em]" />
        <p className="mt-4 text-sm text-neutral-400">Verifying administrative credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <div className="text-4xl">🛑</div>
        <h1 className="text-2xl font-bold text-white">403 — Access Forbidden</h1>
        <p className="text-neutral-400 text-sm">
          You are currently signed in as a customer. Administrator privileges are required to access
          this portal.
        </p>
        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition"
          >
            Return to Movie Catalog
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
