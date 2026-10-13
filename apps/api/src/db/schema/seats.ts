import {
  pgTable,
  uuid,
  varchar,
  char,
  smallint,
  integer,
  timestamp,
  primaryKey,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { shows } from './shows.js';
import { holds } from './holds.js';
import { bookings } from './bookings.js';

export const showSeats = pgTable(
  'show_seats',
  {
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'cascade' }),
    seatCode: varchar('seat_code', { length: 3 }).notNull(),
    rowLabel: char('row_label', { length: 1 }).notNull(),
    seatNumber: smallint('seat_number').notNull(),
    holdId: uuid('hold_id'),
    heldUntil: timestamp('held_until', { withTimezone: true, mode: 'date' }),
    currentBookingId: uuid('current_booking_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.showId, table.seatCode] }),
    unique('show_seats_coordinate_uk').on(table.showId, table.rowLabel, table.seatNumber),
    index('show_seats_hold_id_idx').on(table.holdId),
    index('show_seats_booking_id_idx').on(table.currentBookingId),
  ],
);

export const holdSeats = pgTable(
  'hold_seats',
  {
    holdId: uuid('hold_id')
      .notNull()
      .references(() => holds.id, { onDelete: 'restrict' }),
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'restrict' }),
    seatCode: varchar('seat_code', { length: 3 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.holdId, table.seatCode] }),
    index('hold_seats_show_idx').on(table.showId, table.seatCode),
  ],
);

export const bookingSeats = pgTable(
  'booking_seats',
  {
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'restrict' }),
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'restrict' }),
    seatCode: varchar('seat_code', { length: 3 }).notNull(),
    unitPricePaise: integer('unit_price_paise').notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    primaryKey({ columns: [table.bookingId, table.seatCode] }),
    index('booking_seats_show_idx').on(table.showId),
  ],
);
