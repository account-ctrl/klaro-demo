
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  const start = performance.now();
  
  try {
    // 1. LATENCY CHECK: Perform a lightweight read
    await adminDb.collection('system').doc('ping').get();
    const latency = Math.round(performance.now() - start);

    // 2. ERROR LOGS: Count recent errors (last 1h)
    // (Requires you to log critical errors to a 'system_logs' collection)
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const errorSnap = await adminDb.collection('system_logs')
      .where('level', '==', 'error')
      .where('timestamp', '>', oneHourAgo)
      .count()
      .get();
    
    // 3. STATUS LOGIC
    let status = 'healthy';
    if (latency > 500) status = 'degraded';
    if (errorSnap.data().count > 50) status = 'critical';

    return NextResponse.json({
      status,
      latency: `${latency}ms`,
      errorCount: errorSnap.data().count,
      lastCheck: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ status: 'down', latency: 'N/A' }, { status: 500 });
  }
}
