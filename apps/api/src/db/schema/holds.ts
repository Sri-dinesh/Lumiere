import { pgTable, uuid, integer, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { shows } from './shows.js';
import { holdStatusEnum } from './enums.js';

export const holds = pgTable(
  'holds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    showId: uuid('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'restrict' }),
    status: holdStatusEnum('status').notNull().default('ACTIVE'),
    unitPricePaise: integer('unit_price_paise').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    requestKey: uuid('request_key').notNull(),
  },
  (table) => [
    unique('holds_id_show_uk').on(table.id, table.showId),
    unique('holds_id_user_show_uk').on(table.id, table.userId, table.showId),
    unique('holds_request_key_uk').on(table.userId, table.requestKey),
    index('holds_show_expiry_idx').on(table.showId, table.expiresAt),
  ],
);
