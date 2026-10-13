import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

interface MeResponse {
  user: User;
}

export function useCurrentUser() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const data = await apiClient<MeResponse>('/api/v1/auth/me');
        return data.user;
      } catch (err: any) {
        if (err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 60000,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient('/api/v1/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      queryClient.invalidateQueries();
    },
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: Boolean(query.data),
    isAdmin: query.data?.role === 'ADMIN',
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
