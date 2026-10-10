
-- 0001_create_profiles.sql
-- Trusted profiles with database-enforced default tourist roles.
--
-- IMPORTANT DEPLOYMENT NOTICE:
-- This is an initial migration designed to be applied exactly once to a clean database.
-- Do not run this migration multiple times without verifying object existence first.
-- Before executing, verify that the following do not already exist in the target database:
--   - Type: public.user_role
--   - Table: public.profiles
--   - Functions: public.set_profile_updated_at, public.handle_new_user
--   - Triggers: set_profile_updated_at (on public.profiles), on_auth_user_created (on auth.users)
-- This migration contains no destructive DROP statements to prevent unintended data loss.

-- 1. Create role type and profiles table.
CREATE TYPE public.user_role AS ENUM ('tourist', 'rescue', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'tourist',
  full_name text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable row-level security.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Remove table access, then grant only required privileges.
REVOKE ALL ON TABLE public.profiles
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Users may edit their own name and phone, but not role, id,
-- created_at, or updated_at.
GRANT UPDATE (full_name, phone)
ON TABLE public.profiles TO authenticated;

-- 4. RLS policies.
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- 5. Automatically maintain updated_at.
CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_updated_at()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER set_profile_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_updated_at();

-- 6. Create profiles for new users.
-- Never trust user metadata to assign privileged roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'tourist'::public.user_role,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 7. Backfill existing accounts.
-- Existing accounts start as tourists; privileged roles must be
-- assigned separately through a trusted administrative process.
INSERT INTO public.profiles (id, role, full_name)
SELECT
  u.id,
  'tourist'::public.user_role,
  COALESCE(u.raw_user_meta_data ->> 'full_name', '')
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;
