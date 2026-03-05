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

    const admin = getSupabaseAdmin();

    // Verify caller is master
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'master') {
      return NextResponse.json({ error: 'Master access required' }, { status: 403 });
    }

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
