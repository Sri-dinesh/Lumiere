import { pgTable, uuid, smallint, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { movieRatingEnum } from './enums.js';

export const cinemaScreens = pgTable('cinema_screens', {
  id: smallint('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
});

export const movies = pgTable('movies', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  posterUrl: text('poster_url'),
  language: varchar('language', { length: 50 }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  rating: movieRatingEnum('rating').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
