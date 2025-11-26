
import axios from 'axios';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already
if (!getApps().length) {
    admin.initializeApp();
}

// Check if we can get Firestore (might fail if not in a server environment)
let db: admin.firestore.Firestore;
try {
  db = admin.firestore();
} catch (e) {
  console.warn("Firestore admin not initialized (this is expected if running on client):", e);
}

interface BoundingBox {
    south: number;
    west: number;
    north: number;
    east: number;
}

interface ScannedStructure {
    lat: number;
    lon: number;
    area?: number; // Estimated area in sqm
    type: string; // 'residential' | 'apartment' | 'commercial' | 'unknown'
    tags: any;
}

/**
 * Helper: Calculate rough area of a bounding box for a way (building)
 * This is a simplification. For precise area, we'd need a geometry library.
 */
const calculateEstimatedArea = (nodes: any[]): number => {
    if (!nodes || nodes.length < 3) return 0;
    // Simple box approximation for filtering
    const lats = nodes.map(n => n.lat);
    const lons = nodes.map(n => n.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    // Rough conversion: 1 deg lat ~ 111km, 1 deg lon ~ 111km * cos(lat)
    const height = (maxLat - minLat) * 111000;
    const width = (maxLon - minLon) * 111000 * Math.cos(minLat * (Math.PI / 180));
    
    return height * width;
};

/**
 * Helper: Calculate Haversine distance between two points in meters
 */
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

/**
 * Cloud Function Logic: Scan Zone for Buildings
 * This is designed to be called via an HTTP Callable Function or Trigger.
 */
export const scanZoneLogic = async (bbox: BoundingBox, barangayId: string) => {
    if (!db) {
        throw new Error("Firebase Admin not initialized. This function must run in a server environment.");
    }

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    // Overpass QL: Get ways with [building] tag in bbox, recursively get nodes (>) to calculate center
    const query = `
        [out:json][timeout:25];
        (
          way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        );
        out center;
    `;

    try {
        const response = await axios.post(overpassUrl, `data=${encodeURIComponent(query)}`);
        const elements = response.data.elements;
        
        const newStructures: ScannedStructure[] = [];

        // 1. Parse Overpass Results
        for (const el of elements) {
            if (el.type === 'way' && el.center) {
                const structure: ScannedStructure = {
                    lat: el.center.lat,
                    lon: el.center.lon,
                    tags: el.tags,
                    type: 'unknown'
                };

                // Basic Classification
                if (el.tags.building === 'apartments' || el.tags.building === 'dormitory') {
                    structure.type = 'apartment';
                } else if (el.tags.building === 'house' || el.tags.building === 'residential' || el.tags.building === 'yes') {
                    structure.type = 'residential';
                } else {
                    structure.type = 'commercial'; // Simplified default for non-residential tags
                }

                newStructures.push(structure);
            }
        }

        // 2. Filter & Deduplicate against Existing Database
        // Note: Fetching all households might be heavy. 
        // Optimization: Only fetch households within the approximate BBOX from Firestore if using GeoQueries (GeoFire).
        // For now, we fetch households in the barangay and filter in memory (assuming < 10k households).
        
        const householdsRef = db.collection(`barangays/${barangayId}/households`);
        const snapshot = await householdsRef.get();
        
        const validNewHouseholds = [];

        for (const newStruct of newStructures) {
            let isDuplicate = false;

            // Safety Guardrail: Check 2-meter radius against existing DB
            // (In a real scalable app, use Firestore GeoPoints and query limits)
            for (const doc of snapshot.docs) {
                const data = doc.data();
                if (data.latitude && data.longitude) {
                    const dist = getDistanceInMeters(newStruct.lat, newStruct.lon, data.latitude, data.longitude);
                    if (dist < 2) { // 2 meters tolerance
                        isDuplicate = true;
                        break;
                    }
                }
            }

            if (!isDuplicate) {
                validNewHouseholds.push({
                    householdId: `scanned_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    name: `Unverified Structure (${newStruct.type})`,
                    householdNumber: 'TBD',
                    purokId: 'Unknown', // Needs manual assignment later
                    household_head_id: '',
                    address: `Lat: ${newStruct.lat.toFixed(5)}, Lon: ${newStruct.lon.toFixed(5)}`,
                    latitude: newStruct.lat,
                    longitude: newStruct.lon,
                    housing_material: 'Unknown',
                    status: 'Unverified', // Flag for review
                    scannedAt: admin.firestore.Timestamp.now(),
                    isMultiDwellingPotential: newStruct.type === 'apartment'
                });
            }
        }

        // 3. Batch Write (Limit to 500 per batch)
        if (validNewHouseholds.length > 0) {
            const batch = db.batch();
            validNewHouseholds.slice(0, 450).forEach(hh => {
                const docRef = householdsRef.doc(hh.householdId);
                batch.set(docRef, hh);
            });
            await batch.commit();
        }

        return {
            success: true,
            scannedCount: newStructures.length,
            newAdded: validNewHouseholds.length,
            duplicatesSkipped: newStructures.length - validNewHouseholds.length
        };

    } catch (error: any) {
        console.error("Overpass Scan Error:", error);
        // Using standard Error if functions.https.HttpsError is not available in this context, 
        // but since we imported it, we can try to use it or fallback.
        throw new Error('Failed to scan area: ' + error.message);
    }
};
