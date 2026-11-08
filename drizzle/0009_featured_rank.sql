-- Featured programs (#128): 1 shows first; null means not featured.
-- Migrations do not run on deploy: run `pnpm db:migrate` on Neon dev and prod BEFORE merge.
ALTER TABLE "programs" ADD COLUMN "featured_rank" integer;
