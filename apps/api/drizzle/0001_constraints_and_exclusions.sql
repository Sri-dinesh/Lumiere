CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_name_check" CHECK (length(trim("name")) >= 2);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized" CHECK ("email" = lower(trim("email")));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_expires_at_check" CHECK ("expires_at" > "created_at");--> statement-breakpoint
ALTER TABLE "movies" ADD CONSTRAINT "movies_title_check" CHECK (length(trim("title")) >= 1);--> statement-breakpoint
ALTER TABLE "movies" ADD CONSTRAINT "movies_duration_check" CHECK ("duration_minutes" BETWEEN 1 AND 600);--> statement-breakpoint
ALTER TABLE "cinema_screens" ADD CONSTRAINT "cinema_screens_id_check" CHECK ("id" = 1);--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_valid_interval" CHECK ("ends_at" > "starts_at");--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_duration_check" CHECK ("duration_minutes_snapshot" BETWEEN 1 AND 600);--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_price_check" CHECK ("price_paise" BETWEEN 1 AND 10000000);--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_single_screen_no_overlap" EXCLUDE USING gist ("screen_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&);--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_price_check" CHECK ("unit_price_paise" > 0);--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_expires_at_check" CHECK ("expires_at" > "created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "holds_one_active_per_user_show_idx" ON "holds" ("user_id", "show_id") WHERE "status" = 'ACTIVE';--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_total_check" CHECK ("total_paise" > 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_at_check" CHECK (("status" = 'CANCELLED') = ("cancelled_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hold_owner_show_fk" FOREIGN KEY ("hold_id", "user_id", "show_id") REFERENCES "holds"("id", "user_id", "show_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_row_check" CHECK ("row_label" IN ('A','B','C','D','E','F','G','H'));--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_number_check" CHECK ("seat_number" BETWEEN 1 AND 10);--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_code_matches_position" CHECK ("seat_code" = "row_label" || "seat_number"::text);--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_hold_pair" CHECK (("hold_id" IS NULL) = ("held_until" IS NULL));--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_not_held_and_booked" CHECK ("hold_id" IS NULL OR "current_booking_id" IS NULL);--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_hold_same_show_fk" FOREIGN KEY ("hold_id", "show_id") REFERENCES "holds"("id", "show_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_booking_same_show_fk" FOREIGN KEY ("current_booking_id", "show_id") REFERENCES "bookings"("id", "show_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "hold_seats" ADD CONSTRAINT "hold_seats_hold_show_fk" FOREIGN KEY ("hold_id", "show_id") REFERENCES "holds"("id", "show_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "hold_seats" ADD CONSTRAINT "hold_seats_existing_seat_fk" FOREIGN KEY ("show_id", "seat_code") REFERENCES "show_seats"("show_id", "seat_code") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_price_check" CHECK ("unit_price_paise" > 0);--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_show_fk" FOREIGN KEY ("booking_id", "show_id") REFERENCES "bookings"("id", "show_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_existing_seat_fk" FOREIGN KEY ("show_id", "seat_code") REFERENCES "show_seats"("show_id", "seat_code") ON DELETE RESTRICT;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "booking_seats_one_active_ownership_idx" ON "booking_seats" ("show_id", "seat_code") WHERE "released_at" IS NULL;
