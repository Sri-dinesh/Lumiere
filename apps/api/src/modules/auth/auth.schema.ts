import { z } from 'zod';

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    email: z.string().trim().toLowerCase().email('Invalid email address').max(320),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address').max(320),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
