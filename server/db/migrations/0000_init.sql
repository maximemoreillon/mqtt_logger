CREATE TABLE "points" (
	"time" timestamp with time zone NOT NULL,
	"source_id" uuid NOT NULL,
	"field" text NOT NULL,
	"value" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"description" text,
	"topic" text NOT NULL,
	"keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "points_source_field_time_idx" ON "points" USING btree ("source_id","field","time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sources_user_id_idx" ON "sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sources_topic_idx" ON "sources" USING btree ("topic");