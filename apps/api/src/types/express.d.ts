import type { UserRole } from '../db/schema/enums.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        role: UserRole;
        email: string;
      };
    }
  }
}

export {};
