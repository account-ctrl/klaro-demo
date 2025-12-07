'use server'
import { adminDb } from '@/lib/firebase-admin';

export type Plan = {
    id?: string;
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
    features: {
        maxStorageGB: number;
        canAccessAI: boolean;
        canPrintOfficialSeal: boolean;
    };
    description?: string;
    active: boolean;
}

export async function createPlan(data: Plan) {
    // Basic validation
    if (!data.name || data.price < 0) {
        throw new Error("Invalid plan data");
    }

    const docRef = await adminDb.collection('system_plans').add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
}

export async function updatePlan(id: string, data: Partial<Plan>) {
    await adminDb.collection('system_plans').doc(id).update({
        ...data,
        updatedAt: new Date()
    });
    return { success: true };
}

export async function deletePlan(id: string) {
    // Soft delete usually, but for now hard delete or set active=false
    await adminDb.collection('system_plans').doc(id).update({
        active: false,
        updatedAt: new Date()
    });
    return { success: true };
}

export async function getPlans() {
    try {
        const snap = await adminDb.collection('system_plans').where('active', '==', true).get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Plan[];
    } catch (e) {
        console.error("Failed to fetch plans:", e);
        return [];
    }
}
