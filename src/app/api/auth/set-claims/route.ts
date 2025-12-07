
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// This endpoint mimics a Cloud Function trigger.
// In a real deployment, you would deploy this code as a Firebase Cloud Function:
// `functions.auth.user().onCreate(...)`
// Here, we expose it as an API so you can manually trigger it or call it from your client 
// after sign-up if you are not using Cloud Functions yet.

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();
    
    // Security: Only allow internal calls or verify a secret key if exposed
    // For this dev environment, we trust the caller (assuming it's the client post-signup)
    // BUT typically this should be admin-only.
    
    const userRecord = await adminAuth.getUser(uid);
    const email = userRecord.email;

    if (!email) return NextResponse.json({ error: 'No email found' }, { status: 400 });

    // Logic to determine tenant based on email domain or a lookup table
    // For now, let's look up the 'users' Firestore document which might have been created by the Invite Flow
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.tenantPath) {
            await adminAuth.setCustomUserClaims(uid, {
                role: data.role || 'resident',
                tenantPath: data.tenantPath,
                tenantId: data.tenantId
            });
            return NextResponse.json({ success: true, message: 'Claims synced from Firestore profile.' });
        }
    }

    // Default Fallback for new uninvited signups?
    // Assign to demo tenant? Or leave claimless (no access)?
    // Let's leave claimless for security.
    
    return NextResponse.json({ success: true, message: 'No tenant association found. User is pending assignment.' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
