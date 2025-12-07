
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// --- Configuration ---
// Try to get credentials from env var, otherwise rely on ADC
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        if (serviceAccountKey) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(serviceAccountKey))
            });
            console.log("🔥 Firebase Admin Initialized (Service Account)");
        } else {
             // Fallback for environment variables (GOOGLE_APPLICATION_CREDENTIALS) or Cloud Shell
            console.warn("⚠️ No FIREBASE_SERVICE_ACCOUNT_KEY found. Attempting to use Default Credentials...");
            admin.initializeApp();
            console.log("🔥 Firebase Admin Initialized (ADC)");
        }
    } catch (error) {
        console.error("❌ Failed to initialize Firebase Admin:", error);
        process.exit(1);
    }
}

const db = admin.firestore();

// --- Helpers ---
function slugify(text: string): string {
    return text.toLowerCase().replace(/[\s\.]+/g, '-').replace(/[^\w-]+/g, '');
}

// --- Data to Seed ---
const SEED_DATA = [
    {
        name: "Cavite",
        region: "Region IV-A",
        cities: ["Bacoor City", "Imus City", "Dasmarinas City", "General Trias"]
    },
    {
        name: "Cebu",
        region: "Region VII",
        cities: ["Cebu City", "Mandaue City", "Lapu-Lapu City"]
    },
    {
        name: "Metro Manila",
        region: "NCR",
        cities: ["Makati City", "Taguig City", "Quezon City", "Manila"]
    }
];

async function seedRecovery() {
    console.log("\n🚀 Starting Recovery Seed...\n");

    try {
        // 1. Restore System Config
        const systemRef = db.collection('system').doc('config');
        await systemRef.set({
            allowSignups: true,
            maintenanceMode: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log("✅ System Config Verified (allowSignups: true)");

        // 2. Restore Geography
        const batch = db.batch();
        let operationCount = 0;

        for (const province of SEED_DATA) {
            const provinceSlug = slugify(province.name);
            const provinceRef = db.collection('provinces').doc(provinceSlug);

            // Set Province Meta
            batch.set(provinceRef, {
                name: province.name,
                region: province.region,
                slug: provinceSlug,
                type: 'province',
                active: true
            }, { merge: true });

            console.log(`   📍 Prepared Province: ${province.name} (${provinceSlug})`);
            operationCount++;

            // Create Cities Sub-collection
            for (const city of province.cities) {
                const citySlug = slugify(city);
                const cityRef = provinceRef.collection('cities').doc(citySlug);

                batch.set(cityRef, {
                    name: city,
                    province: province.name,
                    slug: citySlug,
                    type: 'city',
                    active: true
                }, { merge: true });

                operationCount++;
            }
        }

        // Commit Batch
        if (operationCount > 0) {
            await batch.commit();
            console.log(`\n✅ Successfully wrote ${operationCount} documents to Firestore.`);
        } else {
            console.log("\nℹ️ No changes needed.");
        }

        console.log("\n🎉 Recovery Complete! The 'Logical Vault' structure is back.");
        console.log("👉 You can now run the Onboarding API or Provisioning flow.");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Recovery Failed:", error);
        process.exit(1);
    }
}

seedRecovery();
