
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
        // This is what the Emergency System queries for responders
        await adminDb.collection('users').doc(userRecord.uid).set({
            userId: userRecord.uid,
            fullName: params.fullName,
            email: params.email,
            position: params.position,
            systemRole: normalizedRole,
            tenantId: params.tenantId, // Link to tenant
            tenantPath: params.tenantPath,
            status: 'Active',
            createdAt: FieldValue.serverTimestamp(),
            // Store role in DB too for easy querying without decoding tokens
            role: normalizedRole 
        });

        console.log(`[Server Action] User created successfully: ${userRecord.uid}`);
        return { success: true, userId: userRecord.uid };

    } catch (error: any) {
        console.error("[Server Action] Error creating user:", error);
        
        // Handle "Email already exists" gracefully
        if (error.code === 'auth/email-already-exists') {
            // Option: Try to find the user and link them? 
            // For now, return specific error
            return { success: false, error: "A user with this email already exists." };
        }

        return { success: false, error: error.message };
    }
}
