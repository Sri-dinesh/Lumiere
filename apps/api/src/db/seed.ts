import argon2 from 'argon2';
import { DateTime } from 'luxon';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import { users, cinemaScreens, movies, shows, showSeats } from './schema/index.js';
import { env } from '../config/env.js';
import { generate80SeatRecords } from '../modules/seats/seat.generator.js';

export async function seedDatabase() {
  console.info('🌱 Starting idempotent database seed...');

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

  for (const user of seedUsers) {
    await db
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
      });
  }
  console.info('✓ Seeded 1 admin and 2 customer users');

  // 3. Movies
  const seedMovies = [
    {
      title: 'Midnight Orbit',
      description:
        'A deep-space salvage crew discovers a derelict research vessel locked in an impossible trajectory around a neutron star.',
      posterUrl:
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
      language: 'English',
      durationMinutes: 135,
      rating: 'UA' as const,
    },
    {
      title: 'Echoes of Banaras',
      description:
        'A classical musician returns to the ghats of Varanasi to solve the mystery behind her mentor’s final, unrecorded raga.',
      posterUrl:
        'https://images.unsplash.com/photo-1561571994-3c61c554181a?auto=format&fit=crop&w=800&q=80',
      language: 'Hindi',
      durationMinutes: 140,
      rating: 'U' as const,
    },
    {
      title: 'The Silent Verdict',
      description:
        'A relentless defense lawyer uncovers high-stakes corruption within the criminal justice system while defending an innocent prodigy.',
      posterUrl:
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
      language: 'Tamil',
      durationMinutes: 125,
      rating: 'UA' as const,
    },
    {
      title: 'Quantum Horizon',
      description:
        'When an experimental particle collider disrupts local causality, a theoretical physicist races against time to prevent timeline collapse.',
      posterUrl:
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
      language: 'English',
      durationMinutes: 150,
      rating: 'A' as const,
    },
    {
      title: 'Monsoon Whispers',
      description:
        'A heartwarming slice-of-life romance set against the lush backwaters of Kerala during the peak monsoon season.',
      posterUrl:
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      language: 'Malayalam',
      durationMinutes: 115,
      rating: 'U' as const,
    },
  ];

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
  console.info(`✓ Seeded ${insertedMovies.length} movies`);

  // 4. Future Shows across next 2 days (Non-overlapping schedules in Asia/Kolkata)
  const tz = env.CINEMA_TIMEZONE;
  const now = DateTime.now().setZone(tz);

  const tomorrow = now.plus({ days: 1 }).startOf('day');
  const dayAfter = now.plus({ days: 2 }).startOf('day');

  // Define clear non-overlapping schedule slots for each day
  const scheduleSlots = [
    // Tomorrow slots
    {
      movieIndex: 0,
      start: tomorrow.set({ hour: 10, minute: 0 }),
      pricePaise: 20000, // ₹200
    },
    {
      movieIndex: 1,
      start: tomorrow.set({ hour: 13, minute: 0 }),
      pricePaise: 25000, // ₹250
    },
    {
      movieIndex: 2,
      start: tomorrow.set({ hour: 16, minute: 30 }),
      pricePaise: 25000, // ₹250
    },
    {
      movieIndex: 3,
      start: tomorrow.set({ hour: 19, minute: 30 }),
      pricePaise: 35000, // ₹350
    },
    // Day after tomorrow slots
    {
      movieIndex: 4,
      start: dayAfter.set({ hour: 10, minute: 30 }),
      pricePaise: 20000, // ₹200
    },
    {
      movieIndex: 0,
      start: dayAfter.set({ hour: 13, minute: 30 }),
      pricePaise: 25000, // ₹250
    },
    {
      movieIndex: 2,
      start: dayAfter.set({ hour: 17, minute: 0 }),
      pricePaise: 30000, // ₹300
    },
    {
      movieIndex: 1,
      start: dayAfter.set({ hour: 20, minute: 30 }),
      pricePaise: 30000, // ₹300
    },
  ];

  let seededShowsCount = 0;

  for (const slot of scheduleSlots) {
    const movie = insertedMovies[slot.movieIndex];
    if (!movie) continue;

    const startsAt = slot.start.toJSDate();
    const endsAt = slot.start.plus({ minutes: movie.durationMinutes }).toJSDate();

    // Check if show already exists for this movie and startsAt
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
      seededShowsCount++;
    }

    // Ensure all 80 show_seats exist for this show
    const seatsToInsert = generate80SeatRecords(showId);
    await db.insert(showSeats).values(seatsToInsert).onConflictDoNothing();
  }
  console.info(`✓ Seeded ${scheduleSlots.length} non-overlapping shows with 80 seats each`);

  // 5. Verification & Integrity Assertions
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
