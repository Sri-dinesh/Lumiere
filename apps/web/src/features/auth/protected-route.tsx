import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from './use-current-user.js';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-r-transparent align-[-0.125em]" />
        <p className="mt-4 text-sm text-neutral-400">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <Outlet />;
}
