
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : undefined;

// Only initialize if we have credentials or we are in a cloud environment that provides default credentials
// In this dev environment without a service account, some functions might fail if called.
if (!getApps().length) {
    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    } else {
        // Fallback or warning - in production App Hosting this works automatically with default creds
        // In local dev without keys, this might be partial.
        try {
            initializeApp();
        } catch (e) {
            console.warn("Firebase Admin failed to initialize. Check service account credentials.");
        }
    }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
