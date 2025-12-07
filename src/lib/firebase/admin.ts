
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : undefined;

// Only initialize if we have credentials or we are in a cloud environment that provides default credentials
if (!getApps().length) {
    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount),
            projectId: firebaseConfig.projectId
        });
    } else {
        try {
            initializeApp({
                projectId: firebaseConfig.projectId
            });
        } catch (e) {
            console.warn("Firebase Admin failed to initialize. Check service account credentials.");
        }
    }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
