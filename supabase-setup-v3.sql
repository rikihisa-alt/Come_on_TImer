-- ============================================================
-- COME ON Timer - Supabase Migration v3
-- 認証コード（招待コード）システム
-- Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. invitation_codes テーブル作成
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('store', 'master')),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS: deny all direct access (service_role only)
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codes_deny_all" ON public.invitation_codes
  FOR ALL USING (false);

-- 3. プリシードデータ（4コード）
INSERT INTO public.invitation_codes (code, type) VALUES
  ('STR-7K9M2X', 'store'),
  ('STR-4P8N5W', 'store'),
  ('STR-2R6J3V', 'store'),
  ('MST-9H4T7Q', 'master');

-- 4. profiles テーブル: role制約を更新（masterを追加）
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'employee', 'master'));

-- 5. profiles テーブル: パスワード平文保存用列追加
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_plain TEXT;
