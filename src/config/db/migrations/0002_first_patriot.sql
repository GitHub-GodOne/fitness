CREATE TABLE "user_wizard_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"voice_gender" text,
	"age_group" text,
	"difficulty" text,
	"reference_images" text,
	"selected_body_parts" text,
	"current_step" integer DEFAULT 1 NOT NULL,
	"aspect_ratio" text DEFAULT 'adaptive',
	"duration" integer DEFAULT 12,
	"generate_audio" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_wizard_progress" ADD CONSTRAINT "user_wizard_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_wizard_progress_user" ON "user_wizard_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wizard_progress_updated" ON "user_wizard_progress" USING btree ("updated_at");