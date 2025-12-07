
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; 
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    // NOTE: This is a public endpoint for the Onboarding Demo.
    // In production, this would require an Invite Code or Payment Verification.
    
    const { province, city, barangay, region } = await req.json();

    if (!province || !city || !barangay) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slugify = (text: string) => text.toLowerCase().replace(/[\s\.]+/g, '-').replace(/[^\w-]+/g, '');

    const provinceSlug = slugify(province);
    const citySlug = slugify(city);
    const barangaySlug = slugify(barangay);

    // Construct the Logical Vault Path
    const vaultPath = `provinces/${provinceSlug}/cities/${citySlug}/barangays/${barangaySlug}`;
    
    const tenantRef = adminDb.doc(vaultPath);
    
    // Check existence
    const tenantSnap = await tenantRef.get();
    if (tenantSnap.exists) {
         // If it exists, we return success so the onboarding can proceed to claim it (idempotent-ish)
         // But strictly we should check status.
         const data = tenantSnap.data();
         if (data?.status === 'Live') {
             return NextResponse.json({ error: 'Tenant already active.' }, { status: 409 });
         }
    }

    const tenantSlug = `${citySlug}-${barangaySlug}`;
    const directoryRef = adminDb.collection('tenant_directory').doc(tenantSlug);

    await adminDb.runTransaction(async (t) => {
        // Create/Update Tenant Vault Doc
        t.set(tenantRef, {
            name: barangay,
            city: city,
            province: province,
            region: region || '', // Save region
            fullPath: vaultPath,
            status: 'Live',
            createdAt: Timestamp.now(),
            settings: {
                allowGlobalSearch: false, 
            },
            location: {
                region: region || '',
                province: province,
                city: city,
                barangay: barangay
            }
        }, { merge: true });

        // Create Directory Entry
        t.set(directoryRef, {
            fullPath: vaultPath,
            province,
            city,
            barangay,
            region: region || '',
            tenantId: tenantSlug
        }, { merge: true });
    });

    return NextResponse.json({ 
        success: true, 
        vaultPath, 
        tenantSlug 
    });

  } catch (error: any) {
    console.error("Public Provisioning Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
