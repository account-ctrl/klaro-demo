
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; // Adjust path as needed
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize Vision Client
// Ensure GOOGLE_APPLICATION_CREDENTIALS is set in env or default auth works
const client = new ImageAnnotatorClient();

export async function POST(req: Request) {
  try {
    // 1. Auth Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const body = await req.json();
    const { tenantId, birthDate, mothersMaidenName, location, idImage, selfieImage } = body;

    // 2. OCR Extraction (Google Vision API)
    // Strip header if present (data:image/jpeg;base64,)
    const base64Image = idImage.includes(',') ? idImage.split(',')[1] : idImage;
    const buffer = Buffer.from(base64Image, 'base64');
    
    const [result] = await client.textDetection(buffer);
    const detections = result.textAnnotations;
    const ocrText = detections && detections.length > 0 ? detections[0].description?.toLowerCase() : "";

    // 3. Face Detection
    const [faceResult] = await client.faceDetection(buffer);
    const hasFace = faceResult.faceAnnotations && faceResult.faceAnnotations.length > 0;

    // 4. Data Validation (The 3-Point Match)
    // Query Master List
    const residentsRef = adminDb.collection(`tenants/${tenantId}/resident_records`);
    const q = residentsRef.where('birthDate', '==', birthDate); 
    const snapshot = await q.get();

    let matchScore = 0;
    let matchedResidentId = null;

    if (snapshot.empty) {
        // No DOB match
        await logAttempt(uid, tenantId, 'failed', 'DOB_MISMATCH');
        return NextResponse.json({ status: 'failed', reason: 'No record found with this birth date.' });
    }

    // Iterate through potential DOB matches
    for (const doc of snapshot.docs) {
        const resident = doc.data();
        
        // MMN Check (Loose)
        const dbMMN = resident.mothersMaidenName?.toLowerCase() || "";
        const inputMMN = mothersMaidenName.toLowerCase();
        
        // Name Check (OCR vs DB)
        const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase();
        const nameParts = fullName.split(" ");
        // Count how many parts of the name appear in the OCR text
        const nameMatchCount = nameParts.filter((part: string) => ocrText?.includes(part)).length;
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
        await adminAuth.setCustomUserClaims(uid, {
            tenantId: tenantId,
            role: 'resident',
            kycStatus: 'verified'
        });

        await adminDb.collection('users').doc(uid).update({
            kycStatus: 'verified',
            tenantId: tenantId,
            residentRecordId: matchedResidentId,
            verifiedAt: FieldValue.serverTimestamp()
        });
        
        // Link User to Resident Record
        if (matchedResidentId) {
            await adminDb.doc(`tenants/${tenantId}/resident_records/${matchedResidentId}`).update({
                linkedUserId: uid,
                status: 'active'
            });
        }

        return NextResponse.json({ status: 'verified' });

    } else {
        // MANUAL REVIEW
        await adminDb.collection(`tenants/${tenantId}/verification_requests`).add({
            userId: uid,
            status: 'pending_review',
            submittedAt: FieldValue.serverTimestamp(),
            data: {
                ocrText,
                inputMMN: mothersMaidenName,
                inputDOB: birthDate,
                distance: location.distance,
                matchScore
            }
        });

        await adminDb.collection('users').doc(uid).update({
            kycStatus: 'manual_review',
            tenantId: tenantId
        });

        return NextResponse.json({ status: 'manual_review' });
    }

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message || 'Verification process failed.' }, { status: 500 });
  }
}

async function logAttempt(uid: string, tenantId: string, status: string, reason: string) {
    try {
        await adminDb.collection('system_logs').add({
            type: 'identity_verification',
            uid,
            tenantId,
            status,
            reason,
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log attempt", e);
    }
}
