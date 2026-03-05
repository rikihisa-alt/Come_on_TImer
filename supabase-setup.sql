-- ============================================================
-- COME ON Timer - Supabase Auth Setup
-- Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for organizations
CREATE POLICY "org_select" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- 5. RLS Policies for profiles
-- SELECT: same organization members can see each other
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: only via service_role (API routes)
-- No direct client insert/update/delete allowed
CREATE POLICY "profiles_insert_deny" ON public.profiles
  FOR INSERT WITH CHECK (false);

CREATE POLICY "profiles_update_deny" ON public.profiles
  FOR UPDATE USING (false);

CREATE POLICY "profiles_delete_deny" ON public.profiles
  FOR DELETE USING (false);

-- 6. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
