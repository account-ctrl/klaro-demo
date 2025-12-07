
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

// 1. Initialize the Admin App
// We check if an app is already initialized to avoid "app already exists" errors in hot-reload environments.
if (!getApps().length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
        : undefined;

    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount),
            projectId: firebaseConfig.projectId,
        });
    } else {
        // Fallback for environments with ADC (Application Default Credentials) like Cloud Run/Functions
        initializeApp({
            projectId: firebaseConfig.projectId,
        });
    }
}

// 2. Export Admin Services
export const adminAuth = getAuth();
export const adminDb = getFirestore();
