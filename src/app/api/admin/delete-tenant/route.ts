
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

    // 2. DISABLE ALL USERS (Officials & Residents)
    // We search for any user who has a custom claim matching this tenantId
    // Note: 'listUsers' is slow for millions, but fine for tenant-level cleanup.
    // Ideally, this should be a Cloud Function for scalability.
    
    let nextPageToken;
    let disabledCount = 0;
    
    do {
        const listUsersResult = await adminAuth.listUsers(1000, nextPageToken);
        const usersToDisable = listUsersResult.users.filter(user => 
            user.customClaims && user.customClaims.tenantId === tenantId
        );

        for (const user of usersToDisable) {
            await adminAuth.updateUser(user.uid, { disabled: true });
            // Optionally, we could wipe their claims too:
            // await adminAuth.setCustomUserClaims(user.uid, null);
            disabledCount++;
        }
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Disabled ${disabledCount} users for tenant ${tenantId}`);


    // 3. Perform Database Deletion
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

    return NextResponse.json({ 
        success: true, 
        message: 'Tenant deleted and users disabled.',
        usersDisabled: disabledCount
    });

  } catch (error: any) {
    console.error("Delete Tenant Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
