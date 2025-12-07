
import { NextResponse } from 'next/server';
import { provisionTenant } from '@/lib/services/provisioning';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    const { province, city, barangay, region, adminProfile, inviteToken } = await req.json();

    // 1. Validation (Strict)
    if (!province || !city || !barangay || !inviteToken) {
        return NextResponse.json({ error: 'Missing required fields or invite token' }, { status: 400 });
    }

    // 2. Gatekeeper: Validate Invite Token
    // We strictly enforce that a valid, unused token is present for public onboarding.
    const inviteRef = adminDb.collection('onboarding_invites').doc(inviteToken);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
        return NextResponse.json({ error: 'Invalid invite token.' }, { status: 403 });
    }

    const inviteData = inviteSnap.data();
    if (inviteData?.status !== 'pending') {
        return NextResponse.json({ error: 'This invite has already been used or expired.' }, { status: 403 });
    }

    // 3. Call the Unified Engine
    const result = await provisionTenant({
        province,
        city,
        barangay,
        region,
        adminProfile,
        inviteToken // Pass the token so the engine can mark it as used
    });

    return NextResponse.json({ 
        success: true,
        ...result 
    });

  } catch (error: any) {
    console.error("[PUBLIC PROVISION ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
