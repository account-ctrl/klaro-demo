'use client';

import { useMemo, useState, useEffect, useRef } from "react";
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { EmergencyAlert, User, Resident } from "@/lib/types";
import { useEmergencyAlerts, useResponderLocations, useHouseholds, useResidents, useHazardMonitoringPoints } from '@/hooks/use-barangay-data';
import { useFixedAssets } from '@/hooks/use-assets';
import dynamic from 'next/dynamic';
import { Loader2, LayoutGrid, ChevronRight, ChevronLeft, Scan, Users, Accessibility, Baby, Activity, User as UserIcon, Phone, Mail, Calendar, MapPin, Heart, Shield, Briefcase, Trash2, X, AlertTriangle } from "lucide-react";
import { collection, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useTenant } from "@/providers/tenant-provider";
import { useTenantProfile } from "@/hooks/use-tenant-profile";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResidentEditorContent } from "../residents/resident-actions";

// Refactored Components
import { WeatherHeader } from "./components/weather-header";
import { OperationsPanel } from "./components/operations-panel"; 
import { MapLayerControl, LayerState } from "./components/map-layer-control";
import { MapSearchBar } from "./components/map-search-bar";

const EmergencyMap = dynamic(() => import('@/components/emergency-map'), { 
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <div className="text-xs font-mono tracking-widest uppercase">Initializing Geospatial Engine...</div>
        </div>
    )
});

// --- ENHANCED RESIDENT QUICK VIEW ---
function ResidentQuickView({ resident, onEdit, onClose }: { resident: Resident, onEdit: (r: Resident) => void, onClose: () => void }) {
    const age = resident.dateOfBirth ? new Date().getFullYear() - new Date(resident.dateOfBirth).getFullYear() : 'N/A';
    
    return (
        <div className="flex flex-col h-full bg-white text-zinc-900 font-sans">
            <div className="p-6 bg-zinc-100 border-b border-zinc-200 relative shrink-0">
                <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900">
                    <X className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-zinc-200 border-2 border-orange-500 flex items-center justify-center overflow-hidden shadow-sm">
                        {resident.selfieUrl ? (
                            <img src={resident.selfieUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <UserIcon className="h-8 w-8 text-zinc-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900">{resident.firstName} {resident.lastName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] uppercase font-black bg-orange-500 text-white border-transparent">
                                {resident.status}
                            </Badge>
                            <span className="text-xs text-zinc-600 font-bold uppercase tracking-wider">• {resident.gender}, {age} yrs</span>
                        </div>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1 bg-zinc-50">
                <div className="p-6 space-y-6">
                    <div className="flex flex-wrap gap-2">
                        {resident.isPwd && <Badge className="bg-cyan-600 text-white border-transparent text-[10px] font-black uppercase">PWD</Badge>}
                        {resident.is4ps && <Badge className="bg-orange-600 text-white border-transparent text-[10px] font-black uppercase">4Ps</Badge>}
                        {Number(age) >= 60 && <Badge className="bg-purple-600 text-white border-transparent text-[10px] font-black uppercase">Senior Citizen</Badge>}
                        {resident.isVoter && <Badge className="bg-blue-600 text-white border-transparent text-[10px] font-black uppercase">Registered Voter</Badge>}
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                <Shield className="h-3 w-3" /> Contact & Identity
                            </h4>
                            <div className="space-y-3 bg-white p-4 rounded-lg border-2 border-zinc-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-zinc-100 rounded">
                                        <Phone className="h-3.5 w-3.5 text-zinc-900" />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-800">{resident.contactNumber || 'No phone number'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-zinc-100 rounded">
                                        <Mail className="h-3.5 w-3.5 text-zinc-900" />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-800 truncate">{resident.email || 'No email address'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-zinc-100 rounded">
                                        <Calendar className="h-3.5 w-3.5 text-zinc-900" />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-800">{resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                <MapPin className="h-3 w-3" /> Residency
                            </h4>
                            <div className="bg-white p-4 rounded-lg border-2 border-zinc-200 shadow-sm">
                                <p className="text-sm font-bold leading-relaxed text-zinc-800">
                                    {typeof resident.address === 'string' ? resident.address : 'See household location'}
                                </p>
                                <p className="text-[10px] text-zinc-400 mt-2 uppercase font-black tracking-widest">
                                    HH ID: {resident.householdId || 'None'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                    <Heart className="h-3 w-3" /> Health
                                </h4>
                                <div className="bg-white p-4 rounded-lg border-2 border-zinc-200 shadow-sm">
                                    <p className="text-xs font-black text-zinc-900 uppercase">{resident.healthProfile?.bloodType ? `Blood: ${resident.healthProfile.bloodType}` : 'No Data'}</p>
                                    {resident.healthProfile?.comorbidities && (
                                        <p className="text-[10px] text-zinc-500 mt-1 font-bold">{resident.healthProfile.comorbidities.join(', ')}</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                    <Briefcase className="h-3 w-3" /> Job
                                </h4>
                                <div className="bg-white p-4 rounded-lg border-2 border-zinc-200 shadow-sm">
                                    <p className="text-xs font-black text-zinc-900 uppercase truncate">{resident.occupation || 'None'}</p>
                                    <p className="text-[10px] text-zinc-500 mt-1 font-bold">Resident</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <div className="p-6 bg-white border-t border-zinc-200 shrink-0">
                <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-12 shadow-md uppercase tracking-widest"
                    onClick={() => onEdit(resident)}
                >
                    EDIT FULL PROFILE
                </Button>
            </div>
        </div>
    );
}

export function EmergencyDashboard() {
  const { tenantId, tenantPath } = useTenant();
  const firestore = useFirestore();
  const { profile } = useTenantProfile();
  const { user } = useUser();
  
  // -- STATE --
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [route, setRoute] = useState<any>(null); 
  const [searchedLocation, setSearchedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [highlightedHouseholdId, setHighlightedHouseholdId] = useState<string | null>(null);
  const [layerState, setLayerState] = useState<LayerState>({
      showCCTV: false,
      showHydrants: false,
      showEvac: false,
      demographicLayer: 'none'
  });
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [isResidentQuickViewOpen, setIsResidentQuickViewOpen] = useState(false);
  const [isResidentFullEditOpen, setIsResidentFullEditOpen] = useState(false);

  // -- DATA HOOKS --
  const { data: allAlerts, isLoading: isLoadingAlerts } = useEmergencyAlerts();
  const { data: responders } = useResponderLocations();
  const { data: assets } = useFixedAssets();
  const { data: households, update: updateHousehold } = useHouseholds();
  const { data: residents, update: updateResident } = useResidents();
  const { data: hazardPoints } = useHazardMonitoringPoints();

  const usersQuery = useMemoFirebase(() => {
    if (!tenantId || !firestore) return null;
    return query(collection(firestore, 'users'), where('tenantId', '==', tenantId));
  }, [tenantId, firestore]);
  
  const { data: users } = useCollection<User>(usersQuery);

  const activeAlerts = useMemo(() => {
      return allAlerts?.filter(a => ['New', 'Acknowledged', 'Dispatched', 'On Scene'].includes(a.status)) ?? [];
  }, [allAlerts]);

  const mapHouseholds = useMemo(() => {
      if (!households || !residents) return [];
      
      const vulnMap = new Map<string, { isSenior: boolean, isPwd: boolean, is4ps: boolean, count: number }>();
      
      residents.forEach(r => {
          if (!r.householdId) return;
          const current = vulnMap.get(r.householdId) || { isSenior: false, isPwd: false, is4ps: false, count: 0 };
          const age = r.dateOfBirth ? new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear() : 0;
          if (age >= 60) current.isSenior = true;
          if (r.isPwd) current.isPwd = true;
          if (r.is4ps) current.is4ps = true;
          current.count++;
          vulnMap.set(r.householdId, current);
      });

      return households.map(h => {
          const stats = vulnMap.get(h.householdId) || { isSenior: false, isPwd: false, is4ps: false, count: 0 };
          return { ...h, ...stats, is4Ps: stats.is4ps }; // Mapping for UI consistency
      });
  }, [households, residents]);

  const infrastructure = useMemo(() => {
      if (!assets) return { cctv: [], hydrants: [], evac: [] };
      return {
          cctv: assets.filter(a => a.name.toLowerCase().includes('cctv') || (a.type === 'Equipment' && a.name.toLowerCase().includes('camera'))),
          hydrants: assets.filter(a => a.name.toLowerCase().includes('hydrant') || a.name.toLowerCase().includes('water')),
          evac: assets.filter(a => a.name.toLowerCase().includes('evac') || a.type === 'Facility' || a.name.toLowerCase().includes('center')),
      };
  }, [assets]);

  // -- HANDLERS --
  const handleUpdateHazard = async (id: string, status: string) => {
      if (!tenantPath || !firestore) return;
      const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
      const docRef = doc(firestore, `${safePath}/hazard_monitoring_points`, id);
      await updateDoc(docRef, { 
          status, 
          last_updated_by: user?.uid,
          timestamp: serverTimestamp()
      });
  };

  const handleAlertSelect = (id: string) => {
      setSelectedAlertId(id === selectedAlertId ? null : id); 
      if (id !== selectedAlertId) setRoute(null); 
      if (!isPanelOpen) setIsPanelOpen(true);
  };

  const handleToggleLayer = (key: keyof LayerState, value?: any) => {
      setLayerState(prev => ({
          ...prev,
          [key]: value !== undefined ? value : !prev[key]
      }));
  };

  const handleLocationSearch = (lat: number, lng: number, label?: string, householdId?: string) => {
      setSearchedLocation({ lat, lng });
      setRoute(null);
      if (householdId) setHighlightedHouseholdId(householdId);
      else setHighlightedHouseholdId(null);
  };
  
  const handleScanArea = (bounds: any) => {
      setIsScanning(false);
      if (!mapHouseholds || !residents) return;
      const inside = mapHouseholds.filter(h => {
          if (!h.latitude || !h.longitude) return false;
          const lat = h.latitude;
          const lng = h.longitude;
          const southWest = bounds.getSouthWest();
          const northEast = bounds.getNorthEast();
          return lat >= southWest.lat && lat <= northEast.lat &&
                 lng >= southWest.lng && lng <= northEast.lng;
      });
      const totalPop = inside.reduce((sum, h) => sum + (h.count || 0), 0);
      let seniorCount = 0, pwdCount = 0, childrenCount = 0;
      const hhIds = new Set(inside.map(h => h.householdId));
      residents.forEach(r => {
          if (r.householdId && hhIds.has(r.householdId)) {
              const age = r.dateOfBirth ? new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear() : 0;
              if (age >= 60) seniorCount++;
              if (r.isPwd) pwdCount++;
              if (age <= 12) childrenCount++;
          }
      });
      setScanResult({ hhCount: inside.length, population: totalPop, seniors: seniorCount, pwds: pwdCount, children: childrenCount });
  };

  useEffect(() => {
      const timer = setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 350); 
      return () => clearTimeout(timer);
  }, [isPanelOpen]);

  const handleUpdateResident = async (data: any) => {
      if (data.residentId) {
          await updateResident(data.residentId, data);
          setIsResidentFullEditOpen(false);
          setIsResidentQuickViewOpen(false);
      }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden text-zinc-200 font-sans">
        <header className="h-14 shrink-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between px-6 z-30 shadow-sm">
            <div className="flex items-center gap-6">
                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                    <Link href="/dashboard" title="Back to Dashboard"><LayoutGrid className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-3">
                    {profile?.logoUrl ? (
                        <img src={profile.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded-md shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                    ) : (
                        <div className="h-8 w-8 rounded bg-red-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(220,38,38,0.4)]">911</div>
                    )}
                    <div>
                        <h1 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">{profile?.name || "Incident Command"}</h1>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase flex items-center gap-2">
                            <span>Sector A</span><span className="text-zinc-700">|</span><span className="text-emerald-500">Online</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-8">
                 <WeatherHeader />
                 <div className="h-4 w-[1px] bg-zinc-800" />
                 <div className="text-right">
                    <div className="text-xs font-mono text-zinc-300">{new Date().toLocaleTimeString()}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{new Date().toLocaleDateString()}</div>
                 </div>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 relative z-0 bg-zinc-900 border-r border-zinc-800 transition-all duration-300">
                <EmergencyMap 
                    alerts={activeAlerts}
                    responders={responders}
                    households={mapHouseholds}
                    residents={residents || []}
                    hazardPoints={hazardPoints || []}
                    infrastructure={infrastructure}
                    layers={layerState}
                    selectedAlertId={selectedAlertId}
                    route={route} 
                    searchedLocation={searchedLocation}
                    highlightedHouseholdId={highlightedHouseholdId} 
                    onSelectAlert={setSelectedAlertId} 
                    onUpdateHazard={handleUpdateHazard}
                    settings={profile}
                    scanMode={isScanning}
                    onScanArea={handleScanArea}
                    onSelectResident={handleSelectResidentFromMap}
                />
                <MapSearchBar residents={residents || []} assets={assets || []} households={mapHouseholds || []} onSelectLocation={handleLocationSearch} />
                <div className="absolute top-[72px] left-4 z-[400] transition-all duration-500">
                    <MapLayerControl layers={layerState} toggleLayer={handleToggleLayer} />
                </div>
                <div className="absolute top-4 z-[400] transition-all duration-500 left-1/2 -translate-x-1/2">
                    <Button variant={isScanning ? "default" : "secondary"} className={cn("w-48 justify-center gap-2 shadow-lg backdrop-blur-md transition-all", isScanning ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-800")} onClick={() => setIsScanning(!isScanning)}>
                        <Scan className="h-4 w-4" />{isScanning ? "Draw Box..." : "Scan Area"}
                    </Button>
                </div>
                <Button variant="secondary" size="icon" className="absolute top-1/2 right-0 -translate-y-1/2 z-[500] rounded-r-none rounded-l-md border border-r-0 border-zinc-700 h-16 w-5 bg-zinc-950/80 backdrop-blur text-zinc-400 hover:text-white hover:bg-zinc-900 hover:w-6 transition-all" onClick={() => setIsPanelOpen(!isPanelOpen)}>
                    {isPanelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>
            <div className={cn("bg-zinc-950 border-l border-zinc-800 flex flex-col z-20 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden", isPanelOpen ? "w-[400px] min-w-[400px]" : "w-0 min-w-0 border-l-0")}>
                <OperationsPanel alerts={activeAlerts} users={users || []} responders={responders || []} assets={assets || []} households={households || []} onAlertSelect={handleAlertSelect} selectedAlertId={selectedAlertId} onRouteCalculated={setRoute} settings={profile} />
            </div>
        </div>

        {/* SCAN RESULT MODAL */}
        <Dialog open={!!scanResult} onOpenChange={(o) => !o && setScanResult(null)}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Scan className="h-5 w-5 text-blue-500" />Demographic Scan</DialogTitle>
                    <DialogDescription className="text-zinc-400">Analysis of the selected area.</DialogDescription>
                </DialogHeader>
                {scanResult && (
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-zinc-950 border-zinc-800"><CardContent className="p-4 flex flex-col items-center justify-center text-center"><div className="text-2xl font-bold text-white">{scanResult.hhCount}</div><div className="text-xs text-zinc-500 uppercase tracking-wider">Households</div></CardContent></Card>
                            <Card className="bg-zinc-950 border-zinc-800"><CardContent className="p-4 flex flex-col items-center justify-center text-center"><div className="text-2xl font-bold text-white">{scanResult.population}</div><div className="text-xs text-zinc-500 uppercase tracking-wider">Population</div></CardContent></Card>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 rounded bg-zinc-800/50"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-purple-400" /><span className="text-sm">Senior Citizens</span></div><span className="font-bold">{scanResult.seniors}</span></div>
                            <div className="flex items-center justify-between p-2 rounded bg-zinc-800/50"><div className="flex items-center gap-2"><Accessibility className="h-4 w-4 text-cyan-400" /><span className="text-sm">PWDs</span></div><span className="font-bold">{scanResult.pwds}</span></div>
                            <div className="flex items-center justify-between p-2 rounded bg-zinc-800/50"><div className="flex items-center gap-2"><Baby className="h-4 w-4 text-emerald-400" /><span className="text-sm">Children (0-12)</span></div><span className="font-bold">{scanResult.children}</span></div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        {/* RESIDENT QUICK VIEW MODAL */}
        {selectedResident && (
            <Dialog open={isResidentQuickViewOpen} onOpenChange={setIsResidentQuickViewOpen}>
                <DialogContent className="max-w-md bg-white p-0 overflow-hidden shadow-2xl border-none">
                    <ResidentQuickView resident={selectedResident} onEdit={handleOpenFullEdit} onClose={() => setIsResidentQuickViewOpen(false)} />
                </DialogContent>
            </Dialog>
        )}

        {/* RESIDENT FULL EDIT MODAL */}
        {selectedResident && (
             <Dialog open={isResidentFullEditOpen} onOpenChange={setIsResidentFullEditOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden text-zinc-900 border-none">
                    <div className="h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-zinc-200 shrink-0">
                            <h2 className="text-xl font-black uppercase tracking-tight">Edit Resident Profile</h2>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-1">Full administrative access for {selectedResident.firstName} {selectedResident.lastName}.</p>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ResidentEditorContent record={selectedResident} onSave={handleUpdateResident} onClose={() => setIsResidentFullEditOpen(false)} households={households || []} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )}
    </div>
  );
}
