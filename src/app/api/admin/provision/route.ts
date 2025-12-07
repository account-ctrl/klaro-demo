
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin'; 
import { Timestamp } from 'firebase-admin/firestore';
import { Paths, slugify } from '@/lib/firebase/paths';

export async function POST(req: Request) {
  try {
    const { province, city, barangayName, adminName, adminEmail, password } = await req.json();

    if (!province || !city || !barangayName || !adminName || !adminEmail || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[PROVISION] Starting provisioning for ${barangayName}, ${city}, ${province}`);

    // 1. Generate Slugs
    const provinceSlug = slugify(province);
    const citySlug = slugify(city);
    const barangaySlug = slugify(barangayName);
    
    // 2. Construct Paths
    // Vault Path: provinces/cavite/cities/bacoor/barangays/brgy-genesis
    const vaultPath = Paths.getVaultRoot(province, city, barangayName);
    
    // Tenant Slug (Unique ID for the directory): bacoor-brgy-genesis
    const tenantSlug = `${citySlug}-${barangaySlug}`;

    console.log(`[PROVISION] Generated paths - Vault: ${vaultPath}, TenantSlug: ${tenantSlug}`);

    // 3. Auth: Create User
    let uid;
    let isNewUser = true;

    try {
        const userRecord = await adminAuth.createUser({
            email: adminEmail,
            password: password,
            displayName: adminName,
        });
        uid = userRecord.uid;
        console.log(`[PROVISION] Created new Auth user: ${uid}`);
    } catch (e: any) {
        if (e.code === 'auth/email-already-exists') {
             console.log(`[PROVISION] User ${adminEmail} already exists. Fetching UID...`);
             const user = await adminAuth.getUserByEmail(adminEmail);
             uid = user.uid;
             isNewUser = false;

             // Critical: Update the password to match the new provisioning request
             // otherwise the admin cannot login with the credentials they just provided.
             await adminAuth.updateUser(uid, {
                 password: password,
                 displayName: adminName
             });
             console.log(`[PROVISION] Updated existing Auth user credentials for: ${uid}`);

        } else {
            console.error(`[PROVISION] Auth creation failed:`, e);
            throw e;
        }
    }

    // 4. Set Custom Claims
    // Critical: This binds the user to the specific vault path in Security Rules
    // CHANGED: Role is now 'admin' instead of 'captain'
    await adminAuth.setCustomUserClaims(uid, {
        tenantPath: vaultPath,
        tenantId: tenantSlug,
        role: 'admin' 
    });
    console.log(`[PROVISION] Set custom claims for ${uid}`);

    // 5. Transactional Write (Atomic Operation)
    await adminDb.runTransaction(async (t) => {
        // References
        const directoryRef = adminDb.collection(Paths.TenantDirectory).doc(tenantSlug);
        const tenantRef = adminDb.doc(vaultPath);
        const settingsRef = adminDb.doc(Paths.getSettingsPath(vaultPath));
        const userProfileRef = adminDb.collection(Paths.Users).doc(uid); 

        // Step A: Directory (Global Lookup)
        t.set(directoryRef, {
            fullPath: vaultPath,
            adminEmail: adminEmail,
            province,
            city,
            barangay: barangayName,
            tenantId: tenantSlug,
            updatedAt: Timestamp.now()
        }, { merge: true });

        // Step B: Vault Root Metadata
        t.set(tenantRef, {
            name: barangayName,
            city: city,
            province: province,
            status: 'active',
            createdAt: Timestamp.now(),
            plan: 'free'
        }, { merge: true });

        // Step C: Pre-filled Settings (Including empty Puroks array)
        t.set(settingsRef, {
            barangayName: barangayName,
            location: {
                province: province,
                city: city,
            },
            captainProfile: {
                name: adminName,
                email: adminEmail,
            },
            puroks: [], // Initializing Puroks array
            createdAt: Timestamp.now()
        }, { merge: true });

        // Step D: Update User Profile (Global)
        // If it's a "zombie" user, we need to make sure this is recreated.
        // CHANGED: Role is now 'admin'
        t.set(userProfileRef, {
            email: adminEmail,
            fullName: adminName,
            role: 'admin', 
            tenantPath: vaultPath,
            tenantId: tenantSlug,
            updatedAt: Timestamp.now()
        }, { merge: true });
    });

    console.log(`[PROVISION] Transaction committed successfully.`);

    return NextResponse.json({ 
        success: true, 
        message: 'Provisioning complete.',
        tenantSlug,
        vaultPath
    });

  } catch (error: any) {
    console.error("[PROVISION ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
