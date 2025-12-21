'use client';

import React, { useState, useMemo } from 'react';
import { EmergencyAlert, User, ResponderLocation, FixedAsset, Household } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    Trash2,
    PlayCircle,
    UserCheck,
    Settings,
    Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useTenant } from '@/providers/tenant-provider';
import { IncidentTimeline } from './incident-timeline';

interface OperationsPanelProps {
  alerts: EmergencyAlert[];
  responders: ResponderLocation[]; 
  users: User[];
  assets: FixedAsset[];
  households?: Household[];
  onAlertSelect: (alertId: string, location?: { lat: number; lng: number }) => void;
  selectedAlertId: string | null;
}

export function OperationsPanel({ 
  alerts, 
  responders, 
  users, 
  assets,
  households,
  onAlertSelect,
  selectedAlertId 
}: OperationsPanelProps) {
    const { tenantPath } = useTenant();
    const firestore = useFirestore();
    const [dispatchLoading, setDispatchLoading] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    
    // Asset Detail State
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    // -- Derived State --
    const selectedAlert = useMemo(() => 
        alerts.find(a => a.id === selectedAlertId), 
    [alerts, selectedAlertId]);

    const selectedAsset = useMemo(() => 
        assets.find(a => a.assetId === selectedAssetId),
    [assets, selectedAssetId]);

    // -- Smart Dispatch Lists --
    const recommendedAssets = useMemo(() => {
        if (!selectedAlert) return [];
        const vehicles = assets.filter(a => a.type === 'Vehicle');
        return vehicles.sort((a, b) => {
            if (a.status === 'Available' && b.status !== 'Available') return -1;
            if (a.status !== 'Available' && b.status === 'Available') return 1;
            return 0;
        });
    }, [selectedAlert, assets]);

    const availablePersonnel = useMemo(() => {
        // Filter users who are Responders or Admin (Staff)
        return users.filter(u => 
            ['Responder', 'Admin', 'Tanod', 'Staff'].includes(u.systemRole || '') 
        ).map(u => {
            const loc = responders.find(r => r.userId === u.userId || r.id === u.userId);
            return {
                ...u,
                status: loc?.status || 'Offline',
                isOnline: loc?.status !== 'Offline'
            };
        }).sort((a, b) => (a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1));
    }, [users, responders]);


    // -- Handlers --
    const handleDispatch = async (id: string, name: string, type: 'Asset' | 'Person') => {
        if (!selectedAlert || !tenantPath) return;
        setDispatchLoading(true);
        try {
            const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
            const alertRef = doc(firestore, `${safePath}/emergency_alerts/${selectedAlert.id}`);
            
            await updateDoc(alertRef, {
                status: 'Dispatched',
                responder_team_id: id,
                responderDetails: { name, type, dispatchedAt: serverTimestamp() },
                notes: `Dispatched ${type}: ${name}`
            });
            
            if (type === 'Asset') {
                 const assetRef = doc(firestore, `${safePath}/fixed_assets/${id}`);
                 await updateDoc(assetRef, { status: 'In Use' }); 
            }
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
         
         // Free up asset if assigned
         if (selectedAlert.responder_team_id) {
             // Check if it's an asset (simple check: exists in assets list)
             const isAsset = assets.some(a => a.assetId === selectedAlert.responder_team_id);
             if (isAsset) {
                 const assetRef = doc(firestore, `${safePath}/fixed_assets/${selectedAlert.responder_team_id}`);
                 await updateDoc(assetRef, { status: 'Available' });
             }
         }

         await updateDoc(alertRef, { status: 'Resolved', resolvedAt: serverTimestamp() });
         onAlertSelect(selectedAlert.id); 
    };

    const handleUpdateStatus = async (status: string) => {
         if (!selectedAlert || !tenantPath) return;
         const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
         const alertRef = doc(firestore, `${safePath}/emergency_alerts/${selectedAlert.id}`);
         await updateDoc(alertRef, { status: status });
         onAlertSelect(selectedAlert.id); 
    };

    const handleDelete = async () => {
         if (!selectedAlert || !tenantPath) return;
         if (!confirm("Delete record?")) return;
         const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
         await deleteDoc(doc(firestore, `${safePath}/emergency_alerts/${selectedAlert.id}`));
         onAlertSelect(selectedAlert.id); 
    };

    const handleSimulateSOS = async () => {
        if (!households?.length || !tenantPath) return;
        setIsSimulating(true);
        try {
            const valid = households.filter(h => h.latitude && h.longitude);
            if (!valid.length) return;
            const target = valid[Math.floor(Math.random() * valid.length)];
            const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
            await addDoc(collection(firestore, `${safePath}/emergency_alerts`), {
                residentId: 'SIMULATED_USER',
                residentName: `${target.name} (Sim)`,
                timestamp: serverTimestamp(),
                latitude: target.latitude,
                longitude: target.longitude,
                accuracy_m: 10,
                location_source: 'GPS',
                status: 'New',
                category: 'Medical',
                message: 'TEST ALERT: Simulation',
                contactNumber: '09123456789',
                address: { mapAddress: { street: target.address } }
            });
        } catch (e) { console.error(e); } finally { setIsSimulating(false); }
    };

    const handleAssetStatusChange = async (status: string) => {
        if (!selectedAsset || !tenantPath) return;
        const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
        await updateDoc(doc(firestore, `${safePath}/fixed_assets/${selectedAsset.assetId}`), { status });
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        try { return formatDistanceToNow(date, { addSuffix: true }); } catch (e) { return ''; }
    };

    // --- VIEW: ASSET DETAILS ---
    if (selectedAssetId && selectedAsset) {
        return (
            <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/50">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" onClick={() => setSelectedAssetId(null)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-blue-400 border-blue-900 bg-blue-950/30">{selectedAsset.type}</Badge>
                        </div>
                        <h2 className="font-bold text-lg leading-tight mt-1">{selectedAsset.name}</h2>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-zinc-500">Status</Label>
                                    <Select value={selectedAsset.status} onValueChange={handleAssetStatusChange}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Available">Available</SelectItem>
                                            <SelectItem value="In Use">In Use</SelectItem>
                                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                                            <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-zinc-500">Plate Number</Label>
                                    <div className="text-sm font-mono bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                                        {selectedAsset.plateNumber || 'N/A'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-zinc-500">Model / Brand</Label>
                                <div className="text-sm text-zinc-300">
                                    {selectedAsset.brand} {selectedAsset.model}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-zinc-500">Custodian</Label>
                                <div className="flex items-center gap-2 p-2 bg-zinc-900/30 rounded border border-zinc-800/50">
                                    <UserIcon className="h-4 w-4 text-zinc-500" />
                                    <span className="text-sm text-zinc-300">{selectedAsset.custodianName || 'Unassigned'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        );
    }

    // --- VIEW: INCIDENT DETAILS ---
    if (selectedAlertId && selectedAlert) {
        return (
            <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/50">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" onClick={() => onAlertSelect(selectedAlert.id)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-red-400 border-red-900 bg-red-950/30">{selectedAlert.category || 'SOS'}</Badge>
                             <span className="text-xs font-mono text-zinc-500">#{selectedAlert.id.slice(0,6)}</span>
                        </div>
                        <h2 className="font-bold text-lg leading-tight mt-1">{selectedAlert.residentName || "Unknown Resident"}</h2>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-6">
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
                            {selectedAlert.message && <div className="bg-zinc-950 p-3 rounded text-sm text-zinc-300 italic border border-zinc-800">"{selectedAlert.message}"</div>}
                        </Card>

                        <IncidentTimeline alertId={selectedAlert.id} />

                        <div className="space-y-4 pt-2">
                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider font-semibold"><Siren className="h-3 w-3" /> Fleet Units</div>
                                </div>
                                {recommendedAssets.map((asset) => (
                                    <div key={asset.assetId} className="flex items-center justify-between p-2 rounded border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-blue-900/20 text-blue-400 flex items-center justify-center border border-blue-900/50"><Ambulance className="h-4 w-4" /></div>
                                            <div>
                                                <div className="font-medium text-sm text-zinc-200">{asset.name}</div>
                                                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                    <span className={cn("w-1.5 h-1.5 rounded-full", asset.status === 'Available' ? "bg-emerald-500" : "bg-amber-500")} />
                                                    {asset.status}
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant={asset.status === 'Available' ? 'default' : 'secondary'} className={cn("h-7 text-xs", asset.status === 'Available' ? "bg-blue-600 hover:bg-blue-700" : "")} disabled={dispatchLoading || asset.status !== 'Available'} onClick={() => handleDispatch(asset.assetId, asset.name, 'Asset')}>Dispatch</Button>
                                    </div>
                                ))}
                             </div>
                             
                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider font-semibold"><UserCheck className="h-3 w-3" /> Personnel</div>
                                </div>
                                {availablePersonnel.map((user) => (
                                    <div key={user.userId} className="flex items-center justify-between p-2 rounded border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center border border-zinc-700"><UserIcon className="h-4 w-4" /></div>
                                            <div>
                                                <div className="font-medium text-sm text-zinc-200">{user.fullName}</div>
                                                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                    <span className={cn("w-1.5 h-1.5 rounded-full", user.isOnline ? "bg-emerald-500" : "bg-zinc-600")} />
                                                    {user.status}
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="secondary" className="h-7 text-xs" disabled={dispatchLoading} onClick={() => handleDispatch(user.userId, user.fullName, 'Person')}>Assign</Button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-2 items-center">
                    <Button variant="destructive" className="flex-1" onClick={handleResolve}>Resolve</Button>
                     <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => handleUpdateStatus('False Alarm')}>False Alarm</Button>
                    <div className="h-8 w-[1px] bg-zinc-800 mx-1"></div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-600 hover:text-red-500 hover:bg-red-950/30" onClick={handleDelete} title="Delete Record"><Trash2 className="h-4 w-4" /></Button>
                </div>
            </div>
        );
    }

    // --- VIEW: DASHBOARD (List) ---
    return (
        <div className="flex flex-col h-full bg-zinc-950">
            <div className="p-4 border-b border-zinc-800 shrink-0 flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-1">Ops Deck</h2>
                    <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono text-emerald-500">SYSTEM LIVE</span>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-400" onClick={handleSimulateSOS} disabled={isSimulating}><PlayCircle className="w-3 h-3 mr-1" /> SIM</Button>
            </div>

            <Tabs defaultValue="incidents" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 pt-4 shrink-0">
                    <TabsList className="w-full grid grid-cols-2 bg-zinc-900 border border-zinc-800">
                        <TabsTrigger value="incidents" className="text-xs uppercase data-[state=active]:bg-red-900/20 data-[state=active]:text-red-400">Active ({alerts.length})</TabsTrigger>
                        <TabsTrigger value="fleet" className="text-xs uppercase data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-400">Fleet</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="incidents" className="flex-1 min-h-0 mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-3">
                            {alerts.length === 0 ? <div className="text-center py-10 text-zinc-600 text-sm"><Radio className="w-8 h-8 mx-auto mb-3 opacity-20" /><p>All Quiet</p></div> : 
                                alerts.map(alert => (
                                    <Card key={alert.id} onClick={() => onAlertSelect(alert.id, { lat: alert.latitude, lng: alert.longitude })} className={cn("p-3 border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 cursor-pointer transition-all relative overflow-hidden group", alert.status === 'New' && "border-l-2 border-l-red-500")}>
                                        <div className="flex justify-between items-start mb-1">
                                            <Badge variant="outline" className={cn("text-[10px] border-0", alert.status === 'New' ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400")}>{alert.status}</Badge>
                                            <span className="text-[10px] text-zinc-500 font-mono">{formatTime(alert.timestamp)}</span>
                                        </div>
                                        <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white">{alert.residentName || "Unknown"}</h3>
                                        <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {alert.location_source === 'GPS' ? 'GPS Lock' : 'Manual Report'}</div>
                                    </Card>
                                ))
                            }
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="fleet" className="flex-1 min-h-0 mt-0">
                    <ScrollArea className="h-full">
                         <div className="p-4 space-y-4">
                            <div>
                                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Personnel</h3>
                                <div className="space-y-2">
                                    {availablePersonnel.map(user => (
                                        <div key={user.userId} className="flex items-center justify-between p-2 rounded bg-zinc-900/20 border border-zinc-800/50">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", user.isOnline ? "bg-emerald-500" : "bg-zinc-600")} />
                                                <span className="text-sm text-zinc-300">{user.fullName}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-600">{user.systemRole}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Vehicles</h3>
                                <div className="space-y-2">
                                    {assets.filter(a => a.type === 'Vehicle').map(asset => (
                                        <div key={asset.assetId} onClick={() => setSelectedAssetId(asset.assetId)} className="flex items-center justify-between p-2 rounded bg-zinc-900/20 border border-zinc-800/50 hover:bg-zinc-900 cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Truck className="h-4 w-4 text-zinc-500" />
                                                <span className="text-sm text-zinc-300">{asset.name}</span>
                                            </div>
                                            <Badge variant="outline" className={cn("text-[10px] border-0", asset.status === 'Available' ? "bg-emerald-900/30 text-emerald-500" : "bg-amber-900/30 text-amber-500")}>
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
