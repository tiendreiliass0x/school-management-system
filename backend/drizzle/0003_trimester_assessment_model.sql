CREATE TYPE "public"."trimester_name" AS ENUM('first', 'second', 'third');
--> statement-breakpoint
CREATE TABLE "trimesters" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "academic_year_id" uuid NOT NULL,
        "name" "public"."trimester_name" NOT NULL,
        "sequence_number" integer NOT NULL,
        "start_date" timestamp NOT NULL,
        "end_date" timestamp NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "trimesters_year_name_unique" UNIQUE("academic_year_id","name"),
        CONSTRAINT "trimesters_year_sequence_unique" UNIQUE("academic_year_id","sequence_number")
);
--> statement-breakpoint
ALTER TABLE "trimesters" ADD CONSTRAINT "trimesters_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "trimesters_year_active_idx" ON "trimesters" USING btree ("academic_year_id","is_active");
--> statement-breakpoint
WITH year_data AS (
    SELECT
        ay.id AS academic_year_id,
        ay.start_date,
        ay.end_date,
        (ay.end_date - ay.start_date) / 3 AS segment_length
    FROM "academic_years" ay
), generated AS (
    SELECT
        yd.academic_year_id,
        yd.start_date,
        yd.end_date,
        yd.segment_length,
        gs AS sequence_number,
        CASE gs
            WHEN 1 THEN 'first'
            WHEN 2 THEN 'second'
            ELSE 'third'
        END AS sequence_name
    FROM year_data yd
    CROSS JOIN generate_series(1, 3) AS gs
)
INSERT INTO "trimesters" ("id", "academic_year_id", "name", "sequence_number", "start_date", "end_date", "is_active", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    g.academic_year_id,
    g.sequence_name::"public"."trimester_name",
    g.sequence_number,
    g.start_date + (g.sequence_number - 1) * g.segment_length,
    CASE g.sequence_number
        WHEN 3 THEN g.end_date
        ELSE g.start_date + g.sequence_number * g.segment_length
    END,
    true,
    now(),
    now()
FROM generated g
ON CONFLICT ("academic_year_id", "name") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "trimester_id" uuid;
--> statement-breakpoint
UPDATE "classes" c
SET "trimester_id" = t.id
FROM "trimesters" t
WHERE t.academic_year_id = c."academic_year_id"
  AND t.sequence_number = 1;
--> statement-breakpoint
ALTER TABLE "classes"
    ALTER COLUMN "trimester_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_trimester_id_trimesters_id_fk" FOREIGN KEY ("trimester_id") REFERENCES "public"."trimesters"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "classes_trimester_idx" ON "classes" USING btree ("trimester_id");
--> statement-breakpoint
CREATE TABLE "class_tests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "class_id" uuid NOT NULL,
        "trimester_id" uuid NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "test_date" timestamp,
        "weight" numeric(4, 2) DEFAULT '1.00' NOT NULL,
        "max_score" numeric(5, 2) DEFAULT '100.00' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "class_tests_class_title_unique" UNIQUE("class_id","title")
);
--> statement-breakpoint
ALTER TABLE "class_tests" ADD CONSTRAINT "class_tests_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "class_tests" ADD CONSTRAINT "class_tests_trimester_id_trimesters_id_fk" FOREIGN KEY ("trimester_id") REFERENCES "public"."trimesters"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "class_tests_trimester_idx" ON "class_tests" USING btree ("class_id","trimester_id");
--> statement-breakpoint
CREATE INDEX "class_tests_trimester_only_idx" ON "class_tests" USING btree ("trimester_id");
--> statement-breakpoint
CREATE TABLE "test_results" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "test_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "score" numeric(5, 2) NOT NULL,
        "graded_at" timestamp,
        "graded_by" uuid,
        "feedback" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "test_results_student_test_unique" UNIQUE("student_id","test_id")
);
--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_id_class_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."class_tests"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "test_results_test_idx" ON "test_results" USING btree ("test_id");
--> statement-breakpoint
CREATE INDEX "test_results_student_idx" ON "test_results" USING btree ("student_id");
--> statement-breakpoint
CREATE TABLE "trimester_grades" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "student_id" uuid NOT NULL,
        "class_id" uuid NOT NULL,
        "trimester_id" uuid NOT NULL,
        "final_grade" numeric(5, 2) NOT NULL,
        "calculated_at" timestamp DEFAULT now() NOT NULL,
        "calculated_by" uuid,
        "calculation_method" text,
        "notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "trimester_grades_student_class_trimester_unique" UNIQUE("student_id","class_id","trimester_id")
);
--> statement-breakpoint
ALTER TABLE "trimester_grades" ADD CONSTRAINT "trimester_grades_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trimester_grades" ADD CONSTRAINT "trimester_grades_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trimester_grades" ADD CONSTRAINT "trimester_grades_trimester_id_trimesters_id_fk" FOREIGN KEY ("trimester_id") REFERENCES "public"."trimesters"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trimester_grades" ADD CONSTRAINT "trimester_grades_calculated_by_users_id_fk" FOREIGN KEY ("calculated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "trimester_grades_class_trimester_idx" ON "trimester_grades" USING btree ("class_id","trimester_id");
--> statement-breakpoint
CREATE INDEX "trimester_grades_student_trimester_idx" ON "trimester_grades" USING btree ("student_id","trimester_id");
