-- ==============================================
-- COME ON Timer - Data Sync Setup (v2)
-- Run this in Supabase SQL Editor
-- ==============================================

-- org_store table: one row per organization, JSONB holds full store state
CREATE TABLE IF NOT EXISTS public.org_store (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS: same-org members can read/write
ALTER TABLE public.org_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_store_select" ON public.org_store FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_store_update" ON public.org_store FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- INSERT policy for service_role only (via API route)
CREATE POLICY "org_store_insert" ON public.org_store FOR INSERT
  WITH CHECK (false);

-- Enable Realtime for org_store
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_store;
