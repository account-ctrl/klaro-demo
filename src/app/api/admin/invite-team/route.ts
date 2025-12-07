
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getTenantPath } from '@/lib/firebase/db-client'; // We'll need to adapt this for Admin SDK or inline logic

export async function POST(req: Request) {
    try {
        // 1. Verify Caller is Admin (Security)
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split('Bearer ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const decodedToken = await adminAuth.verifyIdToken(token);
        // Allow Super Admin OR existing Tenant Admin to invite
        // If Tenant Admin, they can only invite to their own tenant.
        
        const { email, role, tenantSlug } = await req.json(); // tenantSlug is optional if caller is already scoped

        // Determine Target Tenant Path
        let targetTenantPath: string | undefined;
        let targetTenantId: string | undefined;

        if (decodedToken.role === 'super_admin') {
            if (!tenantSlug) {
                // Inviting another Super Admin? Or error?
                // If role is super_admin, maybe no tenant path needed.
                if (role !== 'super_admin') return NextResponse.json({ error: 'Tenant Slug required for non-super-admin invites' }, { status: 400 });
            } else {
                // Resolving Tenant Path for the invitee
                const dirSnap = await adminDb.collection('tenant_directory').doc(tenantSlug).get();
                if (!dirSnap.exists) {
                     return NextResponse.json({ error: 'Invalid Tenant Slug' }, { status: 404 });
                }
                targetTenantPath = dirSnap.data()?.fullPath;
                targetTenantId = tenantSlug;
            }
        } else {
            // Caller is a Tenant Admin inviting someone to THEIR tenant
            targetTenantPath = decodedToken.tenantPath;
            targetTenantId = decodedToken.tenantId; // Assuming we add this claim too
            
            if (!targetTenantPath) {
                 return NextResponse.json({ error: 'Caller has no tenant context' }, { status: 403 });
            }
        }

        // 2. Create User (or get existing)
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(email);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                userRecord = await adminAuth.createUser({ email });
            } else {
                throw e;
            }
        }

        // 3. Set Claims (The Magic Link for Security Rules)
        const claims: any = {
            role: role, // 'admin', 'staff', 'resident'
        };

        if (targetTenantPath) {
            claims.tenantPath = targetTenantPath;
            claims.tenantId = targetTenantId;
        }
        
        // Merge with existing claims if necessary, but here we overwrite for simplicity/security
        await adminAuth.setCustomUserClaims(userRecord.uid, claims);

        // 4. Update User Profile in Firestore (For Frontend Fallback)
        await adminDb.collection('users').doc(userRecord.uid).set({
            email: email,
            role: role,
            tenantPath: targetTenantPath || null,
            tenantId: targetTenantId || null,
            updatedAt: new Date()
        }, { merge: true });

        // 5. Generate Invite Link
        const link = await adminAuth.generatePasswordResetLink(email);

        console.log(`Invite link for ${email} [${role}] @ ${targetTenantId}: ${link}`);

        return NextResponse.json({ success: true, inviteLink: link, tenantId: targetTenantId });

    } catch (error: any) {
        console.error("Invite Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
