--
-- PostgreSQL database cleanup script
-- This script drops all tables and objects to prepare for a fresh database import
--

-- Terminate all connections to the database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = current_database()
  AND pid <> pg_backend_pid();

-- Drop all tables in the public schema
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all sequences
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all views
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all functions
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP ' || r.routine_type || ' IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all types
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON (t.typnamespace = n.oid) WHERE n.nspname = 'public' AND t.typtype = 'c') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Reset search path
SELECT pg_catalog.set_config('search_path', '', false);

-- Vacuum the database
VACUUM FULL;

-- Message indicating completion
DO $$ BEGIN
    RAISE NOTICE 'Database has been completely cleaned. Ready for fresh import.';
END $$;
