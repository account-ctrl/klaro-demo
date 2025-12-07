
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const inviteDoc = await adminDb.collection('onboarding_invites').doc(token).get();

  if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });
  }

  const data = inviteDoc.data();
  if (data?.status !== 'pending') {
      return NextResponse.json({ error: 'Invite already used or expired' }, { status: 410 });
  }

  return NextResponse.json({ success: true, data });
}
