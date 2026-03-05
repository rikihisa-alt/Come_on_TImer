import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is owner
    const { data: callerProfile } = await getSupabaseAdmin()
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'owner') {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const { email, password, displayName } = await request.json();

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Create auth user
    const { data: newUser, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Create profile (employee in same org)
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .insert({
        id: newUser.user.id,
        organization_id: callerProfile.organization_id,
        role: 'employee',
        display_name: displayName,
        password_plain: password,
      });

    if (profileError) {
      // Rollback
      await getSupabaseAdmin().auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email,
        display_name: displayName,
        role: 'employee',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
