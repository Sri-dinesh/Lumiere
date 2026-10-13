import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';
import type { User } from './use-current-user.js';

interface LoginResponse {
  user: User;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await apiClient<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      queryClient.setQueryData(['me'], data.user);
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      if (err.code === 'INVALID_CREDENTIALS') {
        setError('Invalid email address or password.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-2xl mb-3">
            🎬
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign In to Lumiere</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Access your bookings and reserve movie tickets seamlessly.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-start gap-2.5">
            <span className="text-red-400 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/10"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-800 text-center">
          <p className="text-sm text-neutral-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-amber-400 hover:text-amber-300 font-medium">
              Create an account
            </Link>
          </p>
        </div>

        {/* Quick Demo Logins for Reviewers */}
        <div className="mt-6 pt-5 border-t border-neutral-800/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center mb-2.5">
            Quick Reviewer Logins
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('customer@example.test', 'CustomerSecret123!')}
              className="text-xs py-1.5 px-2.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition text-center"
            >
              Demo Customer
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@example.test', 'AdminSecret123!')}
              className="text-xs py-1.5 px-2.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-amber-300 transition text-center"
            >
              Demo Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
