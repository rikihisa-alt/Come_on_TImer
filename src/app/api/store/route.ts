import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET: Fetch org store data for the authenticated user's organization
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Get user's organization_id from profile (use admin to bypass RLS)
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch org store (use admin to bypass RLS)
    const { data: orgStore, error: storeError } = await admin
      .from('org_store')
      .select('store_data, updated_at')
      .eq('organization_id', profile.organization_id)
      .single();

    if (storeError) {
      // No store data yet — return empty
      if (storeError.code === 'PGRST116') {
        return NextResponse.json({ store_data: null, updated_at: null });
      }
      return NextResponse.json({ error: storeError.message }, { status: 500 });
    }

    return NextResponse.json({
      store_data: orgStore.store_data,
      updated_at: orgStore.updated_at,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Save org store data
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { store_data } = await request.json();

    if (!store_data || typeof store_data !== 'object') {
      return NextResponse.json({ error: 'Invalid store_data' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Get user's organization_id (use admin to bypass RLS)
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Upsert using admin client
    const { error: upsertError } = await admin
      .from('org_store')
      .upsert({
        organization_id: profile.organization_id,
        store_data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: 'organization_id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
