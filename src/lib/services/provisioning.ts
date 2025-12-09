
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Paths, slugify } from '@/lib/firebase/paths';
import { Timestamp } from 'firebase-admin/firestore';

interface OfficialData {
    name: string;
    role: 'Captain' | 'Secretary' | 'Treasurer' | 'Councilor';
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
    officials?: OfficialData[];
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

            t.set(directoryRef, { name: barangay, fullPath: vaultPath, province, city, barangay, region: region || '', tenantId: tenantSlug, adminEmail: adminProfile.email, updatedAt: Timestamp.now(), status: 'Live' }, { merge: true });
            t.set(tenantRef, { name: barangay, city, province, region: region || '', status: 'active', createdAt: Timestamp.now(), plan: 'free' }, { merge: true });
            
            t.set(settingsRef, { 
                barangayName: barangay, 
                province: province,
                city: city,
                region: region || '',
                captainProfile: { name: adminProfile.name, email: adminProfile.email }, 
                puroks: [], 
                createdAt: Timestamp.now() 
            }, { merge: true });

            t.set(userRef, { uid, email: adminProfile.email, fullName: adminProfile.name, role: 'admin', systemRole: 'Admin', position: 'Punong Barangay (Captain)', tenantPath: vaultPath, tenantId: tenantSlug, status: 'Active', updatedAt: Timestamp.now() }, { merge: true });

            const officialsCollectionRef = adminDb.collection(Paths.getOfficialsPath(vaultPath));
            
            // 4a. Add Captain if not in list
            const captainExists = officials?.some(o => o.name === adminProfile.name && o.role === 'Captain');
            if (!captainExists) {
                const captainDocRef = officialsCollectionRef.doc();
                t.set(captainDocRef, {
                    name: adminProfile.name,
                    position: 'Punong Barangay', // Standardized title
                    termStart: Timestamp.now(),
                    termEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
                    status: 'Active',
                    systemRole: 'Admin',
                    email: adminProfile.email, // Link email
                    createdAt: Timestamp.now()
                });
            }

            // 4b. Add other officials
            if (officials && officials.length > 0) {
                officials.forEach(official => {
                    // Skip if this is the captain we just added (redundancy check)
                    if (official.name === adminProfile.name && official.role === 'Captain' && !captainExists) return;

                    const docRef = officialsCollectionRef.doc();
                    t.set(docRef, {
                        name: official.name,
                        position: official.role,
                        termStart: Timestamp.now(),
                        termEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
                        status: 'Active',
                        createdAt: Timestamp.now()
                    });
                });
            }

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
