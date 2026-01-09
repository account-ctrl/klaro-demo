'use client';

import InsightsGenerator from "./insights-generator";
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';

function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Barangay Data Insights</h1>
        <p className="text-muted-foreground">
          Leverage AI to analyze your barangay's data and uncover valuable insights.
        </p>
      </div>
      
      <InsightsGenerator />
    </div>
  );
}

// Insights access sensitive data across modules, so restrict to Admin/Secretary/Official
export default withRoleGuard(InsightsPage, [PERMISSIONS.MANAGE_SETTINGS]);
