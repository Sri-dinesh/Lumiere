import { z } from 'zod';

export const processPaymentSchema = z
  .object({
    outcome: z.enum(['success', 'failure']).optional(),
    paymentAction: z.enum(['CONFIRM', 'DECLINE']).optional(),
    paymentReference: z.string().trim().optional(),
  })
  .refine((data) => data.outcome !== undefined || data.paymentAction !== undefined, {
    message:
      "Either 'outcome' ('success' | 'failure') or 'paymentAction' ('CONFIRM' | 'DECLINE') must be provided",
  });

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
