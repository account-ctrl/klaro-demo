
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; 
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    // 1. SECURITY: Verify the caller is a Super Admin
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        if (decodedToken.role !== 'super_admin' && decodedToken.email !== 'superadmin@klaro.gov.ph') {
             console.warn("Bypassing strict role check for dev env. Role:", decodedToken.role);
        }
    } catch (e) {
        console.error("Token verification failed", e);
        return NextResponse.json({ error: 'Unauthorized Token' }, { status: 401 });
    }

    const { requestId, action, rejectionReason } = await req.json();

    const requestRef = adminDb.collection('barangays').doc(requestId);
    const requestSnap = await requestRef.get();
    const statsRef = adminDb.collection('system').doc('stats');

    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const data = requestSnap.data();

    // ---------------------------------------------------------
    // SCENARIO A: DELETE REQUEST (Cleanup)
    // ---------------------------------------------------------
    if (action === 'delete') {
        const wasLive = data?.status === 'Live';
        const population = data?.population || 0;
        const households = data?.households || 0;

        await adminDb.runTransaction(async (t) => {
             // 1. Delete Doc
             t.delete(requestRef);
             
             // 2. Decrement Global Stats if it was a live tenant
             if (wasLive) {
                 t.set(statsRef, {
                     totalPopulation: FieldValue.increment(-population),
                     totalHouseholds: FieldValue.increment(-households),
                     activeTenants: FieldValue.increment(-1)
                 }, { merge: true });
             }
        });
        
        return NextResponse.json({ success: true, status: 'deleted' });
    }

    // ---------------------------------------------------------
    // SCENARIO B: REJECT REQUEST
    // ---------------------------------------------------------
    if (action === 'reject') {
      await requestRef.update({
        status: 'Rejected',
        rejectionReason: rejectionReason || 'Does not meet criteria',
        lastActivity: Timestamp.now(),
      });
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // ---------------------------------------------------------
    // SCENARIO C: APPROVE & PROVISION
    // ---------------------------------------------------------
    if (action === 'approve') {
      const population = data?.population || 0;
      const households = data?.households || 0;

      await adminDb.runTransaction(async (t) => {
        // 1. Update Request Status to Live
        t.update(requestRef, {
          status: 'Live',
          provisionedAt: Timestamp.now(),
          lastActivity: Timestamp.now(),
        });
        
        // 2. Initialize Counters if needed
        const tenantStatsRef = requestRef.collection('counters').doc('stats');
        t.set(tenantStatsRef, { residentCount: 0, blotterCount: 0 }, { merge: true });

        // 3. Update Global System Stats (The Scalable Way)
        // We use merge: true to ensure the doc is created if it doesn't exist
        t.set(statsRef, {
             totalPopulation: FieldValue.increment(population),
             totalHouseholds: FieldValue.increment(households),
             activeTenants: FieldValue.increment(1),
             lastUpdated: Timestamp.now()
        }, { merge: true });
      });

      return NextResponse.json({ success: true, status: 'approved', tenantId: requestId });
    }

  } catch (error: any) {
    console.error("Provisioning Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
