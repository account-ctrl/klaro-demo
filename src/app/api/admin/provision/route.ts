
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin'; 
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { province, city, barangayName, adminName, adminEmail, password } = await req.json();

    if (!province || !city || !barangayName || !adminName || !adminEmail || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slugify = (text: string) => text.toLowerCase().replace(/[\s\.]+/g, '-').replace(/[^\w-]+/g, '');

    const provinceSlug = slugify(province);
    const citySlug = slugify(city);
    const barangaySlug = slugify(barangayName);

    // 1. Construct the Tenant Path
    const vaultPath = `provinces/${provinceSlug}/cities/${citySlug}/barangays/${barangaySlug}`;
    const tenantSlug = `${citySlug}-${barangaySlug}`;

    // 2. Auth: Create User
    let uid;
    try {
        const userRecord = await adminAuth.createUser({
            email: adminEmail,
            password: password,
            displayName: adminName,
        });
        uid = userRecord.uid;
    } catch (e: any) {
        if (e.code === 'auth/email-already-exists') {
             const user = await adminAuth.getUserByEmail(adminEmail);
             uid = user.uid;
        } else {
            throw e;
        }
    }

    // 3. Set Custom Claims
    await adminAuth.setCustomUserClaims(uid, {
        tenantPath: vaultPath,
        tenantId: tenantSlug,
        role: 'captain'
    });

    // 4. Transactional Write
    await adminDb.runTransaction(async (t) => {
        const directoryRef = adminDb.collection('tenant_directory').doc(tenantSlug);
        const tenantRef = adminDb.doc(vaultPath);
        const settingsRef = adminDb.doc(`${vaultPath}/settings/general`);
        const userProfileRef = adminDb.collection('users').doc(uid); // For client-side fallback

        // Step A: Directory
        t.set(directoryRef, {
            fullPath: vaultPath,
            adminEmail: adminEmail,
            province,
            city,
            barangay: barangayName,
            tenantId: tenantSlug
        }, { merge: true });

        // Step B: Vault Root Metadata
        t.set(tenantRef, {
            name: barangayName,
            city: city,
            province: province,
            status: 'Live',
            createdAt: Timestamp.now(),
            plan: 'standard'
        }, { merge: true });

        // Step C: Pre-filled Settings (Crucial for Dashboard UX)
        t.set(settingsRef, {
            barangayName: barangayName,
            location: {
                province: province,
                city: city,
                region: 'IV-A' // Could be dynamic if passed
            },
            captainProfile: {
                name: adminName,
                email: adminEmail,
                contactNumber: ''
            },
            modules: ['blotter', 'residents', 'certificates'],
            theme: {
                primaryColor: 'blue',
            },
            lastUpdated: Timestamp.now()
        }, { merge: true });

        // Step D: Update User Profile in Firestore
        t.set(userProfileRef, {
            email: adminEmail,
            fullName: adminName,
            role: 'captain',
            tenantPath: vaultPath,
            tenantId: tenantSlug,
            updatedAt: Timestamp.now()
        }, { merge: true });
    });

    return NextResponse.json({ 
        success: true, 
        message: 'Provisioning complete.',
        tenantSlug,
        vaultPath
    });

  } catch (error: any) {
    console.error("Provisioning Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
