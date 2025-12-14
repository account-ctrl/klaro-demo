
import { doc, runTransaction } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

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

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { EmergencyAlert } from '@/lib/types';

export const simulateEmergency = async () => {
  const { firestore, auth } = initializeFirebase();
  const tenantId = 'barangay-hall'; // Hardcoded for demo
  
  // Random coordinates near a central point (approx. Philippines town center)
  // Base: 14.5995, 120.9842 (Manila)
  const baseLat = 14.5995;
  const baseLng = 120.9842;
  const latOffset = (Math.random() - 0.5) * 0.01;
  const lngOffset = (Math.random() - 0.5) * 0.01;

  const alertData: Omit<EmergencyAlert, 'id' | 'alertId'> & { alertId: string } = {
    alertId: `sim-${Date.now()}`,
    residentId: `res-${Math.floor(Math.random() * 1000)}`,
    residentName: `Resident ${Math.floor(Math.random() * 1000)}`,
    latitude: baseLat + latOffset,
    longitude: baseLng + lngOffset,
    status: 'New',
    timestamp: serverTimestamp() as any, // Cast for client-side timestamp
    type: 'Medical', // or Fire, Crime, etc.
    message: 'This is a simulated emergency alert.',
    contactNumber: '09123456789',
  };

  try {
    const alertsRef = collection(firestore, `tenants/${tenantId}/emergency_alerts`);
    await addDoc(alertsRef, alertData);
    console.log("Simulated emergency alert created");
    return true;
  } catch (error) {
    console.error("Error simulating emergency:", error);
    return false;
  }
};
