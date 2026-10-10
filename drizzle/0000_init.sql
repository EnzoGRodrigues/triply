CREATE TYPE "public"."companions" AS ENUM('sozinho', 'casal', 'familia', 'amigos', 'trabalho');--> statement-breakpoint
CREATE TYPE "public"."cover_source" AS ENUM('upload', 'wikipedia', 'externa');--> statement-breakpoint
CREATE TYPE "public"."transport" AS ENUM('aviao', 'carro', 'onibus');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('planejada', 'realizada');--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "trip_status" DEFAULT 'planejada' NOT NULL,
	"destination" text NOT NULL,
	"city" text,
	"region" text,
	"country" text,
	"country_code" varchar(2),
	"latitude" double precision,
	"longitude" double precision,
	"start_date" date,
	"end_date" date,
	"accommodation" text,
	"activities" text,
	"transport" "transport" DEFAULT 'aviao' NOT NULL,
	"currency_code" varchar(3),
	"exchange_rate" numeric(14, 6),
	"exchange_rate_at" timestamp with time zone,
	"temp_min" numeric(4, 1),
	"temp_max" numeric(4, 1),
	"cover_image" text,
	"cover_image_source" "cover_source",
	"completed_at" timestamp with time zone,
	"rating" smallint,
	"companions" "companions",
	"expenses" numeric(12, 2),
	"experience" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_dates_check" CHECK ("trips"."end_date" IS NULL OR "trips"."start_date" IS NULL OR "trips"."end_date" >= "trips"."start_date"),
	CONSTRAINT "trips_rating_check" CHECK ("trips"."rating" IS NULL OR "trips"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "trips_expenses_check" CHECK ("trips"."expenses" IS NULL OR "trips"."expenses" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase_check" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trips_user_id_status_idx" ON "trips" USING btree ("user_id","status");