ALTER TABLE "holds" ADD COLUMN IF NOT EXISTS "is_extended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "holds" ADD COLUMN IF NOT EXISTS "extended_at" timestamp with time zone;
