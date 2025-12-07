
import { getFirestore, doc, runTransaction } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export async function updateSystemStats(updates: { population?: number, households?: number }) {
    // Ensure Firebase is initialized
    initializeFirebase();
    const firestore = getFirestore();
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
