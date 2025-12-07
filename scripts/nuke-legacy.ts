
import * as admin from 'firebase-admin';

// Initialize Admin SDK (if not already initialized in your environment)
// Note: In a local script run via `ts-node`, you usually need service account creds.
// Assuming this is run in an environment where GOOGLE_APPLICATION_CREDENTIALS is set
// or you will initialize it manually. For this script, I'll assume default init.

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'klaro-gov-v2' // Replace with your actual project ID if needed
    });
}

const db = admin.firestore();

async function deleteCollection(collectionPath: string, batchSize: number = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db: admin.firestore.Firestore, query: admin.firestore.Query, resolve: (value?: unknown) => void) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function nukeLegacy() {
    console.log("⚠️  STARTING LEGACY DATA CLEANUP...");
    console.log("-----------------------------------");

    // 1. Delete 'tenants' collection
    console.log("🔥 Deleting legacy 'tenants' collection...");
    await deleteCollection('tenants');
    console.log("✅ 'tenants' deleted.");

    // 2. Delete 'barangays' collection
    console.log("🔥 Deleting legacy 'barangays' collection...");
    await deleteCollection('barangays');
    console.log("✅ 'barangays' deleted.");

    // 3. Delete 'provisioning_requests' collection
    console.log("🔥 Deleting 'provisioning_requests' collection...");
    await deleteCollection('provisioning_requests');
    console.log("✅ 'provisioning_requests' deleted.");

    // 4. Delete stray doc '1' if it exists in root (rare but mentioned)
    // Checking if it's a collection or a doc. Assuming it's a weird collection name from the prompt context.
    // If it is a doc, delete directly. If collection, use helper.
    // Assuming collection '1' based on context "1 (The stray doc)" usually implies a root collection or doc.
    // I'll try to delete it as a document first, then collection.
    
    console.log("🔥 Checking for stray '1'...");
    const strayDoc = db.doc('1');
    const docSnap = await strayDoc.get();
    if (docSnap.exists) {
        await strayDoc.delete();
        console.log("✅ Stray document '1' deleted.");
    } else {
        // Try as collection
        await deleteCollection('1');
        console.log("✅ Stray collection '1' checked/deleted.");
    }

    console.log("-----------------------------------");
    console.log("🛡️  SAFETY CHECK:");
    console.log("   - 'system' collection preserved.");
    console.log("   - 'users' collection preserved.");
    console.log("   - 'tenant_directory' preserved.");
    console.log("   - 'provinces' (The Vault) preserved.");
    console.log("-----------------------------------");
    console.log("🚀 CLEANUP COMPLETE.");
}

nukeLegacy().catch(console.error);
