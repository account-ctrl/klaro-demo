
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
    inviteToken?: string; // Optional: Used for auditing which invite triggered this
}

export async function provisionTenant(data: ProvisionData) {
    const { province, city, barangay, region, adminProfile } = data;

    console.log(`[PROVISION ENGINE] Starting: ${barangay}, ${city}`);

    // 1. Path Consistency
    const vaultPath = Paths.getVaultRoot(province, city, barangay);
    const tenantSlug = `${slugify(city)}-${slugify(barangay)}`;
    const tenantRef = adminDb.doc(vaultPath);
    const directoryRef = adminDb.collection(Paths.TenantDirectory).doc(tenantSlug);
    const settingsRef = adminDb.doc(Paths.getSettingsPath(vaultPath));

    // 2. Auth Creation (Idempotent)
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
            console.log(`[PROVISION ENGINE] User exists. Updating...`);
            const user = await adminAuth.getUserByEmail(adminProfile.email);
            uid = user.uid;
            
            // Sync password if provided (Important for recovery/retry)
            if (adminProfile.password) {
                await adminAuth.updateUser(uid, {
                    password: adminProfile.password,
                    displayName: adminProfile.name
                });
            }
        } else {
            throw authError;
        }
    }

    // 3. RBAC Enforcement (The Security Core)
    // We enforce 'admin' role here. This matches the Security Rules:
    // allow write: if request.auth.token.role == 'admin' && request.auth.token.tenantPath == ...
    await adminAuth.setCustomUserClaims(uid, {
        tenantPath: vaultPath,
        tenantId: tenantSlug,
        role: 'admin' 
    });
    console.log(`[PROVISION ENGINE] Claims Synced: role=admin, path=${vaultPath}`);

    // 4. Atomic Database Write
    await adminDb.runTransaction(async (t) => {
        // A. Directory (Global Lookup)
        t.set(directoryRef, {
            fullPath: vaultPath,
            province,
            city,
            barangay,
            region: region || '',
            tenantId: tenantSlug,
            adminEmail: adminProfile.email,
            updatedAt: Timestamp.now(),
            status: 'active'
        }, { merge: true });

        // B. Vault Metadata
        t.set(tenantRef, {
            name: barangay,
            city: city,
            province: province,
            region: region || '',
            status: 'active',
            createdAt: Timestamp.now(),
            plan: 'free' // Default plan
        }, { merge: true });

        // C. Tenant Settings (For Dashboard Access)
        t.set(settingsRef, {
            barangayName: barangay,
            location: {
                province,
                city,
                region: region || ''
            },
            captainProfile: {
                name: adminProfile.name,
                email: adminProfile.email
            },
            puroks: [], // Empty array for fresh start
            createdAt: Timestamp.now()
        }, { merge: true });

        // D. User Profile (For Sidebar/Header Display)
        const userRef = adminDb.collection(Paths.Users).doc(uid);
        t.set(userRef, {
            uid: uid,
            email: adminProfile.email,
            fullName: adminProfile.name,
            role: 'admin', // Syncs with Auth Claim
            systemRole: 'Admin', // Display Label
            position: 'Punong Barangay (Captain)', // Default Title
            tenantPath: vaultPath,
            tenantId: tenantSlug,
            status: 'Active',
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        // E. Audit Log (If invite token used)
        if (data.inviteToken) {
             const inviteRef = adminDb.collection('onboarding_invites').doc(data.inviteToken);
             t.update(inviteRef, { 
                 status: 'used', 
                 usedBy: adminProfile.email,
                 usedAt: Timestamp.now(),
                 tenantCreated: tenantSlug
             });
        }
    });

    console.log(`[PROVISION ENGINE] Success: ${tenantSlug}`);

    return {
        success: true,
        tenantSlug,
        vaultPath,
        uid
    };
}
