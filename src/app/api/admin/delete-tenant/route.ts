
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Verify Admin
    const decoded = await adminAuth.verifyIdToken(token);
    // Allow if super_admin or we can check claims
    // For now assume valid admin token is enough for this dev phase or check strict role
    // if (decoded.role !== 'super_admin') ...

    const { tenantId } = await req.json();

    if (!tenantId) {
        return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    console.log(`Deleting Tenant: ${tenantId}`);

    // 1. Delete from Tenant Directory (New Arch)
    const dirRef = adminDb.collection('tenant_directory').doc(tenantId);
    const dirSnap = await dirRef.get();
    
    let fullPath = null;
    if (dirSnap.exists) {
        fullPath = dirSnap.data()?.fullPath;
        await dirRef.delete();
    }

    // 2. Delete the Logical Vault Document (New Arch)
    if (fullPath) {
        await adminDb.doc(fullPath).delete();
        // Ideally we recursive delete subcollections here, but Firestore doesn't do that natively 
        // without a cloud function or recursive tool. For now we delete the root anchor.
    }

    // 3. Delete from Legacy 'barangays' collection (Old Arch / Hybrid)
    // Sometimes tenantId matches the doc ID in 'barangays'
    await adminDb.collection('barangays').doc(tenantId).delete();

    // 4. Cleanup Users? (Optional)
    // We could query users where tenantId == ... and update them.

    return NextResponse.json({ success: true, message: 'Tenant deleted successfully.' });

  } catch (error: any) {
    console.error("Delete Tenant Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
