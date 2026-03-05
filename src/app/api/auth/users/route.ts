import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get caller's profile
    const { data: callerProfile, error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get all profiles in the same organization
    const { data: profiles, error: listError } = await getSupabaseAdmin()
      .from('profiles')
      .select('id, display_name, role, created_at')
      .eq('organization_id', callerProfile.organization_id)
      .order('created_at', { ascending: true });

    if (listError) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get emails from auth (only if caller is owner)
    let usersWithEmail = profiles || [];
    if (callerProfile.role === 'owner') {
      const enriched = await Promise.all(
        (profiles || []).map(async (p) => {
          const { data } = await getSupabaseAdmin().auth.admin.getUserById(p.id);
          return { ...p, email: data?.user?.email || '' };
        })
      );
      usersWithEmail = enriched;
    }

    return NextResponse.json({
      users: usersWithEmail,
      callerRole: callerProfile.role,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
