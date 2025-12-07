
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin'; 
import { Timestamp } from 'firebase-admin/firestore';
import { Paths } from '@/lib/firebase/paths';

export async function POST(req: Request) {
  try {
    // NOTE: This is a public endpoint for the Onboarding Demo.
    // In production, this would require an Invite Code or Payment Verification.
    
    const { province, city, barangay, region, adminProfile } = await req.json();

    if (!province || !city || !barangay) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slugify = (text: string) => text.toLowerCase().replace(/[\s\.]+/g, '-').replace(/[^\w-]+/g, '');

    const provinceSlug = slugify(province);
    const citySlug = slugify(city);
    const barangaySlug = slugify(barangay);

    // Construct the Logical Vault Path
    // e.g. provinces/cavite/cities/bacoor/barangays/brgy-simulation-197
    const vaultPath = `provinces/${provinceSlug}/cities/${citySlug}/barangays/${barangaySlug}`;
    const tenantSlug = `${citySlug}-${barangaySlug}`;
    
    const tenantRef = adminDb.doc(vaultPath);
    const directoryRef = adminDb.collection('tenant_directory').doc(tenantSlug);
    const settingsRef = adminDb.doc(`${vaultPath}/settings/general`); // Explicit settings path
    
    // Check existence
    const tenantSnap = await tenantRef.get();
    if (tenantSnap.exists) {
         const data = tenantSnap.data();
         // If already active, we might return 409, but for resilience we proceed if it's just a retry
         if (data?.status === 'Live') {
             console.log(`[PROVISION] Tenant ${vaultPath} already active.`);
         }
    }

    // --- 1. ADMIN USER CREATION (Server-Side) ---
    let adminUid = null;
    if (adminProfile && adminProfile.email && adminProfile.password) {
        try {
            console.log(`[PROVISION] Attempting to create/fetch admin: ${adminProfile.email}`);
            
            try {
                const userRecord = await adminAuth.createUser({
                    email: adminProfile.email,
                    password: adminProfile.password,
                    displayName: adminProfile.name,
                });
                adminUid = userRecord.uid;
                console.log(`[PROVISION] Created new Auth user: ${adminUid}`);
            } catch (authError: any) {
                if (authError.code === 'auth/email-already-exists') {
                    console.log(`[PROVISION] User exists. Fetching UID...`);
                    const user = await adminAuth.getUserByEmail(adminProfile.email);
                    adminUid = user.uid;
                    
                    // Optional: Update password to match this new provisioning attempt
                    // so the user isn't locked out if they forgot the old one.
                    await adminAuth.updateUser(adminUid, {
                        password: adminProfile.password,
                        displayName: adminProfile.name
                    });
                } else {
                    throw authError;
                }
            }

            // Set Claims
            await adminAuth.setCustomUserClaims(adminUid, {
                tenantPath: vaultPath,
                tenantId: tenantSlug,
                role: 'captain' // or 'admin'
            });
            console.log(`[PROVISION] Claims set for ${adminUid}`);

        } catch (e: any) {
            console.error(`[PROVISION] User creation failed: ${e.message}`);
        }
    }


    // --- 2. DB WRITES ---
    await adminDb.runTransaction(async (t) => {
        // A. Vault Root Metadata (minimal)
        t.set(tenantRef, {
            name: barangay,
            city: city,
            province: province,
            region: region || '', 
            fullPath: vaultPath,
            status: 'Live',
            createdAt: Timestamp.now(),
            location: {
                region: region || '',
                province: province,
                city: city,
                barangay: barangay
            }
        }, { merge: true });

        // B. Dedicated Settings Document (used by Admin Dashboard & Settings Page)
        // This ensures data is where the dashboard expects it.
        t.set(settingsRef, {
            barangayName: barangay,
            location: {
                province: province,
                city: city,
                region: region || '',
            },
            captainProfile: adminProfile ? {
                name: adminProfile.name,
                email: adminProfile.email,
            } : {},
            createdAt: Timestamp.now()
        }, { merge: true });

        // C. Directory Entry (Global Lookup)
        t.set(directoryRef, {
            fullPath: vaultPath,
            province,
            city,
            barangay,
            region: region || '',
            tenantId: tenantSlug,
            adminEmail: adminProfile?.email || '', // Store admin email for recovery
            updatedAt: Timestamp.now()
        }, { merge: true });

        // D. Admin User Profile (Global Firestore User)
        if (adminUid) {
            const userRef = adminDb.collection('users').doc(adminUid);
            t.set(userRef, {
                uid: adminUid,
                userId: adminUid, // Redundant but safe
                email: adminProfile.email,
                fullName: adminProfile.name,
                position: 'Punong Barangay (Captain)', // Using standard title
                role: 'captain',
                systemRole: 'Admin',
                tenantPath: vaultPath,
                tenantId: tenantSlug,
                createdAt: Timestamp.now(),
                status: 'Active'
            }, { merge: true });
        }
    });

    return NextResponse.json({ 
        success: true, 
        vaultPath, 
        tenantSlug,
        adminUid 
    });

  } catch (error: any) {
    console.error("Public Provisioning Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
