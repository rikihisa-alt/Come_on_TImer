import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await params;
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

    // Verify target is in same organization
    const { data: targetProfile } = await getSupabaseAdmin()
      .from('profiles')
      .select('organization_id')
      .eq('id', targetId)
      .single();

    if (!targetProfile || targetProfile.organization_id !== callerProfile.organization_id) {
      return NextResponse.json({ error: 'User not found in your organization' }, { status: 404 });
    }

    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(
      targetId,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    // Update password_plain in profiles
    await getSupabaseAdmin()
      .from('profiles')
      .update({ password_plain: newPassword })
      .eq('id', targetId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
