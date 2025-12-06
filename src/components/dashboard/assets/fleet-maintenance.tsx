
"use client";

import { FixedAsset } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Wrench, AlertTriangle } from "lucide-react";
import { isBefore } from "date-fns";

interface FleetMaintenanceProps {
  assets: FixedAsset[];
  onOpenMaintenance: (asset: FixedAsset) => void;
}

export function FleetMaintenance({ assets, onOpenMaintenance }: FleetMaintenanceProps) {
  const vehicles = assets.filter((a) => a.type === "Vehicle");

  if (vehicles.length === 0) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-12">
        No vehicles registered in fleet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle) => (
        <Card key={vehicle.assetId} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> {vehicle.name}
            </CardTitle>
            <CardDescription>
              Plate: {vehicle.plateNumber || "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    vehicle.status === "Available" ? "secondary" : "destructive"
                  }
                >
                  {vehicle.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  Next Maintenance
                </span>
                <span className="font-medium flex items-center gap-1">
                  {vehicle.nextMaintenanceDue
                    ? new Date(vehicle.nextMaintenanceDue).toLocaleDateString()
                    : "Not Scheduled"}
                  {vehicle.nextMaintenanceDue &&
                    isBefore(new Date(vehicle.nextMaintenanceDue), new Date()) && (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => onOpenMaintenance(vehicle)}
              >
                <Wrench className="mr-2 h-3 w-3" /> Update Status / Maintenance
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
