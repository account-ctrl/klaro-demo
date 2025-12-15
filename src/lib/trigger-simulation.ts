
import { doc, runTransaction } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { EmergencyAlert } from '@/lib/types';
import { getAuth } from 'firebase/auth';

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
    return false;
  }
  
  const { firestore } = initializeFirebase();
  const auth = getAuth();
  const user = auth.currentUser;

  // Default to Polomolok, South Cotabato (Client's test area) if no location provided
  // Fallback to Manila if strictly needed, but client requested Polomolok.
  const baseLat = 6.2230; 
  const baseLng = 125.0650;
  
  // Small random offset to prevent exact overlapping of multiple simulations
  const latOffset = (Math.random() - 0.5) * 0.002; // Approx 200m variance
  const lngOffset = (Math.random() - 0.5) * 0.002;

  const finalLat = location ? location.lat : baseLat + latOffset;
  const finalLng = location ? location.lng : baseLng + lngOffset;

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
  };

  try {
    // Construct the path: tenantPath is something like "provinces/cebu/cities/cebu-city/barangays/luz"
    // So we append "/emergency_alerts"
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const alertsRef = collection(firestore, `${safePath}/emergency_alerts`);
    
    await addDoc(alertsRef, alertData);
    console.log(`Simulated emergency alert created at ${safePath}/emergency_alerts with lat: ${finalLat}, lng: ${finalLng}`);
    return true;
  } catch (error) {
    console.error("Error simulating emergency:", error);
    return false;
  }
};
