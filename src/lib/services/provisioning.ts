
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Paths, slugify } from '@/lib/firebase/paths';
import { Timestamp } from 'firebase-admin/firestore';

// Interface for a single official from the onboarding form
interface OfficialData {
    name: string;
    role: 'Captain' | 'Secretary' | 'Treasurer' | 'Councilor';
    // other fields if they exist
}

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
    officials?: OfficialData[]; // Add the full list of officials
    inviteToken?: string;
}

export async function provisionTenant(data: ProvisionData) {
    const { province, city, barangay, region, adminProfile, officials } = data;
    const tenantSlug = `${slugify(city)}-${slugify(barangay)}`;
    const vaultPath = Paths.getVaultRoot(province, city, barangay);

    try {
        console.log(`[PROVISION ENGINE] Starting: ${barangay}, ${city}`);
        
        let uid;
        try {
            const userRecord = await adminAuth.createUser({
                email: adminProfile.email,
                password: adminProfile.password,
                displayName: adminProfile.name,
            });
            uid = userRecord.uid;
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-exists') {
                const user = await adminAuth.getUserByEmail(adminProfile.email);
                uid = user.uid;
                if (adminProfile.password) {
                    await adminAuth.updateUser(uid, { password: adminProfile.password, displayName: adminProfile.name });
                }
            } else {
                throw authError;
            }
        }

        await adminAuth.setCustomUserClaims(uid, {
            tenantPath: vaultPath,
            tenantId: tenantSlug,
            role: 'admin' 
        });

        await adminDb.runTransaction(async (t) => {
            const directoryRef = adminDb.collection(Paths.TenantDirectory).doc(tenantSlug);
            const tenantRef = adminDb.doc(vaultPath);
            const settingsRef = adminDb.doc(Paths.getSettingsPath(vaultPath));
            const userRef = adminDb.collection(Paths.Users).doc(uid);

            // 1. Set Directory and Vault data
            t.set(directoryRef, { name: barangay, fullPath: vaultPath, province, city, barangay, region: region || '', tenantId: tenantSlug, adminEmail: adminProfile.email, updatedAt: Timestamp.now(), status: 'Live' }, { merge: true });
            t.set(tenantRef, { name: barangay, city, province, region: region || '', status: 'active', createdAt: Timestamp.now(), plan: 'free' }, { merge: true });
            
            // 2. Set Barangay Profile in Settings
            t.set(settingsRef, { 
                barangayName: barangay, 
                location: { province, city, region: region || '' }, 
                captainProfile: { name: adminProfile.name, email: adminProfile.email }, 
                puroks: [], 
                createdAt: Timestamp.now() 
            }, { merge: true });

            // 3. Set Admin User Profile
            t.set(userRef, { uid, email: adminProfile.email, fullName: adminProfile.name, role: 'admin', systemRole: 'Admin', position: 'Punong Barangay (Captain)', tenantPath: vaultPath, tenantId: tenantSlug, status: 'Active', updatedAt: Timestamp.now() }, { merge: true });

            // 4. Create documents for all officials in the vault
            if (officials && officials.length > 0) {
                const officialsCollectionRef = adminDb.collection(Paths.getOfficialsPath(vaultPath));
                officials.forEach(official => {
                    const docRef = officialsCollectionRef.doc(); // Auto-generate ID
                    t.set(docRef, {
                        name: official.name,
                        position: official.role, // Match the settings page UI
                        termStart: Timestamp.now(), // Placeholder value
                        termEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 3)), // Placeholder value
                        status: 'Active',
                        createdAt: Timestamp.now()
                    });
                });
                console.log(`[PROVISION ENGINE] Added ${officials.length} officials to the vault.`);
            }

            // 5. Mark invite token as used
            if (data.inviteToken) {
                 const inviteRef = adminDb.collection('invite_tokens').doc(data.inviteToken);
                 t.update(inviteRef, { used: true, usedBy: adminProfile.email, usedAt: Timestamp.now(), tenantCreated: tenantSlug });
            }
        });

        console.log(`[PROVISION ENGINE] Success: ${tenantSlug}`);
        return { success: true, tenantSlug, vaultPath, uid };

    } catch (error) {
        console.error(`[PROVISION ENGINE] FATAL ERROR for ${tenantSlug}:`, error);
        throw new Error(`Failed to provision tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
