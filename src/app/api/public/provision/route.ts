
import { NextResponse } from 'next/server';
import { provisionTenant } from '@/lib/services/provisioning';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    const { province, city, barangay, region, adminProfile, inviteToken } = await req.json();

    if (!province || !city || !barangay || !inviteToken) {
        return NextResponse.json({ error: 'Missing required fields or invite token' }, { status: 400 });
    }

    const tokenRef = adminDb.collection('invite_tokens').doc(inviteToken);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
        return NextResponse.json({ error: 'Invalid invite token.' }, { status: 403 });
    }

    const tokenData = tokenSnap.data();
    if (tokenData?.used) {
        return NextResponse.json({ error: 'This invite has already been used.' }, { status: 403 });
    }
    
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
    // Enhanced error handling to ensure a JSON response is always sent.
    console.error("[PUBLIC PROVISION CRITICAL ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    const errorCode = error.code || 'UNKNOWN_ERROR_CODE';
    return NextResponse.json({ 
        error: `Server Error: ${errorMessage}`, 
        code: errorCode 
    }, { status: 500 });
  }
}
