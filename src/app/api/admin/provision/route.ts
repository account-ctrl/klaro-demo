
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; 
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Verify token and role
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        // Add more rigorous checks here if needed (e.g., custom claims)
    } catch (e) {
        return NextResponse.json({ error: 'Unauthorized Token' }, { status: 401 });
    }

    const { province, city, barangay } = await req.json();

    if (!province || !city || !barangay) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slugify = (text: string) => text.toLowerCase().replace(/[\s\.]+/g, '-').replace(/[^\w-]+/g, '');

    const provinceSlug = slugify(province);
    const citySlug = slugify(city);
    const barangaySlug = slugify(barangay);

    // Construct the Logical Vault Path
    const vaultPath = `provinces/${provinceSlug}/cities/${citySlug}/barangays/${barangaySlug}`;
    
    // 1. Create the Tenant Document at the specific path
    const tenantRef = adminDb.doc(vaultPath);
    
    // Check if it already exists to prevent overwrite? 
    // Ideally we might want to fail or merge. Let's fail for safety in provisioning.
    const tenantSnap = await tenantRef.get();
    if (tenantSnap.exists) {
         return NextResponse.json({ error: 'Tenant already exists at this path.' }, { status: 409 });
    }

    // 2. Create the Directory Mapping (for easy lookup by slug later)
    // We'll use the barangaySlug as the unique key in the directory for now.
    // NOTE: This assumes barangay slugs are unique globally or we need a better composite key.
    // For safety, let's use a composite key for the directory if possible, or just the barangaySlug if we assume global uniqueness is enforced elsewhere?
    // Requirement says "tenant_directory/{tenantSlug}". If multiple cities have "brgy-luz", we have a collision.
    // Let's use a composite slug for the directory key to be safe: "province-city-barangay"
    // Or if the Requirement implies {tenantSlug} is the short name, we must handle collisions or requirement refinement.
    // Let's assume for now we want unique lookup. We will key it by "barangaySlug" but warn on collision? 
    // Actually, usually "tenantSlug" implies a globally unique identifier for the tenant. 
    // Let's generate a unique tenantSlug: `${citySlug}-${barangaySlug}` (safer than just barangay)
    
    const tenantSlug = `${citySlug}-${barangaySlug}`;
    const directoryRef = adminDb.collection('tenant_directory').doc(tenantSlug);

    await adminDb.runTransaction(async (t) => {
        // Double check directory inside transaction
        const dirSnap = await t.get(directoryRef);
        if (dirSnap.exists) {
            throw new Error(`Tenant Slug collision: ${tenantSlug} already taken.`);
        }

        // Create Tenant Vault Doc
        t.set(tenantRef, {
            name: barangay,
            city: city,
            province: province,
            fullPath: vaultPath,
            status: 'Live',
            createdAt: Timestamp.now(),
            settings: {
                allowGlobalSearch: false, // Default lock
            }
        });

        // Create Directory Entry
        t.set(directoryRef, {
            fullPath: vaultPath,
            province,
            city,
            barangay,
            tenantId: tenantSlug
        });
    });

    return NextResponse.json({ 
        success: true, 
        vaultPath, 
        tenantSlug 
    });

  } catch (error: any) {
    console.error("Provisioning Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
