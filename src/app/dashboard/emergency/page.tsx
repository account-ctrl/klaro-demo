
import { EmergencyDashboard } from "./emergency-dashboard";
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';

function EmergencyPage() {
  return (
    // Removed standard page headers/layout wrapper to allow full-screen dashboard
    <div className="absolute top-0 left-0 w-full h-full bg-zinc-950 overflow-hidden">
      <EmergencyDashboard />
    </div>
  );
}

export default withRoleGuard(EmergencyPage, [PERMISSIONS.VIEW_EMERGENCY]);
