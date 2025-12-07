
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    const { uid, email, password } = await req.json();

    let targetUid = uid;

    if (!targetUid && !email) {
        return NextResponse.json({ error: 'Missing UID or Email' }, { status: 400 });
    }

    console.log(`[AUTH] Attempting to restore/create Super Admin...`);

    // 1. Resolve User (Find or Create)
    try {
        if (targetUid) {
            await adminAuth.getUser(targetUid);
        } else {
            const user = await adminAuth.getUserByEmail(email);
            targetUid = user.uid;
        }
    } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            if (email && password) {
                console.log(`[AUTH] User not found. Creating new user for ${email}...`);
                const newUser = await adminAuth.createUser({
                    email,
                    password,
                    displayName: 'System Overseer'
                });
                targetUid = newUser.uid;
            } else {
                return NextResponse.json({ error: 'User not found and no password provided for creation.' }, { status: 404 });
            }
        } else {
            throw e;
        }
    }

    // 2. Force Set Custom Claims (Backend Override)
    console.log(`[AUTH] Setting Super Admin claims for ${targetUid}...`);
    await adminAuth.setCustomUserClaims(targetUid, {
        role: 'super_admin',
        accessLevel: 5
    });

    // 3. Ensure Firestore Profile Exists
    const userRecord = await adminAuth.getUser(targetUid);
    await adminDb.collection('users').doc(targetUid).set({
        uid: targetUid,
        email: userRecord.email,
        role: 'super_admin',
        systemRole: 'Super Admin',
        status: 'Active',
        fullName: 'System Overseer',
        restoredAt: new Date()
    }, { merge: true });

    return NextResponse.json({ 
        success: true, 
        message: `User ${userRecord.email} (${targetUid}) is now a Super Admin.`,
        uid: targetUid
    });

  } catch (error: any) {
    console.error("Restoration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
