'use server'
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function upgradeTenantPlan(tenantId: string, newPlan: 'premium') {
  // 1. Define Plan Limits
  const PLANS = {
    premium: {
      maxStorageGB: 100,
      canAccessAI: true,
      canPrintOfficialSeal: true
    }
  };

  // 2. Apply Update
  // Note: We use 'barangays' collection for tenants in this codebase as per admin pages
  await adminDb.collection('barangays').doc(tenantId).update({
    'billing.plan': newPlan,
    'billing.status': 'active',
    'billing.nextBillingDate': new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // +1 Year
    'billing.features': PLANS[newPlan]
  });

  // 3. Log Audit Trail
  await adminDb.collection('system_logs').add({
    type: 'BILLING_UPGRADE',
    tenantId,
    plan: newPlan,
    admin: 'super_admin_email', // Replace with actual admin email from context if available
    timestamp: new Date()
  });
}
