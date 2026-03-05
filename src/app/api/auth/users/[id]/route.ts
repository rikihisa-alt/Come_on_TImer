import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(
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

    // Cannot delete yourself
    if (user.id === targetId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
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

    // Verify target is in the same organization
    const { data: targetProfile } = await getSupabaseAdmin()
      .from('profiles')
      .select('organization_id')
      .eq('id', targetId)
      .single();

    if (!targetProfile || targetProfile.organization_id !== callerProfile.organization_id) {
      return NextResponse.json({ error: 'User not found in your organization' }, { status: 404 });
    }

    // Delete auth user (profile will cascade delete)
    const { error: deleteError } = await getSupabaseAdmin().auth.admin.deleteUser(targetId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
