import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET: Fetch current user's profile
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS (profiles RLS self-references, blocking regular queries)
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .select('display_name, role, organization_id, created_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      display_name: profile.display_name,
      role: profile.role,
      organization_id: profile.organization_id,
      created_at: profile.created_at,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update display name
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { display_name } = await request.json();

    if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
      return NextResponse.json({ error: '表示名を入力してください' }, { status: 400 });
    }

    // Use admin client (RLS may block regular user UPDATE on profiles)
    const { error: updateError } = await getSupabaseAdmin()
      .from('profiles')
      .update({ display_name: display_name.trim() })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
