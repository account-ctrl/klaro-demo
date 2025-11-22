
import { EmergencyDashboard } from "./emergency-dashboard";

export default function EmergencyPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Emergency Command Center</h1>
            <p className="text-muted-foreground">
            Monitor and respond to real-time resident alerts.
            </p>
        </div>
      </div>
      <EmergencyDashboard />
    </div>
  );
}
