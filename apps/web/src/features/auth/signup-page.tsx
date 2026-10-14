import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Film, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../lib/api-client.js';
import type { User } from './use-current-user.js';

interface SignupResponse {
  user: User;
}

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiClient<SignupResponse>('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      queryClient.setQueryData(['me'], data.user);
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      if (err.code === 'EMAIL_IN_USE') {
        setError('An account with this email address already exists. Please sign in instead.');
      } else {
        setError(err.message || 'Failed to create account. Please check your inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 mb-3">
            <Film className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Create an Account</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Register to reserve and book seats at Lumière Cinema.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice Johnson"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
            />
          </div>

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
              placeholder="alice@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Password (min 8 characters)
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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
            {isSubmitting ? 'Creating account...' : 'Create Account & Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-800 text-center">
          <p className="text-sm text-neutral-400">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
