import { pgTable, uuid, smallint, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { movies, cinemaScreens } from './movies.js';

export const shows = pgTable(
  'shows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    movieId: uuid('movie_id')
      .notNull()
      .references(() => movies.id, { onDelete: 'restrict' }),
    screenId: smallint('screen_id')
      .notNull()
      .default(1)
      .references(() => cinemaScreens.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }).notNull(),
    durationMinutesSnapshot: integer('duration_minutes_snapshot').notNull(),
    pricePaise: integer('price_paise').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('shows_movie_start_idx').on(table.movieId, table.startsAt),
    index('shows_start_idx').on(table.startsAt),
  ],
);
