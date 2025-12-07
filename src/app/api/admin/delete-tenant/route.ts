
import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';
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

    console.log(`[DESTROY PROTOCOL] Initiating delete for Tenant: ${tenantId}`);

    // 1. Resolve Tenant Path
    const dirRef = adminDb.collection(Paths.TenantDirectory).doc(tenantId);
    const dirSnap = await dirRef.get();
    
    let fullPath = null;
    let adminEmail = null;
    if (dirSnap.exists) {
        const data = dirSnap.data();
        fullPath = data?.fullPath;
        adminEmail = data?.adminEmail;
    } else {
        console.warn(`[WARN] Tenant Directory entry not found for ${tenantId}. Proceeding with best-effort cleanup.`);
    }

    // 2. AUTHENTICATION WIPE (Delete Users)
    // Query Firestore first to get the mapped UIDs for this tenant.
    // This is faster and safer than iterating all Auth users.
    const usersSnap = await adminDb.collection('users')
        .where('tenantId', '==', tenantId)
        .get();

    const uidsToDelete: Set<string> = new Set();
    usersSnap.forEach(doc => {
        uidsToDelete.add(doc.id); // Firestore Doc ID matches Auth UID
    });

    // Fallback: If no users found in Firestore or partial data, try to find admin by email from Directory
    // This handles "Zombie Users" who exist in Auth but lost their Firestore profile.
    if (adminEmail) {
        try {
            const user = await adminAuth.getUserByEmail(adminEmail);
            if (!uidsToDelete.has(user.uid)) {
                 uidsToDelete.add(user.uid);
                 console.log(`[DESTROY] Found orphaned Auth user via directory email: ${adminEmail} -> ${user.uid}`);
            }
        } catch (e) {
            // User might already be deleted or email changed
            console.log(`[DESTROY] Checked for admin email ${adminEmail} but user not found (clean).`);
        }
    }

    if (uidsToDelete.size > 0) {
        // Bulk Delete from Firebase Auth
        const uidsArray = Array.from(uidsToDelete);
        const deleteResult = await adminAuth.deleteUsers(uidsArray);
        console.log(`[AUTH] Successfully deleted ${deleteResult.successCount} users. Failed: ${deleteResult.failureCount}`);
        
        if (deleteResult.failureCount > 0) {
            console.error(`[AUTH ERROR] Failed to delete some users:`, deleteResult.errors);
        }
    } else {
        console.log(`[AUTH] No associated users found to delete.`);
    }

    // 3. FIRESTORE DEEP CLEAN (Recursive Delete)
    // This removes the Directory Entry + Global User Profiles + The Entire Vault
    const batch = adminDb.batch();

    // A. Delete Directory Entry
    if (dirSnap.exists) {
        batch.delete(dirRef);
    }

    // B. Delete Global User Profiles (Firestore 'users' collection)
    uidsToDelete.forEach(uid => {
        const userRef = adminDb.collection('users').doc(uid);
        batch.delete(userRef);
    });

    await batch.commit(); // Commit the shallow deletes first

    // C. Recursive Delete of the Logical Vault (Subcollections)
    if (fullPath) {
        const vaultRef = adminDb.doc(fullPath);
        await adminDb.recursiveDelete(vaultRef);
        console.log(`[DB] Recursively deleted vault at: ${fullPath}`);
    }

    // 4. STORAGE WIPE (Best Practice)
    // Assuming we store files under a folder named after the tenantId or slug
    // e.g. "storage-bucket/tenants/bacoor-brgy-genesis/..."
    try {
        const bucket = adminStorage.bucket();
        await bucket.deleteFiles({
            prefix: `tenants/${tenantId}/` 
        });
        console.log(`[STORAGE] Cleaned up files for ${tenantId}`);
    } catch (storageError) {
        console.warn(`[STORAGE] Failed to clean up storage (bucket might be empty or diff structure):`, storageError);
        // Don't fail the request if storage is empty
    }

    return NextResponse.json({ 
        success: true, 
        message: 'Tenant and all associated data permanently destroyed.',
        usersDeleted: uidsToDelete.size
    });

  } catch (error: any) {
    console.error("[DESTROY ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
