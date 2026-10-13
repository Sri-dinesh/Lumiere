import { relations } from 'drizzle-orm';
import { users, sessions } from './users.js';
import { movies, cinemaScreens } from './movies.js';
import { shows } from './shows.js';
import { holds } from './holds.js';
import { bookings } from './bookings.js';
import { showSeats, holdSeats, bookingSeats } from './seats.js';

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  holds: many(holds),
  bookings: many(bookings),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  shows: many(shows),
}));

export const cinemaScreensRelations = relations(cinemaScreens, ({ many }) => ({
  shows: many(shows),
}));

export const showsRelations = relations(shows, ({ one, many }) => ({
  movie: one(movies, {
    fields: [shows.movieId],
    references: [movies.id],
  }),
  screen: one(cinemaScreens, {
    fields: [shows.screenId],
    references: [cinemaScreens.id],
  }),
  seats: many(showSeats),
  holds: many(holds),
  bookings: many(bookings),
}));

export const showSeatsRelations = relations(showSeats, ({ one, many }) => ({
  show: one(shows, {
    fields: [showSeats.showId],
    references: [shows.id],
  }),
  hold: one(holds, {
    fields: [showSeats.holdId],
    references: [holds.id],
  }),
  currentBooking: one(bookings, {
    fields: [showSeats.currentBookingId],
    references: [bookings.id],
  }),
  holdHistory: many(holdSeats),
  bookingHistory: many(bookingSeats),
}));

export const holdsRelations = relations(holds, ({ one, many }) => ({
  user: one(users, {
    fields: [holds.userId],
    references: [users.id],
  }),
  show: one(shows, {
    fields: [holds.showId],
    references: [shows.id],
  }),
  holdSeats: many(holdSeats),
  booking: one(bookings, {
    fields: [holds.id],
    references: [bookings.holdId],
  }),
}));

export const holdSeatsRelations = relations(holdSeats, ({ one }) => ({
  hold: one(holds, {
    fields: [holdSeats.holdId],
    references: [holds.id],
  }),
  showSeat: one(showSeats, {
    fields: [holdSeats.showId, holdSeats.seatCode],
    references: [showSeats.showId, showSeats.seatCode],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  show: one(shows, {
    fields: [bookings.showId],
    references: [shows.id],
  }),
  hold: one(holds, {
    fields: [bookings.holdId],
    references: [holds.id],
  }),
  bookingSeats: many(bookingSeats),
}));

export const bookingSeatsRelations = relations(bookingSeats, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingSeats.bookingId],
    references: [bookings.id],
  }),
  showSeat: one(showSeats, {
    fields: [bookingSeats.showId, bookingSeats.seatCode],
    references: [showSeats.showId, showSeats.seatCode],
  }),
}));
