
"use client";

import { useMaintenanceLogs } from "@/hooks/use-assets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface MaintenanceHistoryProps {
  assetId: string;
}

export function MaintenanceHistory({ assetId }: MaintenanceHistoryProps) {
  const { data: logs, isLoading } = useMaintenanceLogs(assetId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p>Loading logs...</p>}
        {logs && logs.length > 0 ? (
          logs.map((log) => (
            <div key={log.logId} className="border-l-2 pl-4">
                <p className="text-sm font-medium">{format(new Date(log.serviceDate), 'MMM d, yyyy')} - <span className="font-normal">{log.serviceType}</span></p>
                <p className="text-sm text-muted-foreground">{log.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Serviced by: {log.servicedBy} | Parts: {log.partsUsed || 'N/A'} | Cost: ${log.cost}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No maintenance logs for this asset.</p>
        )}
      </CardContent>
    </Card>
  );
}
