
import { getFirestore, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export async function updateSystemStats(updates: { population?: number, households?: number }) {
    // Ensure Firebase is initialized
    initializeFirebase();
    const firestore = getFirestore();
    const statsRef = doc(firestore, 'system', 'stats');
    
    try {
        await updateDoc(statsRef, {
            totalPopulation: increment(updates.population || 0),
            totalHouseholds: increment(updates.households || 0),
            // lastUpdated: serverTimestamp() // Optional
        });
        console.log("Global stats updated via Client Simulation");
    } catch (e: any) {
        // If doc doesn't exist or we can't update, try creating it (safe fallback for this demo environment)
        // In real production, this would be handled by Cloud Functions with admin privs.
        if (e.code === 'not-found' || e.code === 'permission-denied') {
             console.warn("Could not update global stats (might be permission issue or doc missing). Attempting set...");
             try {
                 await setDoc(statsRef, {
                    totalPopulation: Math.max(0, updates.population || 0),
                    totalHouseholds: Math.max(0, updates.households || 0),
                    activeTenants: 1 // Default if creating from scratch here
                }, { merge: true });
             } catch (createErr) {
                 console.error("Failed to create system stats fallback:", createErr);
             }
        } else {
            console.error("Failed to update system stats:", e);
        }
    }
}
