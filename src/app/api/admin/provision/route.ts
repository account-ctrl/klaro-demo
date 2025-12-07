
import { NextResponse } from 'next/server';
import { provisionTenant } from '@/lib/services/provisioning';

export async function POST(req: Request) {
  try {
    // 1. Validate Input
    const { province, city, barangayName, adminName, adminEmail, password } = await req.json();

    if (!province || !city || !barangayName || !adminName || !adminEmail || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Call the Unified Engine
    // Note: We don't check for an Invite Token here because this is the Super Admin Override route.
    // Super Admins are trusted to create tenants directly.
    const result = await provisionTenant({
        province,
        city,
        barangay: barangayName,
        adminProfile: {
            name: adminName,
            email: adminEmail,
            password
        }
    });

    return NextResponse.json({ 
        message: 'Provisioning complete.',
        ...result
    });

  } catch (error: any) {
    console.error("[ADMIN PROVISION ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
