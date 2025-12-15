
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Configuration
const CONFIG = {
  // Use the path provided in the user request or a default one if needed.
  // The user requested "a specific Firestore 'add document' script" and mentioned testing the "Active Alerts" widget.
  // Assuming a generic path or one that matches the likely structure.
  // The user prompt implies they might paste JSON into the console, but also asked for a script.
  // I will use a placeholder tenant path which can be easily swapped.
  TENANT_PATH: 'provinces/south-cotabato/cities/polomolok/barangays/poblacion', 
  COLLECTION_NAME: 'emergency_alerts',
  ALERT_DATA: {
    latitude: 6.2230,
    longitude: 125.0650,
    status: 'New', // Matching the 'New' status from types.ts (User asked for 'active', 'open', 'pending' but 'New' is the enum value in types.ts)
                   // However, the user prompt specifically asked for 'active', 'open', or 'pending'. 
                   // Looking at types.ts: status: 'New' | 'Acknowledged' | 'Dispatched' | 'On Scene' | 'Resolved' | 'False Alarm';
                   // 'New' is the closest to 'active'/'open' for a fresh alert.
    type: 'SOS',   // type in user request, category in types.ts? 
                   // types.ts has 'category?: "Medical" | "Fire" | "Crime" | "Accident" | "Unspecified"'.
                   // It doesn't have 'SOS'. I should probably stick to what the user asked for in the script 
                   // but be aware of the schema. The user said "Type: 'SOS' or 'Panic Button'".
                   // I will use 'Medical' as a fallback category or add a custom field if the schema allows flexible fields,
                   // but likely the frontend filters by status.
                   // Wait, the simulateEmergency function in src/lib/trigger-simulation.ts uses `type: 'Medical'`.
                   // Let's use 'SOS' as the message or description if category is restricted.
                   // Actually, I'll follow the user's explicit request for the JSON payload, 
                   // but for the script, I should try to align with the codebase types if I can, 
                   // OR just force the user's values if they are testing a specific widget that might expect them.
                   // The user said: "The data must meet these criteria... Type: 'SOS' or 'Panic Button'".
                   // I will use 'SOS' for the type field as requested.
    residentId: 'res-12345',
    residentName: 'Juan Dela Cruz',
    contactNumber: '09171234567',
  }
};

async function simulateSOS() {
  const { firestore } = initializeFirebase();
  
  const alertData = {
    alertId: `sim-${Date.now()}`,
    residentId: CONFIG.ALERT_DATA.residentId,
    residentName: CONFIG.ALERT_DATA.residentName,
    latitude: CONFIG.ALERT_DATA.latitude,
    longitude: CONFIG.ALERT_DATA.longitude,
    status: CONFIG.ALERT_DATA.status, // 'New'
    timestamp: serverTimestamp(),
    category: 'Unspecified', // Mapping 'SOS' to a valid category or keeping it if the schema is loose.
                             // But the user insisted on Type: SOS.
                             // Let's look at the `simulateEmergency` function in `src/lib/trigger-simulation.ts` again.
                             // It uses `type: 'Medical'`.
                             // I'll add a `type` field with 'SOS' to satisfy the user, and `category` to satisfy the schema.
    type: CONFIG.ALERT_DATA.type,
    message: 'SOS Alert triggered via simulation script',
    contactNumber: CONFIG.ALERT_DATA.contactNumber,
  };

  try {
    const alertsRef = collection(firestore, `${CONFIG.TENANT_PATH}/${CONFIG.COLLECTION_NAME}`);
    const docRef = await addDoc(alertsRef, alertData);
    console.log(`Successfully added SOS alert with ID: ${docRef.id}`);
    console.log(`Path: ${CONFIG.TENANT_PATH}/${CONFIG.COLLECTION_NAME}`);
    console.log('Data:', alertData);
  } catch (error) {
    console.error("Error adding document:", error);
  }
}

// simulateSOS(); // Uncomment to run directly if using a runner that supports top-level await or similar
