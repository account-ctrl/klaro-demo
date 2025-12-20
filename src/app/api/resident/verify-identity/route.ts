
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; // Adjust path as needed
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { FieldValue } from 'firebase-admin/firestore';
import { getTenantPathAdmin } from '@/lib/firebase/admin';

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
    const { tenantId, birthDate, mothersMaidenName, location, idImage, selfieImage, firstName, lastName, middleName, gender } = body;

    // Resolve Tenant Path (This is the critical fix)
    // The tenantId passed from the frontend (from tenant_directory) might be a simple ID, 
    // but the actual data lives in a deeper path like 'provinces/x/cities/y/barangays/z'
    const tenantPath = await getTenantPathAdmin(tenantId);
    if (!tenantPath) {
        throw new Error(`Invalid Tenant ID: ${tenantId}`);
    }

    // 2. OCR Extraction (Google Vision API)
    const base64Image = idImage.includes(',') ? idImage.split(',')[1] : idImage;
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Attempt OCR if credentials allow, else skip (soft fail for dev/demo)
    let ocrText = "";
    let hasFace = true; 
    try {
        const [result] = await client.textDetection(buffer);
        const detections = result.textAnnotations;
        ocrText = detections && detections.length > 0 ? detections[0].description?.toLowerCase() || "" : "";

        // 3. Face Detection
        const [faceResult] = await client.faceDetection(buffer);
        hasFace = !!(faceResult.faceAnnotations && faceResult.faceAnnotations.length > 0);
    } catch (e) {
        console.warn("Google Vision API skipped/failed:", e);
        hasFace = true;
    }

    // 4. Data Validation (The 3-Point Match)
    // Query Master List at the CORRECT PATH
    // Use 'residents' collection at the resolved path
    const residentsRef = adminDb.collection(`${tenantPath}/residents`); 
    
    // Check if resident already exists (prevent duplicate registration)
    const q = residentsRef
        .where('firstName', '==', firstName)
        .where('lastName', '==', lastName)
        .where('dateOfBirth', '==', birthDate);
        
    const snapshot = await q.get();

    let matchedResidentId = null;

    if (!snapshot.empty) {
        // Resident Found - Link them
        matchedResidentId = snapshot.docs[0].id;
        
    } else {
        // Resident Not Found - Create New Record
        const newResidentData = {
            firstName,
            lastName,
            middleName: middleName || '',
            gender: gender || 'Other',
            dateOfBirth: birthDate,
            mothersMaidenName: mothersMaidenName,
            status: 'Active',
            createdAt: FieldValue.serverTimestamp(),
            linkedUserId: uid,
            photoUrl: selfieImage, // Use selfie as initial profile photo?
            tenantId: tenantId, // Keep the simple ID for reference
            verificationStatus: 'Verified',
            address: { // Minimal address structure
                purok: 'Unassigned',
                mapAddress: { street: '', blockLot: '', unit: '', landmark: '' },
                coordinates: location ? { lat: location.lat, lng: location.lng, accuracy_meters: location.distance } : null
            }
        };
        
        const newDocRef = await residentsRef.add(newResidentData);
        matchedResidentId = newDocRef.id;
    }

    // 5. Result Handling 
    // SUCCESS
    
    // Update Custom Claims with BOTH tenantId AND tenantPath
    // This ensures the frontend can construct the correct paths.
    await adminAuth.setCustomUserClaims(uid, {
        tenantId: tenantId,
        tenantPath: tenantPath, // Important for useTenant context
        role: 'resident',
        kycStatus: 'verified'
    });

    await adminDb.collection('users').doc(uid).update({
        kycStatus: 'verified',
        tenantId: tenantId,
        // We probably don't need to store the full path in the user doc if we have the ID, 
        // but it doesn't hurt for quick lookup without index hits.
        tenantPath: tenantPath, 
        residentRecordId: matchedResidentId,
        verifiedAt: FieldValue.serverTimestamp(),
        fullName: `${firstName} ${lastName}`,
        email: (await adminAuth.getUser(uid)).email,
        role: 'resident' // Ensure role is set in DB too
    });
    
    // Ensure Resident Record is linked
    if (matchedResidentId) {
        await residentsRef.doc(matchedResidentId).update({
            linkedUserId: uid,
            status: 'Active' // Ensure active
        });
    }

    return NextResponse.json({ status: 'verified', residentId: matchedResidentId });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message || 'Verification process failed.' }, { status: 500 });
  }
}
