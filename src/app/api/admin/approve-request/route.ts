
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; 
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    // ... (Auth checks remain the same)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // ... (Token Verification omitted for brevity but assumed present)

    const { requestId, action, rejectionReason } = await req.json();

    const requestRef = adminDb.collection('barangays').doc(requestId);
    const statsRef = adminDb.collection('system').doc('stats');

    // Transactional Logic
    await adminDb.runTransaction(async (t) => {
        const requestSnap = await t.get(requestRef);
        if (!requestSnap.exists) {
            throw new Error('Request not found');
        }
        const data = requestSnap.data();

        // SCENARIO A: DELETE
        if (action === 'delete') {
            const wasLive = data?.status === 'Live';
            const population = data?.population || 0;
            const households = data?.households || 0;

            t.delete(requestRef);

            if (wasLive) {
                // Read stats first to prevent negative
                const statsSnap = await t.get(statsRef);
                const statsData = statsSnap.data() || { activeTenants: 0, totalPopulation: 0, totalHouseholds: 0 };
                
                const newActive = Math.max(0, (statsData.activeTenants || 0) - 1);
                const newPop = Math.max(0, (statsData.totalPopulation || 0) - population);
                const newHH = Math.max(0, (statsData.totalHouseholds || 0) - households);

                t.set(statsRef, {
                    activeTenants: newActive,
                    totalPopulation: newPop,
                    totalHouseholds: newHH
                }, { merge: true });
            }
        }
        
        // SCENARIO C: APPROVE
        if (action === 'approve') {
            if (data?.status === 'Live') return; // Idempotency

            t.update(requestRef, {
                status: 'Live',
                provisionedAt: Timestamp.now(),
                lastActivity: Timestamp.now(),
            });
            
            const population = data?.population || 0;
            const households = data?.households || 0;

            // Increment normally, but ensuring base exists is handled by set merge
            // We use increment here because concurrency is high for approvals? 
            // Actually, to be safe against "Reset to 0" bugs, read-modify-write is safer if volume is low.
            // But increment is atomic. The issue with negative is primarily decrementing.
            
            // Let's rely on increment for ADDING, but logic above for SUBTRACTING.
            t.set(statsRef, {
                 totalPopulation: FieldValue.increment(population),
                 totalHouseholds: FieldValue.increment(households),
                 activeTenants: FieldValue.increment(1),
                 lastUpdated: Timestamp.now()
            }, { merge: true });
        }
        
        // SCENARIO B: REJECT
        if (action === 'reject') {
             t.update(requestRef, {
                status: 'Rejected',
                rejectionReason: rejectionReason || 'Does not meet criteria',
                lastActivity: Timestamp.now(),
            });
        }
    });

    return NextResponse.json({ success: true, status: action });

  } catch (error: any) {
    console.error("Provisioning Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
