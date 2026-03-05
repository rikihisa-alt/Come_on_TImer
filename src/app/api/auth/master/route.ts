import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Helper: verify master role
async function verifyMaster() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'master') return null;
  return user;
}

// Helper: generate random code
function generateCode(type: 'store' | 'master'): string {
  const prefix = type === 'master' ? 'MST' : 'STR';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
}

// GET: Fetch all data for master dashboard
export async function GET() {
  try {
    const user = await verifyMaster();
    if (!user) {
      return NextResponse.json({ error: 'Master access required' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    // Fetch all invitation codes
    const { data: codes } = await admin
      .from('invitation_codes')
      .select('*')
      .order('type', { ascending: true })
      .order('created_at', { ascending: true });

    // Fetch all organizations (excluding MASTER org)
    const { data: organizations } = await admin
      .from('organizations')
      .select('id, name, created_at')
      .neq('name', 'MASTER')
      .order('created_at', { ascending: true });

    // Fetch all profiles (excluding master)
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, organization_id, role, display_name, password_plain, created_at')
      .neq('role', 'master')
      .order('created_at', { ascending: true });

    // Fetch auth users to get emails
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const emailMap = new Map<string, string>();
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        emailMap.set(u.id, u.email || '');
      }
    }

    // Build codes response with organization names
    const orgMap = new Map<string, string>();
    if (organizations) {
      for (const org of organizations) {
        orgMap.set(org.id, org.name);
      }
    }

    const codesResponse = (codes || []).map(c => ({
      id: c.id,
      code: c.code,
      type: c.type,
      used: !!c.used_by,
      organization_name: c.organization_id ? orgMap.get(c.organization_id) || null : null,
      used_at: c.used_at,
    }));

    // Build stores response
    const storesResponse = (organizations || []).map(org => {
      const orgProfiles = (profiles || []).filter(p => p.organization_id === org.id);
      const owner = orgProfiles.find(p => p.role === 'owner');
      const employees = orgProfiles.filter(p => p.role === 'employee');

      return {
        id: org.id,
        name: org.name,
        created_at: org.created_at,
        owner: owner ? {
          display_name: owner.display_name,
          email: emailMap.get(owner.id) || '',
          password_plain: owner.password_plain || '',
        } : null,
        employees: employees.map(e => ({
          display_name: e.display_name,
          email: emailMap.get(e.id) || '',
          password_plain: e.password_plain || '',
        })),
      };
    });

    return NextResponse.json({
      codes: codesResponse,
      stores: storesResponse,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new invitation code
export async function POST(request: NextRequest) {
  try {
    const user = await verifyMaster();
    if (!user) {
      return NextResponse.json({ error: 'Master access required' }, { status: 403 });
    }

    const { type } = await request.json();

    if (!type || !['store', 'master'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Generate unique code (retry if collision)
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode(type);
      const { data: existing } = await admin
        .from('invitation_codes')
        .select('id')
        .eq('code', code)
        .single();
      if (!existing) break;
    }

    const { data: newCode, error: insertError } = await admin
      .from('invitation_codes')
      .insert({ code, type })
      .select('id, code, type')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'コードの作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true, code: newCode });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete an unused invitation code
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyMaster();
    if (!user) {
      return NextResponse.json({ error: 'Master access required' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Code ID is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify code exists and is unused
    const { data: codeRecord } = await admin
      .from('invitation_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (!codeRecord) {
      return NextResponse.json({ error: 'コードが見つかりません' }, { status: 404 });
    }

    if (codeRecord.used_by) {
      return NextResponse.json({ error: '使用済みのコードは削除できません' }, { status: 400 });
    }

    const { error: deleteError } = await admin
      .from('invitation_codes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
