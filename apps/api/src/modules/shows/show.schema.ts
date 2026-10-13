import { z } from 'zod';

export const createShowSchema = z
  .object({
    movieId: z.string().uuid('Invalid movie ID'),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
    localTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be formatted as HH:mm'),
    pricePaise: z.number().int().min(1, 'Price must be greater than zero').max(10000000),
  })
  .strict();

export const listShowsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  movieId: z.string().uuid().optional(),
});

export type CreateShowInput = z.infer<typeof createShowSchema>;
export type ListShowsQuery = z.infer<typeof listShowsQuerySchema>;
