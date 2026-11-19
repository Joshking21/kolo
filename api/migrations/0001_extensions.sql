-- 0001_extensions.sql
-- Extensions are optional Postgres features you switch on per database.

-- citext = case-insensitive text. With email declared as citext,
-- 'Ada@Example.com' and 'ada@example.com' count as the same value, so a
-- UNIQUE constraint on email does what you'd expect.
CREATE EXTENSION IF NOT EXISTS citext;

-- Note: gen_random_uuid() is built into Postgres 13+, so no extension is
-- needed for UUID primary keys (DEFAULT gen_random_uuid()).
