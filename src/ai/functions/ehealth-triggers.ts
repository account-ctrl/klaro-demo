import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized only once
if (!getApps().length) {
    admin.initializeApp();
}

const db = admin.firestore();

// -------------------------------------------------------------------------
// Feature 1: Calculate Child Nutritional Status (MCH)
// Trigger: When a new height/weight is added to a child's record
// NOTE: This function is intended to be deployed to Firebase Cloud Functions.
// -------------------------------------------------------------------------
export const calculateChildNutritionalStatus = functions.firestore
  .document('barangays/{barangayId}/mch_records/{mchId}/growth_measurements/{measureId}')
  .onWrite(async (change, context) => {
    const newData = change.after.exists ? change.after.data() : null;
    if (!newData) return null; // Handle deletions

    const { weight, height } = newData; // weight in kg, height in cm

    if (!weight || !height || height === 0) return null; // Prevent division by zero

    // BMI Calculation
    const heightInMeters = height / 100;
    const bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));

    // Status Logic (Simplified WHO Standard)
    let status = 'Normal';
    if (bmi < 16) status = 'Severely Wasted';
    else if (bmi < 18.5) status = 'Underweight';
    else if (bmi > 25) status = 'Overweight';

    // 1. Update the measurement doc itself with the result
    await change.after.ref.update({
      computedBMI: bmi,
      status: status
    });

    // 2. Update Parent Record Summary (For fast dashboard access)
    return db.collection('barangays').doc(context.params.barangayId)
      .collection('mch_records').doc(context.params.mchId).update({
        latestNutritionalStatus: status,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
  });

// -------------------------------------------------------------------------
// Feature 2: Disease Surveillance (Outbreak Monitor)
// Trigger: When a new epidemiology case is logged
// -------------------------------------------------------------------------
export const monitorDiseaseOutbreak = functions.firestore
  .document('barangays/{barangayId}/epidemiology_cases/{caseId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    if (!data) return;

    const { diseaseName, purok, diagnosisDate } = data;
    const barangayRef = db.collection('barangays').doc(context.params.barangayId);

    // Window: Cases in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Query: Count similar cases in the same area
    // NOTE: This query requires a Firestore Composite Index on [diseaseName, purok, diagnosisDate]
    const casesQuery = await barangayRef.collection('epidemiology_cases')
      .where('diseaseName', '==', diseaseName)
      .where('purok', '==', purok)
      .where('diagnosisDate', '>=', sevenDaysAgo)
      .get();

    const OUTBREAK_THRESHOLD = 3;

    // Create Alert if Threshold Breached
    if (casesQuery.size >= OUTBREAK_THRESHOLD) {
      // Prevent duplicate active alerts
      // NOTE: This query might require an index on [category, description, status]
      const existingAlert = await barangayRef.collection('emergency_alerts')
        .where('category', '==', 'Health') // Assuming consistent category
        .where('description', '==', `OUTBREAK_WARNING: ${diseaseName} in ${purok}`)
        .where('status', 'in', ['New', 'Acknowledged'])
        .get();

      if (existingAlert.empty) {
        await barangayRef.collection('emergency_alerts').add({
          type: 'OUTBREAK_WARNING',
          category: 'Health',
          status: 'New',
          severity: 'High',
          residentName: 'SYSTEM ALERT', // System generated
          residentId: 'system',
          description: `OUTBREAK_WARNING: ${diseaseName} in ${purok}`,
          message: `Warning: ${casesQuery.size} active cases of ${diseaseName} detected in ${purok} within the last 7 days.`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          latitude: 0, // Placeholder or centroid of purok
          longitude: 0
        });
      }
    }
  });

// -------------------------------------------------------------------------
// Feature 4: Smart Inventory Sync (Backwards Compatibility)
// Trigger: When a batch is added, updated, or deleted
// -------------------------------------------------------------------------
export const syncInventoryTotal = functions.firestore
  .document('barangays/{barangayId}/ehealth_inventory_items/{itemId}/stock_batches/{batchId}')
  .onWrite(async (change, context) => {
    const itemId = context.params.itemId;
    const itemRef = db.collection('barangays').doc(context.params.barangayId)
                      .collection('ehealth_inventory_items').doc(itemId);

    // Recalculate total from ALL valid batches
    const batchesSnapshot = await itemRef.collection('stock_batches').get();

    let totalQuantity = 0;
    
    batchesSnapshot.forEach(doc => {
      const batchData = doc.data();
      // Only sum Active batches
      if (batchData.status === 'Active') {
          const qty = parseInt(batchData.quantityInBatch || batchData.quantity || '0');
          if (!isNaN(qty)) {
              totalQuantity += qty;
          }
      }
    });

    // Update the PARENT 'totalStock' field
    // This ensures the OLD dashboard widgets still show the correct number
    return itemRef.update({
      totalStock: totalQuantity,
      lastInventorySync: admin.firestore.FieldValue.serverTimestamp()
    });
  });
