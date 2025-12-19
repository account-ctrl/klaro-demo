
'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface CreateUserParams {
    email: string;
    password?: string;
    fullName: string;
    position: string;
    systemRole: string;
    tenantId: string;
    tenantPath: string;
}

export async function createUserAction(params: CreateUserParams) {
    console.log("[Server Action] Creating User:", params.email);

    if (!params.email || !params.tenantId || !params.tenantPath) {
        return { success: false, error: "Missing required fields." };
    }

    try {
        // 1. Create Auth User
        const userRecord = await adminAuth.createUser({
            email: params.email,
            password: params.password || 'Temporary123!', // Default if not provided
            displayName: params.fullName,
            emailVerified: true // Auto-verify for internal staff
        });

        // 2. Set Custom Claims (Critical for Security Rules)
        // Normalize role key (e.g. 'Admin' -> 'admin') just in case
        const normalizedRole = params.systemRole.toLowerCase();
        
        await adminAuth.setCustomUserClaims(userRecord.uid, {
            tenantId: params.tenantId,
            tenantPath: params.tenantPath,
            role: normalizedRole
        });

        // 3. Create User Document (Root 'users' collection)
        await adminDb.collection('users').doc(userRecord.uid).set({
            userId: userRecord.uid,
            fullName: params.fullName,
            email: params.email,
            position: params.position,
            systemRole: normalizedRole,
            tenantId: params.tenantId, 
            tenantPath: params.tenantPath,
            status: 'Active',
            createdAt: FieldValue.serverTimestamp(),
            role: normalizedRole 
        });

        console.log(`[Server Action] User created successfully: ${userRecord.uid}`);
        return { success: true, userId: userRecord.uid };

    } catch (error: any) {
        console.error("[Server Action] Error creating user:", error);
        
        // Handle "Email already exists" gracefully
        if (error.code === 'auth/email-already-exists') {
            return { success: false, error: "A user with this email already exists." };
        }

        return { success: false, error: error.message };
    }
}

/**
 * Smart Sync: Checks if user exists. 
 * If yes -> Updates claims/doc and returns ID.
 * If no -> Creates new user.
 */
export async function syncCaptainAction(params: CreateUserParams) {
    console.log("[Server Action] Syncing Captain:", params.email);

    try {
        // 1. Try to fetch existing user
        const existingUser = await adminAuth.getUserByEmail(params.email);
        
        console.log(`[Server Action] Found existing captain user: ${existingUser.uid}`);
        
        // 2. Update their claims to ensure they are Admin of THIS tenant
        const normalizedRole = 'admin'; // Captain is always admin
        await adminAuth.setCustomUserClaims(existingUser.uid, {
            tenantId: params.tenantId,
            tenantPath: params.tenantPath,
            role: normalizedRole
        });

        // 3. Update/Ensure User Doc exists
        await adminDb.collection('users').doc(existingUser.uid).set({
            userId: existingUser.uid,
            fullName: params.fullName, // Update name from profile if changed
            email: params.email,
            position: params.position,
            systemRole: normalizedRole,
            tenantId: params.tenantId,
            tenantPath: params.tenantPath,
            status: 'Active',
            role: normalizedRole,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, userId: existingUser.uid, isNew: false };

    } catch (error: any) {
        // If user not found, create them
        if (error.code === 'auth/user-not-found') {
            console.log("[Server Action] Captain user not found. Creating new...");
            const result = await createUserAction(params);
            if (result.success) {
                return { success: true, userId: result.userId, isNew: true };
            }
            return result;
        }
        
        console.error("[Server Action] Sync error:", error);
        return { success: false, error: error.message };
    }
}
