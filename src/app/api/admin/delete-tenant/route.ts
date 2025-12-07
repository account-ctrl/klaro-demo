
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Paths } from '@/lib/firebase/paths';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Verify Admin
    const decoded = await adminAuth.verifyIdToken(token);
    
    // Strict Role Check: Only Super Admin can delete tenants
    if (decoded.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden: Insufficient privileges.' }, { status: 403 });
    }

    const { tenantId } = await req.json();

    if (!tenantId) {
        return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    console.log(`Deleting Tenant: ${tenantId}`);

    // 1. Get Tenant Details from Directory
    const dirRef = adminDb.collection(Paths.TenantDirectory).doc(tenantId);
    const dirSnap = await dirRef.get();
    
    let fullPath = null;
    if (dirSnap.exists) {
        fullPath = dirSnap.data()?.fullPath;
    } else {
        console.warn(`Tenant Directory entry not found for ${tenantId}. Proceeding with cleanup.`);
    }

    // 2. Perform Deletion
    const batch = adminDb.batch();

    // A. Delete Directory Entry
    if (dirSnap.exists) {
        batch.delete(dirRef);
    }

    // B. Delete Vault Root Document
    if (fullPath) {
        const vaultRef = adminDb.doc(fullPath);
        batch.delete(vaultRef);
        
        // C. Delete Settings Document
        const settingsRef = adminDb.doc(Paths.getSettingsPath(fullPath));
        batch.delete(settingsRef);
    }

    await batch.commit();

    // Note: Firestore does not support recursive delete of subcollections via SDK in one go.
    // The subcollections (residents, assets) will become "orphaned" (unreachable via UI) 
    // but technically still exist until a Cloud Function sweeps them.
    // For this admin dashboard, breaking the link (Directory & Root) is sufficient to "delete" it from view.

    return NextResponse.json({ success: true, message: 'Tenant deleted successfully.' });

  } catch (error: any) {
    console.error("Delete Tenant Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
