import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import { db, type DatabaseClient } from '../../db/client.js';
import { users, sessions } from '../../db/schema/index.js';

export class AuthRepository {
  constructor(private readonly client: DatabaseClient = db) {}

  async findUserByEmail(email: string) {
    const result = await this.client.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  async findUserById(id: string) {
    const result = await this.client
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  }

  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: 'CUSTOMER' | 'ADMIN';
  }) {
    const result = await this.client
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });
    return result[0]!;
  }

  async createSession(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    const result = await this.client
      .insert(sessions)
      .values({
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      })
      .returning();
    return result[0]!;
  }

  async revokeSession(tokenHash: string) {
    await this.client
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
  }

  async findActiveSession(tokenHash: string) {
    const result = await this.client
      .select({
        sessionId: sessions.id,
        userId: users.id,
        role: users.role,
        email: users.email,
        expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`clock_timestamp()`),
        ),
      )
      .limit(1);
    return result[0] || null;
  }
}

export const authRepository = new AuthRepository();
