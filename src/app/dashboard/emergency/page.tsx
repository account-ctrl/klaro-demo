'use client';

import { EmergencyDashboard } from "./emergency-dashboard";
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';
import { EmergencyErrorBoundary } from "@/components/ui/emergency-error-boundary";

function EmergencyPage() {
  return (
    <div className="absolute top-0 left-0 w-full h-full bg-zinc-950 overflow-hidden">
      <EmergencyErrorBoundary name="Barangay Command Center">
        <EmergencyDashboard />
      </EmergencyErrorBoundary>
    </div>
  );
}

export default withRoleGuard(EmergencyPage, [PERMISSIONS.VIEW_EMERGENCY]);
