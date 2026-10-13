import { randomBytes, createHash } from 'crypto';
import argon2 from 'argon2';
import { authRepository, AuthRepository } from './auth.repository.js';
import type { SignupInput, LoginInput } from './auth.schema.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  private generateToken(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  async signup(input: SignupInput) {
    const email = input.email.trim().toLowerCase();

    // Duplicate check
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      throw new AppError('EMAIL_IN_USE', 409, 'An account with this email address already exists.');
    }

    // Password hashing with Argon2id
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });

    // Forced role CUSTOMER
    const user = await this.repo.createUser({
      name: input.name.trim(),
      email,
      passwordHash,
      role: 'CUSTOMER',
    });

    // Auto-login session creation
    const { rawToken, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);

    await this.repo.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      rawToken,
    };
  }

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();

    const user = await this.repo.findUserByEmail(email);
    if (!user) {
      // Generic invalid credentials message to prevent user enumeration
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password.');
    }

    const isValidPassword = await argon2.verify(user.passwordHash, input.password);
    if (!isValidPassword) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password.');
    }

    const { rawToken, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);

    await this.repo.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      rawToken,
    };
  }

  async logout(rawToken: string | null): Promise<void> {
    if (!rawToken) return;
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.repo.revokeSession(tokenHash);
  }

  async getMe(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 401, 'User session not found.');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}

export const authService = new AuthService();
