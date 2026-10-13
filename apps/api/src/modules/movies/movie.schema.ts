import { z } from 'zod';

export const createMovieSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().optional(),
    posterUrl: z.string().url('Poster URL must be a valid link').nullable().optional(),
    language: z.string().trim().min(1, 'Language is required').max(50),
    durationMinutes: z.number().int().min(1, 'Duration must be between 1 and 600 minutes').max(600),
    rating: z.enum(['U', 'UA', 'A'], {
      errorMap: () => ({ message: 'Rating must be U, UA, or A' }),
    }),
  })
  .strict();

export const updateMovieSchema = createMovieSchema.partial();

export const listMoviesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().optional(),
});

export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
export type ListMoviesQuery = z.infer<typeof listMoviesQuerySchema>;
