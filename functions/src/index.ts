
import * as admin from "firebase-admin";
import * as vision from "@google-cloud/vision";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import axios from "axios";

// Initialize Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const client = new vision.ImageAnnotatorClient();

// --- MODULE 1.1: REAL-TIME WEATHER INTEGRATION ---
// Fetches weather data every 30 minutes for the LGU center
export const fetchCurrentWeather = onSchedule("every 30 minutes", async (event) => {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    const LAT = 6.1135; // Default LGU Lat (General Santos City example)
    const LON = 125.1719; // Default LGU Lon
    
    if (!API_KEY) {
        console.error("OpenWeather API Key missing in environment variables.");
        return;
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric`;
        const response = await axios.get(url);
        const data = response.data;

        const weatherDoc = {
            temp: data.main.temp,
            feels_like: data.main.feels_like,
            humidity: data.main.humidity,
            wind_speed: data.wind.speed,
            condition: data.weather[0].main,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            last_updated: admin.firestore.FieldValue.serverTimestamp(),
            station_name: data.name
        };

        await db.collection("system_integrations").doc("weather_current").set(weatherDoc);
        console.log("Weather updated successfully:", weatherDoc.condition);
    } catch (error) {
        console.error("Error fetching weather:", error);
    }
});

// --- MODULE 1.2: ALERT CLEANUP TRIGGER ---
// Automatically archives resolved alerts older than 24 hours
export const cleanupOldAlerts = onSchedule("every 24 hours", async (event) => {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const snapshot = await db.collectionGroup("emergency_alerts")
        .where("status", "in", ["Resolved", "False Alarm"])
        .where("timestamp", "<", yesterday)
        .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} old alerts.`);
});

// --- IDENTITY VERIFICATION (EXISTING) ---
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

export const verifyResidentIdentity = onCall({ cors: true, region: "us-central1" }, async (request) => {
  // 1. Security Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { uid, tenantId, birthDate, mothersMaidenName, location, idImage, selfieImage } = request.data as VerifyData;

  try {
    const buffer = Buffer.from(idImage.split(',')[1], 'base64');
    const [result] = await client.textDetection(buffer);
    const detections = result.textAnnotations;
    const ocrText = detections ? detections[0].description?.toLowerCase() : "";

    const [faceResult] = await client.faceDetection(buffer);
    const hasFace = faceResult.faceAnnotations && faceResult.faceAnnotations.length > 0;
    
    const residentsRef = db.collection(`tenants/${tenantId}/resident_records`);
    const q = residentsRef.where('birthDate', '==', birthDate); 
    const snapshot = await q.get();

    let matchScore = 0;
    let matchedResidentId = null;

    if (snapshot.empty) {
        await logAttempt(uid, tenantId, 'failed', 'DOB_MISMATCH');
        return { status: 'failed', reason: 'No record found with this birth date.' };
    }

    for (const doc of snapshot.docs) {
        const resident = doc.data();
        const dbMMN = resident.mothersMaidenName?.toLowerCase() || "";
        const inputMMN = mothersMaidenName.toLowerCase();
        const nameParts = (resident.firstName + " " + resident.lastName).toLowerCase().split(" ");
        const nameMatchCount = nameParts.filter(part => ocrText?.includes(part)).length;
        const nameMatchRatio = nameMatchCount / nameParts.length;

        if (dbMMN === inputMMN && nameMatchRatio > 0.5) {
            matchScore = 100;
            matchedResidentId = doc.id;
            break;
        }
    }

    if (matchScore === 100 && hasFace) {
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
        
        await db.doc(`tenants/${tenantId}/resident_records/${matchedResidentId}`).update({
            linkedUserId: uid,
            status: 'active'
        });

        return { status: 'verified' };

    } else {
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
    throw new HttpsError('internal', 'Verification process failed.');
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
