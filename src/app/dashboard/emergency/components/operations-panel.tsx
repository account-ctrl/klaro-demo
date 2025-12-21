'use client';

import React, { useState, useMemo } from 'react';
import { EmergencyAlert, User, ResponderLocation, FixedAsset } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
    AlertCircle, 
    Ambulance, 
    Radio, 
    MapPin, 
    Clock, 
    Phone, 
    User as UserIcon, 
    ArrowLeft, 
    Siren,
    Navigation,
    ShieldAlert,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useTenant } from '@/providers/tenant-provider';

interface OperationsPanelProps {
  alerts: EmergencyAlert[];
  responders: ResponderLocation[]; 
  users: User[];
  assets: FixedAsset[];
  onAlertSelect: (alertId: string, location?: { lat: number; lng: number }) => void;
  selectedAlertId: string | null;
}

// Distance Helper
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = deg2rad(lat2-lat1); 
  const dLon = deg2rad(lon2-lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export function OperationsPanel({ 
  alerts, 
  responders, 
  users, 
  assets,
  onAlertSelect,
  selectedAlertId 
}: OperationsPanelProps) {
    const { tenantPath } = useTenant();
    const firestore = useFirestore();
    const [dispatchLoading, setDispatchLoading] = useState(false);

    // -- Derived State --
    const selectedAlert = useMemo(() => 
        alerts.find(a => a.id === selectedAlertId), 
    [alerts, selectedAlertId]);

    // -- Logic: Smart Dispatch Recommendations --
    const recommendedAssets = useMemo(() => {
        if (!selectedAlert || !selectedAlert.latitude || !selectedAlert.longitude) return [];
        
        // Filter assets that are vehicles
        const vehicles = assets.filter(a => a.type === 'Vehicle');

        // Calculate distances
        const withDistance = vehicles.map(asset => {
             // Mock distance for now as asset GPS isn't in FixedAsset type yet.
             return { ...asset, distance: 0 }; 
        });
        
        return withDistance.sort((a, b) => {
            // Sort by availability first
            if (a.status === 'Available' && b.status !== 'Available') return -1;
            if (a.status !== 'Available' && b.status === 'Available') return 1;
            return 0;
        });
    }, [selectedAlert, assets]);


    // -- Handlers --
    const handleDispatch = async (assetId: string, assetName: string) => {
        if (!selectedAlert || !tenantPath) return;
        setDispatchLoading(true);
        try {
            // Update Alert Status
            const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
            const alertRef = doc(firestore, `${safePath}/emergency_alerts/${selectedAlert.id}`);
            
            await updateDoc(alertRef, {
                status: 'Dispatched',
                responder_team_id: assetId,
                responderDetails: {
                    name: assetName,
                    dispatchedAt: serverTimestamp() 
                },
                notes: `Dispatched ${assetName}`
            });
            
            // Optionally update Asset status to 'In Use'
             const assetRef = doc(firestore, `${safePath}/fixed_assets/${assetId}`);
             await updateDoc(assetRef, { status: 'In Use' }); 

        } catch (error) {
            console.error("Dispatch failed:", error);
        } finally {
            setDispatchLoading(false);
        }
    };

    const handleResolve = async () => {
         if (!selectedAlert || !tenantPath) return;
         const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
         const alertRef = doc(firestore, `${safePath}/emergency_alerts/${selectedAlert.id}`);
         await updateDoc(alertRef, { status: 'Resolved', resolvedAt: serverTimestamp() });
         onAlertSelect(selectedAlert.id); // Deselect
    };

    const handleUpdateStatus = async (status: string) => {
         if (!selectedAlert || !tenantPath) return;
         const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
         const alertRef = doc(firestore, `${safePath}/emergency_alerts/${selectedAlert.id}`);
         await updateDoc(alertRef, { status: status });
         onAlertSelect(selectedAlert.id); // Deselect
    };

    const handleDelete = async () => {
         if (!selectedAlert || !tenantPath) return;
         if (!confirm("Are you sure you want to permanently delete this alert record?")) return;
         
         const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
         const alertRef = doc(firestore, `${safePath}/emergency_alerts/${selectedAlert.id}`);
         await deleteDoc(alertRef);
         onAlertSelect(selectedAlert.id); // Deselect
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        try { return formatDistanceToNow(date, { addSuffix: true }); } catch (e) { return ''; }
    };

    // -- Render --

    // MODE: RESPONSE (Detail View)
    if (selectedAlertId && selectedAlert) {
        return (
            <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/50">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" onClick={() => onAlertSelect(selectedAlert.id)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-red-400 border-red-900 bg-red-950/30">
                                {selectedAlert.category || 'SOS'}
                             </Badge>
                             <span className="text-xs font-mono text-zinc-500">#{selectedAlert.id.slice(0,6)}</span>
                        </div>
                        <h2 className="font-bold text-lg leading-tight mt-1">{selectedAlert.residentName || "Unknown Resident"}</h2>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-6">
                        
                        {/* 1. Intel Card */}
                        <Card className="bg-zinc-900 border-zinc-800 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                                <UserIcon className="h-3 w-3" /> Resident Intel
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase">Phone</div>
                                    <div className="text-sm font-mono text-zinc-200 flex items-center gap-2">
                                        <Phone className="h-3 w-3" /> {selectedAlert.contactNumber || "N/A"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase">Location</div>
                                    <div className="text-sm font-mono text-zinc-200 truncate">
                                        {selectedAlert.latitude?.toFixed(4)}, {selectedAlert.longitude?.toFixed(4)}
                                    </div>
                                </div>
                            </div>
                            {selectedAlert.message && (
                                <div className="bg-zinc-950 p-3 rounded text-sm text-zinc-300 italic border border-zinc-800">
                                    "{selectedAlert.message}"
                                </div>
                            )}
                        </Card>

                        {/* 2. Dispatch Module */}
                        <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                                    <Siren className="h-3 w-3" /> Recommended Units
                                </div>
                                <span className="text-[10px] text-zinc-600">Sorted by availability</span>
                             </div>

                             <div className="space-y-2">
                                {recommendedAssets.length === 0 && <div className="text-zinc-500 text-sm italic">No vehicle assets found.</div>}
                                {recommendedAssets.map((asset) => (
                                    <div key={asset.assetId} className="flex items-center justify-between p-3 rounded border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-700 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-blue-900/20 text-blue-400 flex items-center justify-center border border-blue-900/50">
                                                <Ambulance className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-zinc-200">{asset.name}</div>
                                                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                    <span className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        asset.status === 'Available' ? "bg-emerald-500" : "bg-amber-500"
                                                    )} />
                                                    {asset.status}
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant={asset.status === 'Available' ? 'default' : 'secondary'}
                                            className={cn("h-7 text-xs", asset.status === 'Available' ? "bg-blue-600 hover:bg-blue-700" : "")}
                                            disabled={dispatchLoading || asset.status !== 'Available'}
                                            onClick={() => handleDispatch(asset.assetId, asset.name)}
                                        >
                                            {asset.status === 'Available' ? 'Dispatch' : 'Busy'}
                                        </Button>
                                    </div>
                                ))}
                             </div>
                        </div>

                    </div>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-2 items-center">
                    <Button variant="destructive" className="flex-1" onClick={handleResolve}>
                        Resolve
                    </Button>
                     <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => handleUpdateStatus('False Alarm')}>
                        False Alarm
                    </Button>
                    <div className="h-8 w-[1px] bg-zinc-800 mx-1"></div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-600 hover:text-red-500 hover:bg-red-950/30" onClick={handleDelete} title="Delete Record Forever">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // MODE: MONITOR (List View)
    return (
        <div className="flex flex-col h-full bg-zinc-950">
            <div className="p-4 border-b border-zinc-800 shrink-0">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-1">Ops Deck</h2>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-xs font-mono text-emerald-500">SYSTEM LIVE</span>
                </div>
            </div>

            <Tabs defaultValue="incidents" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 pt-4 shrink-0">
                    <TabsList className="w-full grid grid-cols-2 bg-zinc-900 border border-zinc-800">
                        <TabsTrigger value="incidents" className="text-xs uppercase data-[state=active]:bg-red-900/20 data-[state=active]:text-red-400">
                            Active ({alerts.length})
                        </TabsTrigger>
                        <TabsTrigger value="fleet" className="text-xs uppercase data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-400">
                            Fleet
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="incidents" className="flex-1 min-h-0 mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-3">
                            {alerts.length === 0 ? (
                                <div className="text-center py-10 text-zinc-600 text-sm">
                                    <Radio className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p>All Quiet</p>
                                </div>
                            ) : (
                                alerts.map(alert => (
                                    <Card 
                                        key={alert.id}
                                        onClick={() => onAlertSelect(alert.id, { lat: alert.latitude, lng: alert.longitude })}
                                        className={cn(
                                            "p-3 border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 cursor-pointer transition-all relative overflow-hidden group",
                                            alert.status === 'New' && "border-l-2 border-l-red-500"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] border-0",
                                                alert.status === 'New' ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"
                                            )}>
                                                {alert.status}
                                            </Badge>
                                            <span className="text-[10px] text-zinc-500 font-mono">{formatTime(alert.timestamp)}</span>
                                        </div>
                                        <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white">{alert.residentName || "Unknown"}</h3>
                                        <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3" /> 
                                            {alert.location_source === 'GPS' ? 'GPS Lock' : 'Manual Report'}
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="fleet" className="flex-1 min-h-0 mt-0">
                    <ScrollArea className="h-full">
                         <div className="p-4 space-y-4">
                            {/* Responders Section */}
                            <div>
                                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Personnel</h3>
                                <div className="space-y-2">
                                    {users.filter(u => u.systemRole === 'Responder' || u.systemRole === 'Admin').map(user => {
                                         // Check online status via responder location
                                         const loc = responders.find(r => r.userId === user.userId || r.id === user.userId);
                                         const isOnline = loc && loc.status !== 'Offline';
                                         
                                         return (
                                            <div key={user.userId} className="flex items-center justify-between p-2 rounded bg-zinc-900/20 border border-zinc-800/50">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-zinc-600")} />
                                                    <span className="text-sm text-zinc-300">{user.fullName}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-600">{user.systemRole}</span>
                                            </div>
                                         )
                                    })}
                                </div>
                            </div>

                            {/* Assets Section */}
                            <div>
                                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Vehicles</h3>
                                <div className="space-y-2">
                                    {assets.filter(a => a.type === 'Vehicle').map(asset => (
                                        <div key={asset.assetId} className="flex items-center justify-between p-2 rounded bg-zinc-900/20 border border-zinc-800/50">
                                            <div className="flex items-center gap-2">
                                                <CarIcon type={asset.type} className="h-4 w-4 text-zinc-500" />
                                                <span className="text-sm text-zinc-300">{asset.name}</span>
                                            </div>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] border-0", 
                                                asset.status === 'Available' ? "bg-emerald-900/30 text-emerald-500" : "bg-amber-900/30 text-amber-500"
                                            )}>
                                                {asset.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function CarIcon({ type, className }: { type: string, className?: string }) {
    if (type === 'Vehicle') return <Ambulance className={className} />
    return <Radio className={className} />
}
