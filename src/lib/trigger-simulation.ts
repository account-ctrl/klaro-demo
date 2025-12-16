
import { doc, runTransaction } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { EmergencyAlert } from '@/lib/types';
import { getAuth } from 'firebase/auth';
import { captureAccurateLocation } from '@/lib/services/location';

export async function updateSystemStats(updates: { population?: number, households?: number }) {
    // Ensure Firebase is initialized and get the same instance used elsewhere
    const { firestore } = initializeFirebase();
    
    // const firestore = getFirestore(); // <-- Causing instance mismatch issues if multiple apps/contexts exist
    const statsRef = doc(firestore, 'system', 'stats');
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const statsDoc = await transaction.get(statsRef);
            
            if (!statsDoc.exists()) {
                // Initialize if missing (Fallback)
                transaction.set(statsRef, {
                    totalPopulation: Math.max(0, updates.population || 0),
                    totalHouseholds: Math.max(0, updates.households || 0),
                    activeTenants: 0, // Assume 0 active if we are creating stats from a resident add/delete action, or 1? Safest is 0 and let provisioning handle tenant count.
                    lastUpdated: new Date()
                });
                return;
            }

            const currentData = statsDoc.data();
            const currentPop = currentData.totalPopulation || 0;
            const currentHH = currentData.totalHouseholds || 0;

            const newPop = currentPop + (updates.population || 0);
            const newHH = currentHH + (updates.households || 0);

            transaction.update(statsRef, {
                totalPopulation: Math.max(0, newPop),
                totalHouseholds: Math.max(0, newHH),
                lastUpdated: new Date()
            });
        });
        console.log("Global stats updated safely via Client Simulation");
    } catch (e) {
        console.error("Failed to update system stats:", e);
    }
}

export const simulateEmergency = async (tenantPath: string, location?: { lat: number; lng: number }) => {
  if (!tenantPath) {
    console.error("Cannot simulate emergency: No tenant path provided.");
    return { success: false, error: "No Tenant Path" };
  }
  
  const { firestore } = initializeFirebase();
  const auth = getAuth();
  const user = auth.currentUser;

  // 1. Try to get Real Location first
  let finalLat = 0;
  let finalLng = 0;
  let locationSource = 'SIMULATION';
  let accuracy = 0;

  // If explicit location passed (e.g. from map click), use it
  if (location) {
      finalLat = location.lat;
      finalLng = location.lng;
      locationSource = 'ADMIN_SELECTED';
  } else {
      // Otherwise, try to capture real device GPS
      try {
          // Increase timeout to ensure we get a fix if possible
          const gpsData = await captureAccurateLocation({ timeoutMs: 10000, maxWaitMs: 12000 });
          
          if (gpsData.lat !== 0 && gpsData.lng !== 0) {
              finalLat = gpsData.lat;
              finalLng = gpsData.lng;
              locationSource = gpsData.location_source === 'UNAVAILABLE' ? 'SIMULATION' : gpsData.location_source;
              accuracy = gpsData.accuracy_m;
              console.log("Simulation used Real GPS:", gpsData);
          } else {
              console.warn("Simulation failed to get GPS (returned 0,0), falling back.");
          }
      } catch (e) {
          console.warn("Simulation failed to get GPS with error:", e);
      }
  }

  // 2. Fallback to Polomolok ONLY if no valid location found
  if (finalLat === 0 && finalLng === 0) {
      console.log("Using Fallback Mock Coordinates (Polomolok)");
      const baseLat = 6.2230; 
      const baseLng = 125.0650;
      const latOffset = (Math.random() - 0.5) * 0.002; 
      const lngOffset = (Math.random() - 0.5) * 0.002;
      
      finalLat = baseLat + latOffset;
      finalLng = baseLng + lngOffset;
      locationSource = 'MOCK_FALLBACK';
  }

  const alertData: Omit<EmergencyAlert, 'id' | 'alertId'> & { alertId: string } = {
    alertId: `sim-${Date.now()}`,
    residentId: user ? user.uid : `res-${Math.floor(Math.random() * 1000)}`,
    residentName: user?.displayName || `Resident ${Math.floor(Math.random() * 1000)}`,
    latitude: finalLat,
    longitude: finalLng,
    status: 'New',
    timestamp: serverTimestamp() as any, // Cast for client-side timestamp
    type: 'SOS', // Updated to SOS as per user request
    category: 'Unspecified',
    message: 'This is a simulated emergency alert.',
    contactNumber: '09123456789',
    // Add location metadata if type supports it (though strict types might block it, Firestore accepts it)
    location_source: locationSource,
    accuracy_m: accuracy
  } as any;

  try {
    // Construct the path: tenantPath is something like "provinces/cebu/cities/cebu-city/barangays/luz"
    // So we append "/emergency_alerts"
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const alertsRef = collection(firestore, `${safePath}/emergency_alerts`);
    
    await addDoc(alertsRef, alertData);
    console.log(`Simulated emergency alert created at ${safePath}/emergency_alerts with lat: ${finalLat}, lng: ${finalLng} (Source: ${locationSource})`);
    
    return { 
        success: true, 
        source: locationSource,
        lat: finalLat,
        lng: finalLng
    };
  } catch (error: any) {
    console.error("Error simulating emergency:", error);
    return { success: false, error: error.message };
  }
};
