
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Paths, slugify } from '@/lib/firebase/paths';
import { Timestamp } from 'firebase-admin/firestore';

export interface ProvisionData {
    province: string;
    city: string;
    barangay: string;
    region?: string;
    adminProfile: {
        name: string;
        email: string;
        password?: string;
    };
    inviteToken?: string;
}

export async function provisionTenant(data: ProvisionData) {
    const { province, city, barangay, region, adminProfile } = data;
    const tenantSlug = `${slugify(city)}-${slugify(barangay)}`;
    const vaultPath = Paths.getVaultRoot(province, city, barangay);

    try {
        console.log(`[PROVISION ENGINE] Starting: ${barangay}, ${city}`);
        
        // --- 1. Auth Creation ---
        let uid;
        try {
            const userRecord = await adminAuth.createUser({
                email: adminProfile.email,
                password: adminProfile.password,
                displayName: adminProfile.name,
            });
            uid = userRecord.uid;
            console.log(`[PROVISION ENGINE] New Auth User: ${uid}`);
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-exists') {
                const user = await adminAuth.getUserByEmail(adminProfile.email);
                uid = user.uid;
                console.log(`[PROVISION ENGINE] User ${uid} exists. Updating...`);
                if (adminProfile.password) {
                    await adminAuth.updateUser(uid, { password: adminProfile.password, displayName: adminProfile.name });
                }
            } else {
                throw authError; // Rethrow other auth errors
            }
        }

        // --- 2. RBAC Enforcement ---
        await adminAuth.setCustomUserClaims(uid, {
            tenantPath: vaultPath,
            tenantId: tenantSlug,
            role: 'admin' 
        });
        console.log(`[PROVISION ENGINE] Claims Synced for ${uid}`);

        // --- 3. Atomic Database Write ---
        await adminDb.runTransaction(async (t) => {
            const directoryRef = adminDb.collection(Paths.TenantDirectory).doc(tenantSlug);
            const tenantRef = adminDb.doc(vaultPath);
            const settingsRef = adminDb.doc(Paths.getSettingsPath(vaultPath));
            const userRef = adminDb.collection(Paths.Users).doc(uid);

            t.set(directoryRef, { fullPath: vaultPath, province, city, barangay, region: region || '', tenantId: tenantSlug, adminEmail: adminProfile.email, updatedAt: Timestamp.now(), status: 'active' }, { merge: true });
            t.set(tenantRef, { name: barangay, city, province, region: region || '', status: 'active', createdAt: Timestamp.now(), plan: 'free' }, { merge: true });
            t.set(settingsRef, { barangayName: barangay, location: { province, city, region: region || '' }, captainProfile: { name: adminProfile.name, email: adminProfile.email }, puroks: [], createdAt: Timestamp.now() }, { merge: true });
            t.set(userRef, { uid, email: adminProfile.email, fullName: adminProfile.name, role: 'admin', systemRole: 'Admin', position: 'Punong Barangay (Captain)', tenantPath: vaultPath, tenantId: tenantSlug, status: 'Active', updatedAt: Timestamp.now() }, { merge: true });

            // --- 4. Mark Invite Token as Used (Corrected) ---
            if (data.inviteToken) {
                 const inviteRef = adminDb.collection('invite_tokens').doc(data.inviteToken); // CORRECTED COLLECTION
                 t.update(inviteRef, { 
                     used: true, // Field name from generator
                     usedBy: adminProfile.email,
                     usedAt: Timestamp.now(),
                     tenantCreated: tenantSlug
                 });
                 console.log(`[PROVISION ENGINE] Marked token ${data.inviteToken} as used.`);
            }
        });

        console.log(`[PROVISION ENGINE] Success: ${tenantSlug}`);
        return { success: true, tenantSlug, vaultPath, uid };

    } catch (error) {
        console.error(`[PROVISION ENGINE] FATAL ERROR for ${tenantSlug}:`, error);
        // This will be caught by the API route and returned as a proper JSON error
        throw new Error(`Failed to provision tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
