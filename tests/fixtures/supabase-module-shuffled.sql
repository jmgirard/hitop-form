create table "module_responses" (
  "study" text,
  "participant" text,
  "instrument" text,
  "form_build" text,
  "submitted" text,
  "hitopsr_233" integer,
  "hitopsr_194" integer,
  "hitopsr_170" integer,
  "hitopsr_064" integer,
  "hitopsr_365" integer,
  "hitopsr_011" integer,
  "hitopsr_020" integer,
  "hitopsr_300" integer,
  "hitopsr_109" integer,
  "hitopsr_118" integer,
  "hitopsr_260" integer,
  "hitopsr_394" integer,
  "hitopsr_224" integer,
  "hitopsr_291" integer,
  "hitopsr_304" integer,
  "hitopsr_367" integer,
  "hitopsr_343" integer,
  "hitopsr_066" integer,
  "hitopsr_100" integer,
  "hitopsr_386" integer,
  "hitopsr_380" integer
);
alter table "module_responses" enable row level security;
grant insert on "module_responses" to anon;
create policy "anon inserts" on "module_responses" for insert to anon with check (true);
