ALTER TABLE "users" ADD COLUMN "student_number" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_student_number_unique" ON "users" ("student_number");
