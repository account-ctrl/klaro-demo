
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Token is missing' }, { status: 400 });
    }

    const inviteRef = adminDb.collection('onboarding_invites').doc(token);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
        return NextResponse.json({ isValid: false, message: 'Invalid token.' });
    }

    const data = inviteSnap.data();
    if (data?.status !== 'pending') {
        return NextResponse.json({ isValid: false, message: 'This invite has already been used.' });
    }

    // Check expiration
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        return NextResponse.json({ isValid: false, message: 'This invite has expired.' });
    }

    return NextResponse.json({ 
        isValid: true, 
        email: data.recipientEmail 
    });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
