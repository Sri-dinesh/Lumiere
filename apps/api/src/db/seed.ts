import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { DateTime } from 'luxon';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import {
  users,
  cinemaScreens,
  movies,
  shows,
  showSeats,
  bookings,
  bookingSeats,
  holds,
  holdSeats,
} from './schema/index.js';
import { env } from '../config/env.js';
import { generate80SeatRecords } from '../modules/seats/seat.generator.js';

export const seedMovies = [
  {
    title: 'Dune: Part Two',
    description:
      'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between love and the fate of the universe, he endeavors to prevent a terrible future.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    language: 'English',
    durationMinutes: 166,
    rating: 'UA' as const,
  },
  {
    title: 'Oppenheimer',
    description:
      'The pulse-pounding story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during the Manhattan Project at Los Alamos.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    language: 'English',
    durationMinutes: 180,
    rating: 'A' as const,
  },
  {
    title: 'Interstellar',
    description:
      'When Earth becomes uninhabitable, ex-NASA pilot Joseph Cooper and a team of researchers journey through a wormhole across the galaxy in search of a new home for humanity.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    language: 'English',
    durationMinutes: 169,
    rating: 'UA' as const,
  },
  {
    title: 'Inception',
    description:
      'A skilled thief who steals corporate secrets through dream-sharing technology is offered a chance to regain his old life in exchange for planting an idea into the mind of a CEO.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    language: 'English',
    durationMinutes: 148,
    rating: 'UA' as const,
  },
  {
    title: 'The Dark Knight',
    description:
      'When the psychotic menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must face one of the greatest psychological and physical tests of his life.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    language: 'English',
    durationMinutes: 152,
    rating: 'UA' as const,
  },
  {
    title: 'Spider-Man: Across the Spider-Verse',
    description:
      'Miles Morales is catapulted across the Multiverse, encountering a society of Spider-People charged with protecting reality until a catastrophic clash forces him to redefine heroism.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    language: 'English',
    durationMinutes: 140,
    rating: 'U' as const,
  },
  {
    title: 'Avatar: The Way of Water',
    description:
      'Set more than a decade after the events of the first film, Jake Sully and Neytiri fight to protect their family and their ocean sanctuary from ancient human threats.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
    language: 'English',
    durationMinutes: 192,
    rating: 'UA' as const,
  },
  {
    title: 'RRR',
    description:
      'A fearless warrior on a perilous quest and a dutiful officer in the British Indian police forge an unbreakable brotherhood that ignites a revolution for independence.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/wE0I6efAW4cDDmZQWtwZMOW44EJ.jpg',
    language: 'Telugu',
    durationMinutes: 187,
    rating: 'UA' as const,
  },
  {
    title: 'Top Gun: Maverick',
    description:
      'After thirty years as one of the Navy’s premier aviators, Pete "Maverick" Mitchell is tasked with training a detachment of elite TOPGUN graduates for a high-risk mission.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
    language: 'English',
    durationMinutes: 130,
    rating: 'UA' as const,
  },
  {
    title: 'Parasite',
    description:
      'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan in Bong Joon-ho’s masterpiece.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    language: 'Korean',
    durationMinutes: 132,
    rating: 'A' as const,
  },
];

export async function seedDatabase() {
  console.info('🌱 Starting idempotent database seed with authentic blockbuster catalog...');

  // 1. Cinema Screen (Singleton screen id = 1)
  await db
    .insert(cinemaScreens)
    .values({
      id: 1,
      name: 'Lumiere Audi 1',
    })
    .onConflictDoUpdate({
      target: cinemaScreens.id,
      set: { name: 'Lumiere Audi 1' },
    });
  console.info('✓ Seeded cinema screen (id = 1)');

  // 2. Users (Admin + 2 Customers)
  const adminPasswordHash = await argon2.hash(env.SEED_ADMIN_PASSWORD, {
    type: argon2.argon2id,
  });
  const customer1PasswordHash = await argon2.hash(env.SEED_CUSTOMER_PASSWORD, {
    type: argon2.argon2id,
  });
  const customer2PasswordHash = await argon2.hash(env.SEED_CUSTOMER_2_PASSWORD, {
    type: argon2.argon2id,
  });

  const seedUsers = [
    {
      name: 'Cinema Admin',
      email: env.SEED_ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash: adminPasswordHash,
      role: 'ADMIN' as const,
    },
    {
      name: 'Alice Customer',
      email: env.SEED_CUSTOMER_EMAIL.toLowerCase().trim(),
      passwordHash: customer1PasswordHash,
      role: 'CUSTOMER' as const,
    },
    {
      name: 'Bob Customer',
      email: env.SEED_CUSTOMER_2_EMAIL.toLowerCase().trim(),
      passwordHash: customer2PasswordHash,
      role: 'CUSTOMER' as const,
    },
  ];

  const userMap = new Map<string, string>();

  for (const user of seedUsers) {
    const [saved] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (saved) userMap.set(saved.email, saved.id);
  }
  console.info('✓ Seeded 1 admin and 2 customer users');

  // 3. Clean up non-canonical test movies from development DB
  const canonicalTitles = seedMovies.map((m) => m.title);
  const nonCanonical = await db
    .select({ id: movies.id })
    .from(movies)
    .where(
      sql`${movies.title} NOT IN (${sql.join(
        canonicalTitles.map((t) => sql`${t}`),
        sql`, `,
      )})`,
    );

  if (nonCanonical.length > 0) {
    const movieIds = nonCanonical.map((m) => m.id);
    const movieInClause = sql.join(
      movieIds.map((id) => sql`${id}`),
      sql`, `,
    );
    const staleShows = await db
      .select({ id: shows.id })
      .from(shows)
      .where(sql`${shows.movieId} IN (${movieInClause})`);

    if (staleShows.length > 0) {
      const showIds = staleShows.map((s) => s.id);
      const showInClause = sql.join(
        showIds.map((id) => sql`${id}`),
        sql`, `,
      );
      await db.execute(sql`DELETE FROM booking_seats WHERE show_id IN (${showInClause})`);
      await db.execute(
        sql`DELETE FROM hold_seats WHERE hold_id IN (SELECT id FROM holds WHERE show_id IN (${showInClause})) OR show_id IN (${showInClause})`,
      );
      await db.execute(sql`DELETE FROM show_seats WHERE show_id IN (${showInClause})`);
      await db.execute(sql`DELETE FROM bookings WHERE show_id IN (${showInClause})`);
      await db.execute(sql`DELETE FROM holds WHERE show_id IN (${showInClause})`);
      await db.execute(sql`DELETE FROM shows WHERE id IN (${showInClause})`);
    }
    await db.execute(sql`DELETE FROM movies WHERE id IN (${movieInClause})`);
    console.info(`✓ Cleaned up ${nonCanonical.length} test movies and stale test records`);
  }

  // 4. Upsert the 10 Blockbuster Movies
  const insertedMovies: (typeof movies.$inferSelect)[] = [];

  for (const movieData of seedMovies) {
    const existing = await db
      .select()
      .from(movies)
      .where(eq(movies.title, movieData.title))
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(movies)
        .set({ ...movieData, updatedAt: new Date() })
        .where(eq(movies.id, existing[0].id))
        .returning();
      if (updated) insertedMovies.push(updated);
    } else {
      const [created] = await db.insert(movies).values(movieData).returning();
      if (created) insertedMovies.push(created);
    }
  }
  console.info(`✓ Seeded ${insertedMovies.length} authentic blockbuster movies`);

  // 5. Future Shows across next 3 days (Strictly non-overlapping intervals on Screen 1 in Asia/Kolkata)
  const tz = env.CINEMA_TIMEZONE;
  const now = DateTime.now().setZone(tz);

  const day1 = now.plus({ days: 1 }).startOf('day');
  const day2 = now.plus({ days: 2 }).startOf('day');
  const day3 = now.plus({ days: 3 }).startOf('day');

  // Map movies by title for explicit indexing
  const getMovieByTitle = (title: string) => insertedMovies.find((m) => m.title === title)!;

  // Schedule intervals carefully spaced with intermission / cleaning intervals
  const scheduleSlots = [
    // Day 1 (Tomorrow)
    {
      movie: getMovieByTitle('Dune: Part Two'),
      start: day1.set({ hour: 10, minute: 0 }), // 10:00 - 12:46
      pricePaise: 35000, // ₹350
    },
    {
      movie: getMovieByTitle('Oppenheimer'),
      start: day1.set({ hour: 13, minute: 30 }), // 13:30 - 16:30
      pricePaise: 40000, // ₹400
    },
    {
      movie: getMovieByTitle('Interstellar'),
      start: day1.set({ hour: 17, minute: 15 }), // 17:15 - 20:04
      pricePaise: 35000, // ₹350
    },
    {
      movie: getMovieByTitle('The Dark Knight'),
      start: day1.set({ hour: 20, minute: 45 }), // 20:45 - 23:17
      pricePaise: 30000, // ₹300
    },
    // Day 2
    {
      movie: getMovieByTitle('Spider-Man: Across the Spider-Verse'),
      start: day2.set({ hour: 10, minute: 0 }), // 10:00 - 12:20
      pricePaise: 25000, // ₹250
    },
    {
      movie: getMovieByTitle('Inception'),
      start: day2.set({ hour: 13, minute: 0 }), // 13:00 - 15:28
      pricePaise: 30000, // ₹300
    },
    {
      movie: getMovieByTitle('Avatar: The Way of Water'),
      start: day2.set({ hour: 16, minute: 15 }), // 16:15 - 19:27
      pricePaise: 40000, // ₹400
    },
    {
      movie: getMovieByTitle('RRR'),
      start: day2.set({ hour: 20, minute: 15 }), // 20:15 - 23:22
      pricePaise: 35000, // ₹350
    },
    // Day 3
    {
      movie: getMovieByTitle('Top Gun: Maverick'),
      start: day3.set({ hour: 11, minute: 0 }), // 11:00 - 13:10
      pricePaise: 30000, // ₹300
    },
    {
      movie: getMovieByTitle('Parasite'),
      start: day3.set({ hour: 14, minute: 0 }), // 14:00 - 16:12
      pricePaise: 30000, // ₹300
    },
    {
      movie: getMovieByTitle('Dune: Part Two'),
      start: day3.set({ hour: 17, minute: 0 }), // 17:00 - 19:46
      pricePaise: 35000, // ₹350
    },
    {
      movie: getMovieByTitle('Oppenheimer'),
      start: day3.set({ hour: 20, minute: 30 }), // 20:30 - 23:30
      pricePaise: 40000, // ₹400
    },
  ];

  const seededShowIds: string[] = [];

  for (const slot of scheduleSlots) {
    const movie = slot.movie;
    if (!movie) continue;

    const startsAt = slot.start.toJSDate();
    const endsAt = slot.start.plus({ minutes: movie.durationMinutes }).toJSDate();

    const existing = await db
      .select()
      .from(shows)
      .where(sql`${shows.screenId} = 1 AND ${shows.startsAt} = ${startsAt}`)
      .limit(1);

    let showId: string;

    if (existing[0]) {
      showId = existing[0].id;
    } else {
      const [newShow] = await db
        .insert(shows)
        .values({
          movieId: movie.id,
          screenId: 1,
          startsAt,
          endsAt,
          durationMinutesSnapshot: movie.durationMinutes,
          pricePaise: slot.pricePaise,
        })
        .returning();
      if (!newShow) continue;
      showId = newShow.id;
    }

    seededShowIds.push(showId);

    // Initialize 80 show_seats
    const seatsToInsert = generate80SeatRecords(showId);
    await db.insert(showSeats).values(seatsToInsert).onConflictDoNothing();
  }
  console.info(`✓ Seeded ${scheduleSlots.length} non-overlapping shows with 80 seats each`);

  // 6. Seed a sample confirmed booking for Alice Customer on the first show
  const aliceId = userMap.get(env.SEED_CUSTOMER_EMAIL.toLowerCase().trim());
  const demoShowId = seededShowIds[0];
  const firstSlot = scheduleSlots[0];

  if (aliceId && demoShowId && firstSlot) {
    const existingAliceBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.userId, aliceId))
      .limit(1);

    if (existingAliceBookings.length === 0) {
      const demoSeats = ['D5', 'D6'];
      const slotPrice = firstSlot.pricePaise;
      const totalPaise = slotPrice * demoSeats.length;

      const [demoHold] = await db
        .insert(holds)
        .values({
          userId: aliceId,
          showId: demoShowId,
          unitPricePaise: slotPrice,
          requestKey: randomUUID(),
          expiresAt: DateTime.now().plus({ hours: 1 }).toJSDate(),
          status: 'CONSUMED',
        })
        .returning();

      if (demoHold) {
        for (const seatCode of demoSeats) {
          await db.insert(holdSeats).values({
            holdId: demoHold.id,
            showId: demoShowId,
            seatCode,
          });
        }

        const [aliceBooking] = await db
          .insert(bookings)
          .values({
            userId: aliceId,
            showId: demoShowId,
            holdId: demoHold.id,
            totalPaise,
            status: 'CONFIRMED',
          })
          .returning();

        if (aliceBooking) {
          for (const seatCode of demoSeats) {
            await db.insert(bookingSeats).values({
              bookingId: aliceBooking.id,
              showId: demoShowId,
              seatCode,
              unitPricePaise: slotPrice,
            });

            await db
              .update(showSeats)
              .set({
                currentBookingId: aliceBooking.id,
                holdId: null,
                heldUntil: null,
                updatedAt: new Date(),
              })
              .where(
                sql`${showSeats.showId} = ${demoShowId} AND ${showSeats.seatCode} = ${seatCode}`,
              );
          }
          console.info(`✓ Seeded demo confirmed booking for Alice Customer (Seats D5, D6)`);
        }
      }
    }
  }

  // 7. Verification & Integrity Assertions
  const seatVerification = await db.execute(sql`
    SELECT show_id, count(*)::int as count 
    FROM show_seats 
    GROUP BY show_id 
    HAVING count(*) <> 80
  `);

  if (seatVerification.rows.length > 0) {
    throw new Error(
      `CRITICAL: Some shows do not have exactly 80 seats: ${JSON.stringify(seatVerification.rows)}`,
    );
  }

  const duplicateBookingVerification = await db.execute(sql`
    SELECT show_id, seat_code, count(*)::int as count
    FROM booking_seats 
    WHERE released_at IS NULL
    GROUP BY show_id, seat_code 
    HAVING count(*) > 1
  `);

  if (duplicateBookingVerification.rows.length > 0) {
    throw new Error(
      `CRITICAL: Duplicate active booking seats found: ${JSON.stringify(duplicateBookingVerification.rows)}`,
    );
  }

  console.info(
    '✅ Integrity verification passed: All shows have exactly 80 seats and 0 duplicate active bookings.',
  );
  console.info('🎉 Seed completed successfully!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Seed failed:', err);
      await pool.end();
      process.exit(1);
    });
}
