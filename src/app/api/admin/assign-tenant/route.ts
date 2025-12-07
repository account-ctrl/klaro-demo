
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { userId, tenantSlug } = await req.json();

    if (!userId || !tenantSlug) {
      return NextResponse.json({ error: 'Missing userId or tenantSlug' }, { status: 400 });
    }

    // 1. Resolve Tenant Path
    // Assuming tenant_directory uses the tenantSlug as document ID
    const dirRef = adminDb.collection('tenant_directory').doc(tenantSlug);
    const dirSnap = await dirRef.get();

    if (!dirSnap.exists) {
        // Fallback or explicit check if we passed a raw path?
        // Ideally we strictly use slugs from the directory.
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantPath = dirSnap.data()?.fullPath;
    const tenantId = dirSnap.data()?.tenantId || tenantSlug; // Ensure we have an ID

    if (!tenantPath) {
        return NextResponse.json({ error: 'Tenant configuration invalid (no path)' }, { status: 500 });
    }

    // 2. Set Custom Claims on Auth User
    await adminAuth.setCustomUserClaims(userId, {
        tenantPath: tenantPath,
        tenantId: tenantId,
        role: 'admin' // Or pass role in body
    });

    // 3. Update Firestore Profile (for frontend fallback/sync)
    await adminDb.collection('users').doc(userId).set({
        tenantPath: tenantPath,
        tenantId: tenantId,
        assignedAt: new Date()
    }, { merge: true });

    return NextResponse.json({ 
        success: true, 
        message: `User ${userId} assigned to ${tenantId}`,
        path: tenantPath 
    });

  } catch (error: any) {
    console.error("Assignment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
