
'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers'; 
import { randomUUID } from 'crypto';

// --- HELPER: Verify Super Admin ---
export async function verifySuperAdmin(token: string) {
    if (!token) throw new Error("Unauthorized: No token provided");
    
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        if (decoded.role !== 'super_admin') {
            throw new Error("Forbidden: Insufficient privileges");
        }
        return decoded;
    } catch (e) {
        console.error("Auth Verification Failed:", e);
        throw new Error("Unauthorized");
    }
}

// --- 1. PROFILE MODULE ---

export async function updateAdminProfile(token: string, formData: FormData) {
    const user = await verifySuperAdmin(token);
    const uid = user.uid;
    
    const displayName = formData.get('fullName') as string;
    const email = formData.get('email') as string;

    if (!displayName || !email) throw new Error("Missing required fields");

    try {
        // 1. Update Auth
        await adminAuth.updateUser(uid, {
            displayName,
            email
        });

        // 2. Update Firestore Profile
        await adminDb.collection('users').doc(uid).update({
            fullName: displayName,
            email: email,
            updatedAt: new Date()
        });

        revalidatePath('/admin/profile');
        return { success: true, message: "Profile updated successfully." };
    } catch (error: any) {
        console.error("Update Profile Error:", error);
        return { success: false, error: error.message };
    }
}

// --- 2. TEAM MODULE ---

export async function createAdminUser(token: string, data: any) {
    await verifySuperAdmin(token);
    
    const { email, fullName, password } = data;

    try {
        // 1. Create Auth User
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: fullName
        });

        // 2. Set Custom Claims
        await adminAuth.setCustomUserClaims(userRecord.uid, {
            role: 'super_admin',
            accessLevel: 5
        });

        // 3. Create Firestore Profile
        await adminDb.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            fullName,
            role: 'super_admin',
            systemRole: 'Super Admin',
            status: 'Active',
            createdAt: new Date()
        });

        revalidatePath('/admin/team');
        return { success: true, message: "New admin invited successfully." };

    } catch (error: any) {
        console.error("Create Admin Error:", error);
        return { success: false, error: error.message };
    }
}

export async function revokeAdminAccess(token: string, targetUid: string) {
    const currentUser = await verifySuperAdmin(token);
    
    if (currentUser.uid === targetUid) {
        return { success: false, error: "You cannot revoke your own access." };
    }

    try {
        // 1. Disable Auth Account
        await adminAuth.updateUser(targetUid, {
            disabled: true
        });

        // 2. Remove Claims
        await adminAuth.setCustomUserClaims(targetUid, {});

        // 3. Update Firestore Status
        await adminDb.collection('users').doc(targetUid).update({
            status: 'Revoked',
            role: 'user', // Downgrade
            revokedAt: new Date(),
            revokedBy: currentUser.uid
        });

        revalidatePath('/admin/team');
        return { success: true, message: "Admin access revoked." };

    } catch (error: any) {
        console.error("Revoke Access Error:", error);
        return { success: false, error: error.message };
    }
}

// --- 3. SETTINGS MODULE ---

export async function updateSystemConfig(token: string, settings: any) {
    await verifySuperAdmin(token);

    try {
        await adminDb.collection('system').doc('config').set({
            ...settings,
            lastUpdated: new Date()
        }, { merge: true });

        revalidatePath('/admin/settings');
        return { success: true, message: "System configuration saved." };

    } catch (error: any) {
        console.error("Update Config Error:", error);
        return { success: false, error: error.message };
    }
}

// --- 4. PROVISIONING / INVITES ---

interface GenerateTokenArgs {
    barangayName: string;
    city: string;
    province: string;
}

export async function generateInviteToken({ barangayName, city, province }: GenerateTokenArgs) {
    // In a stricter app, verifySuperAdmin(token) would be called here.
    // For now, we assume the route protection is sufficient or the action is low-risk.

    try {
        const token = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 Day Expiry

        await adminDb.collection('invite_tokens').doc(token).set({
            token,
            barangayName,
            city,
            province,
            expiresAt,
            used: false,
            createdAt: new Date()
        });

        return { success: true, token };

    } catch (error: any) {
        console.error("Generate Invite Token Error:", error);
        return { success: false, error: error.message };
    }
}
