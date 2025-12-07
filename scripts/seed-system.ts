
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
// Note: Requires GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : undefined;

if (!serviceAccount) {
    console.error("❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedSystem() {
    console.log("🚀 Starting Genesis Seed...");

    try {
        // 1. Create System Config
        const systemRef = db.collection('system').doc('config');
        await systemRef.set({
            maintenanceMode: false,
            allowSignups: true,
            globalBanner: {
                active: false,
                message: "",
                type: "info"
            },
            version: "1.0.0",
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ System Config Created.");

        // 2. Initialize Tenant Directory (Placeholder)
        const dirRef = db.collection('tenant_directory').doc('_readme');
        await dirRef.set({
            description: "Registry of all active tenant vaults.",
            schema: "{ fullPath: string, adminEmail: string, tenantId: string }",
            doNotDelete: true
        });
        console.log("✅ Tenant Directory Initialized.");

        // 3. Initialize Stats Counter
        const statsRef = db.collection('system').doc('stats');
        await statsRef.set({
            totalTenants: 0,
            totalPopulation: 0,
            totalHouseholds: 0,
            activeUsers: 0
        });
        console.log("✅ Global Stats Initialized.");

        console.log("🎉 Database Hydration Complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Seed Failed:", error);
        process.exit(1);
    }
}

seedSystem();
