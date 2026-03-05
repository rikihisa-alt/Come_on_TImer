import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password, organizationName, displayName } = await request.json();

    if (!email || !password || !organizationName || !displayName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Create organization
    const { data: org, error: orgError } = await getSupabaseAdmin()
      .from('organizations')
      .insert({ name: organizationName })
      .select('id')
      .single();

    if (orgError) {
      // Rollback: delete the auth user
      await getSupabaseAdmin().auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // 3. Create profile (owner)
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .insert({
        id: userId,
        organization_id: org.id,
        role: 'owner',
        display_name: displayName,
      });

    if (profileError) {
      // Rollback
      await getSupabaseAdmin().from('organizations').delete().eq('id', org.id);
      await getSupabaseAdmin().auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
