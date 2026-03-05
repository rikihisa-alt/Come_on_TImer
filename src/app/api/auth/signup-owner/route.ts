import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password, organizationName, displayName, invitationCode } = await request.json();

    if (!invitationCode) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // 1. Validate invitation code
    const { data: codeRecord, error: codeError } = await admin
      .from('invitation_codes')
      .select('*')
      .eq('code', invitationCode.trim().toUpperCase())
      .single();

    if (codeError || !codeRecord) {
      return NextResponse.json(
        { error: 'Invalid invitation code' },
        { status: 400 }
      );
    }

    if (codeRecord.used_by) {
      return NextResponse.json(
        { error: 'This invitation code has already been used' },
        { status: 400 }
      );
    }

    const isStore = codeRecord.type === 'store';
    const isMaster = codeRecord.type === 'master';

    // Store type requires organization name
    if (isStore && !organizationName) {
      return NextResponse.json(
        { error: 'Organization name is required for store accounts' },
        { status: 400 }
      );
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
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

    if (isStore) {
      // 3a. Store account: create organization + profile + org_store
      const { data: org, error: orgError } = await admin
        .from('organizations')
        .insert({ name: organizationName })
        .select('id')
        .single();

      if (orgError) {
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: 'Failed to create organization' },
          { status: 500 }
        );
      }

      const { error: profileError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          organization_id: org.id,
          role: 'owner',
          display_name: displayName,
          password_plain: password,
        });

      if (profileError) {
        await admin.from('organizations').delete().eq('id', org.id);
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }

      // Initialize org_store
      await admin
        .from('org_store')
        .insert({
          organization_id: org.id,
          store_data: {},
          updated_by: userId,
        });

      // Mark invitation code as used
      await admin
        .from('invitation_codes')
        .update({
          used_by: userId,
          used_at: new Date().toISOString(),
          organization_id: org.id,
        })
        .eq('id', codeRecord.id);

    } else if (isMaster) {
      // 3b. Master account: create a MASTER org + profile
      const { data: masterOrg, error: masterOrgError } = await admin
        .from('organizations')
        .insert({ name: 'MASTER' })
        .select('id')
        .single();

      if (masterOrgError) {
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: 'Failed to create master organization' },
          { status: 500 }
        );
      }

      const { error: profileError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          organization_id: masterOrg.id,
          role: 'master',
          display_name: displayName,
          password_plain: password,
        });

      if (profileError) {
        await admin.from('organizations').delete().eq('id', masterOrg.id);
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }

      // Mark invitation code as used
      await admin
        .from('invitation_codes')
        .update({
          used_by: userId,
          used_at: new Date().toISOString(),
        })
        .eq('id', codeRecord.id);
    }

    return NextResponse.json({ success: true, userId });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
