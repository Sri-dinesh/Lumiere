import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['CUSTOMER', 'ADMIN']);
export const movieRatingEnum = pgEnum('movie_rating', ['U', 'UA', 'A']);
export const holdStatusEnum = pgEnum('hold_status', ['ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED']);
export const bookingStatusEnum = pgEnum('booking_status', ['CONFIRMED', 'CANCELLED']);
