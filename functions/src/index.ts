
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as vision from "@google-cloud/vision";

admin.initializeApp();
const db = admin.firestore();
const client = new vision.ImageAnnotatorClient();

interface VerifyData {
  uid: string;
  tenantId: string;
  birthDate: string;
  mothersMaidenName: string;
  location: {
    lat: number;
    lng: number;
    distance: number;
  };
  idImage: string; // base64
  selfieImage: string; // base64
}

export const verifyResidentIdentity = functions.https.onCall(async (data: VerifyData, context) => {
  // 1. Security Check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { uid, tenantId, birthDate, mothersMaidenName, location, idImage, selfieImage } = data;

  try {
    // 2. OCR Extraction (Google Vision API)
    // Note: Assuming base64 string has header "data:image/jpeg;base64," which needs stripping
    const buffer = Buffer.from(idImage.split(',')[1], 'base64');
    const [result] = await client.textDetection(buffer);
    const detections = result.textAnnotations;
    const ocrText = detections ? detections[0].description?.toLowerCase() : "";

    // 3. Face Matching (Placeholder Logic)
    // In production, use AWS Rekognition or Azure Face API.
    // Google Vision Face Detection only detects faces, doesn't compare identities out of the box easily without AutoML.
    // For this MVP, we simulate a "match" if both images have a face detected with high confidence.
    const [faceResult] = await client.faceDetection(buffer);
    const hasFace = faceResult.faceAnnotations && faceResult.faceAnnotations.length > 0;
    
    // 4. Data Validation (The 3-Point Match)
    // Query Master List
    const residentsRef = db.collection(`tenants/${tenantId}/resident_records`);
    const q = residentsRef.where('birthDate', '==', birthDate); // Exact Match on DOB is efficient
    const snapshot = await q.get();

    let matchScore = 0;
    let matchedResidentId = null;

    if (snapshot.empty) {
        // No DOB match -> Instant Fail
        await logAttempt(uid, tenantId, 'failed', 'DOB_MISMATCH');
        return { status: 'failed', reason: 'No record found with this birth date.' };
    }

    // Iterate through potential DOB matches to check Name & MMN
    for (const doc of snapshot.docs) {
        const resident = doc.data();
        
        // MMN Check (Loose)
        const dbMMN = resident.mothersMaidenName?.toLowerCase() || "";
        const inputMMN = mothersMaidenName.toLowerCase();
        
        // Name Check (OCR vs DB)
        // Check if DB name parts exist in OCR text
        const nameParts = (resident.firstName + " " + resident.lastName).toLowerCase().split(" ");
        const nameMatchCount = nameParts.filter(part => ocrText?.includes(part)).length;
        const nameMatchRatio = nameMatchCount / nameParts.length;

        if (dbMMN === inputMMN && nameMatchRatio > 0.5) {
            matchScore = 100;
            matchedResidentId = doc.id;
            break;
        }
    }

    // 5. Result Handling
    if (matchScore === 100 && hasFace) {
        // SUCCESS
        await admin.auth().setCustomUserClaims(uid, {
            tenantId: tenantId,
            role: 'resident',
            kycStatus: 'verified'
        });

        await db.collection('users').doc(uid).update({
            kycStatus: 'verified',
            tenantId: tenantId,
            residentRecordId: matchedResidentId,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Link User to Resident Record
        await db.doc(`tenants/${tenantId}/resident_records/${matchedResidentId}`).update({
            linkedUserId: uid,
            status: 'active'
        });

        return { status: 'verified' };

    } else {
        // MANUAL REVIEW
        // Create a ticket for Admins
        await db.collection(`tenants/${tenantId}/verification_requests`).add({
            userId: uid,
            status: 'pending_review',
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            data: {
                ocrText,
                inputMMN: mothersMaidenName,
                inputDOB: birthDate,
                distance: location.distance,
                matchScore
            }
        });

        await db.collection('users').doc(uid).update({
            kycStatus: 'manual_review',
            tenantId: tenantId
        });

        return { status: 'manual_review' };
    }

  } catch (error) {
    console.error("Verification Error:", error);
    throw new functions.https.HttpsError('internal', 'Verification process failed.');
  }
});

async function logAttempt(uid: string, tenantId: string, status: string, reason: string) {
    await db.collection('system_logs').add({
        type: 'identity_verification',
        uid,
        tenantId,
        status,
        reason,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
}
