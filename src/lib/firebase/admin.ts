
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage'; // Added Storage
import { firebaseConfig } from '@/firebase/config';

// 1. Initialize the Admin App
if (!getApps().length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
        : undefined;

    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount),
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket // Ensure bucket is linked
        });
    } else {
        initializeApp({
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket
        });
    }
}

// 2. Export Admin Services
export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage(); // Export Storage
