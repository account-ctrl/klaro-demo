
import { NextResponse } from 'next/server';
import { provisionTenant } from '@/lib/services/provisioning';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    const { province, city, barangay, region, adminProfile, inviteToken } from await req.json();

    if (!province || !city || !barangay || !inviteToken) {
        return NextResponse.json({ error: 'Missing required fields or invite token' }, { status: 400 });
    }

    // Corrected to check the 'invite_tokens' collection.
    const tokenRef = adminDb.collection('invite_tokens').doc(inviteToken);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
        return NextResponse.json({ error: 'Invalid invite token.' }, { status: 403 });
    }

    const tokenData = tokenSnap.data();
    if (tokenData?.used) {
        return NextResponse.json({ error: 'This invite has already been used.' }, { status: 403 });
    }
    
    // Check if token is expired
    if (tokenData?.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
        return NextResponse.json({ error: 'This invite link has expired.' }, { status: 403 });
    }

    const result = await provisionTenant({
        province,
        city,
        barangay,
        region,
        adminProfile,
        inviteToken
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
