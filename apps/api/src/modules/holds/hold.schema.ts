import { z } from 'zod';

const seatCodeRegex = /^[A-H]([1-9]|10)$/;

export const createHoldSchema = z
  .object({
    seatCodes: z
      .array(
        z
          .string()
          .trim()
          .regex(seatCodeRegex, 'Seat code must be between A1 and H10 (e.g. A1, C5, H10)'),
      )
      .min(1, 'At least 1 seat must be selected')
      .max(6, 'Maximum of 6 seats can be held in a single reservation')
      .refine(
        (seats) => new Set(seats).size === seats.length,
        'Duplicate seat codes are not allowed in selection',
      ),
  })
  .strict();

export type CreateHoldInput = z.infer<typeof createHoldSchema>;
