
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    const { userId, tenantSlug, fullName, email, role } = await req.json();

    if (!userId || !tenantSlug) {
      return NextResponse.json({ error: 'Missing userId or tenantSlug' }, { status: 400 });
    }

    // 1. Resolve Tenant Path
    // Assuming tenant_directory uses the tenantSlug as document ID
    const dirRef = adminDb.collection('tenant_directory').doc(tenantSlug);
    const dirSnap = await dirRef.get();

    if (!dirSnap.exists) {
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
        role: role || 'admin' 
    });

    // 3. Update Firestore Profile (for frontend fallback/sync)
    // CRITICAL: We must ensure the user profile has all display info
    const userUpdate = {
        tenantPath: tenantPath,
        tenantId: tenantId,
        assignedAt: new Date(),
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(role && { role }),
        // Ensure system roles are set if missing
        systemRole: role === 'super_admin' ? 'SuperAdmin' : 'Admin' 
    };

    await adminDb.collection('users').doc(userId).set(userUpdate, { merge: true });

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
