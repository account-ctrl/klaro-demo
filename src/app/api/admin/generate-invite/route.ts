
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  try {
    const { email, issuedBy } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    // 1. Generate Secure Token
    // Generates a random 32-char hex string (e.g., "a1b2c3d4...")
    const token = randomBytes(16).toString('hex');

    // 2. Create Invite Record
    await adminDb.collection('onboarding_invites').doc(token).set({
        token,
        recipientEmail: email,
        status: 'pending', // pending -> used -> expired
        issuedBy: issuedBy || 'system',
        createdAt: Timestamp.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Days validity
    });

    // 3. Construct Link
    // Note: Assuming process.env.NEXT_PUBLIC_APP_URL is set, else fallback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://klarogov.ph';
    const inviteLink = `${baseUrl}/onboarding?token=${token}`;

    return NextResponse.json({ 
        success: true, 
        token,
        inviteLink
    });

  } catch (error: any) {
    console.error("Invite Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
