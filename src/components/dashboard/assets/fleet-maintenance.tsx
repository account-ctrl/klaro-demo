
"use client";

import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { FixedAsset } from "@/lib/types";
import { MaintenanceHistory } from './maintenance-history';

interface FleetMaintenanceProps {
  assets: FixedAsset[];
  onOpenMaintenance: (asset: FixedAsset) => void;
}

export function FleetMaintenance({ assets, onOpenMaintenance }: FleetMaintenanceProps) {
    const vehicles = assets.filter(a => a.type === 'Vehicle');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fleet Maintenance</CardTitle>
                <CardDescription>Track and manage maintenance schedules for all barangay vehicles.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Accordion type="single" collapsible onValueChange={setSelectedVehicleId}>
                    {vehicles.map(vehicle => (
                        <AccordionItem key={vehicle.assetId} value={vehicle.assetId}>
                            <AccordionTrigger>
                                <div className="flex justify-between items-center w-full pr-4">
                                    <div className="text-left">
                                        <p className="font-medium">{vehicle.name} ({vehicle.plateNumber})</p>
                                        <p className="text-sm text-muted-foreground">
                                            Next Due: {vehicle.nextMaintenanceDue ? new Date(vehicle.nextMaintenanceDue).toLocaleDateString() : 'Not set'} 
                                            <span className={`ml-2 inline-block h-2 w-2 rounded-full ${vehicle.status === 'Available' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                                        </p>
                                    </div>
                                    {/* Button moved out to prevent hydration error (button inside button) */}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="mb-4 flex justify-end">
                                     <Button size="sm" onClick={() => onOpenMaintenance(vehicle)}>
                                        <Wrench className="h-4 w-4 mr-2" />
                                        Log New Service
                                    </Button>
                                </div>
                                {selectedVehicleId === vehicle.assetId && (
                                   <MaintenanceHistory assetId={vehicle.assetId} />
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                 {vehicles.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">No vehicles found in the asset inventory.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
