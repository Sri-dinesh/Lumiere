import { pgTable, uuid, integer, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { shows } from './shows.js';
import { holds } from './holds.js';
import { bookingStatusEnum } from './enums.js';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'restrict' }),
    holdId: uuid('hold_id')
      .notNull()
      .unique()
      .references(() => holds.id, { onDelete: 'restrict' }),
    status: bookingStatusEnum('status').notNull().default('CONFIRMED'),
    totalPaise: integer('total_paise').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    unique('bookings_id_show_uk').on(table.id, table.showId),
    index('bookings_user_created_idx').on(table.userId, table.createdAt),
    index('bookings_show_idx').on(table.showId),
  ],
);
