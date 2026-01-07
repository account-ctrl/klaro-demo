
import { runTransaction, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Your firebase config
import { Allotment } from './types';

interface CreateObligationParams {
  barangayId: string;
  allotmentId: string;
  userId: string;
  data: {
    payee: string;
    purpose: string;
    amount: number;
    referenceCode: string;
  }
}

export const createObligation = async ({ 
  barangayId, 
  allotmentId, 
  userId, 
  data 
}: CreateObligationParams) => {
  
  if (!db) throw new Error("Firebase DB not initialized");

  // References
  const allotmentRef = doc(db, `barangays/${barangayId}/allotments/${allotmentId}`);
  const newObligationRef = doc(collection(db, `barangays/${barangayId}/obligations`));
  const newTxRef = doc(collection(db, `barangays/${barangayId}/obligations/${newObligationRef.id}/transactions`));

  try {
    await runTransaction(db, async (transaction) => {
      // 1. READ: Get current Allotment state
      const allotmentDoc = await transaction.get(allotmentRef);
      if (!allotmentDoc.exists()) {
        throw new Error("Allotment bucket does not exist.");
      }

      const allotment = allotmentDoc.data() as Allotment;

      // 2. VALIDATE: Check sufficient funds
      if (allotment.currentBalance < data.amount) {
        throw new Error(`Insufficient Funds. Available: ${allotment.currentBalance}, Requested: ${data.amount}`);
      }

      // 3. WRITE: Deduct from Allotment (Aggregation)
      const newBalance = allotment.currentBalance - data.amount;
      transaction.update(allotmentRef, {
        currentBalance: newBalance,
        lastUpdated: serverTimestamp()
      });

      // 4. WRITE: Create Obligation
      transaction.set(newObligationRef, {
        id: newObligationRef.id,
        allotmentId: allotmentId,
        ...data,
        status: 'Pending',
        createdBy: userId,
        createdAt: serverTimestamp()
      });

      // 5. WRITE: Audit Log
      transaction.set(newTxRef, {
        type: 'Obligation Created',
        amount: data.amount,
        performedBy: userId,
        timestamp: serverTimestamp(),
        notes: `Reserved ${data.amount} for ${data.payee}`
      });
    });

    console.log("Obligation successfully created.");
    return newObligationRef.id;

  } catch (error) {
    console.error("Financial Transaction Failed:", error);
    throw error;
  }
};
