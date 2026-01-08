'use client';

import { useMemo, useState, useEffect } from "react";
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { EmergencyAlert, User } from "@/lib/types";
import { useEmergencyAlerts, useResponderLocations, useHouseholds, useResidents } from '@/hooks/use-barangay-data';
import { useFixedAssets } from '@/hooks/use-assets';
import dynamic from 'next/dynamic';
import { Loader2, LayoutGrid, ChevronRight, ChevronLeft, Scan, Users, Accessibility, Baby, Activity } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
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
import { Card, CardContent } from "@/components/ui/card";

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

export function EmergencyDashboard() {
  const { tenantId } = useTenant();
  const firestore = useFirestore();
  const { profile } = useTenantProfile();
  
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
  
  // Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // -- DATA HOOKS --
  const { data: allAlerts, isLoading: isLoadingAlerts } = useEmergencyAlerts();
  const { data: responders } = useResponderLocations();
  const { data: assets } = useFixedAssets();
  const { data: households } = useHouseholds();
  const { data: residents } = useResidents();

  // Fetch all users for the responder list logic
  const usersQuery = useMemoFirebase(() => {
    if (!tenantId || !firestore) return null;
    return query(collection(firestore, 'users'), where('tenantId', '==', tenantId));
  }, [tenantId, firestore]);
  
  const { data: users } = useCollection<User>(usersQuery);

  // Filter for active alerts only
  const activeAlerts = useMemo(() => {
      return allAlerts?.filter(a => ['New', 'Acknowledged', 'Dispatched', 'On Scene'].includes(a.status)) ?? [];
  }, [allAlerts]);

  // -- COMPUTED DEMOGRAPHICS --
  const mapHouseholds = useMemo(() => {
      if (!households || !residents) return [];
      
      const vulnMap = new Map<string, { isSenior: boolean, isPwd: boolean, is4Ps: boolean, count: number }>();
      
      residents.forEach(r => {
          if (!r.householdId) return;
          const current = vulnMap.get(r.householdId) || { isSenior: false, isPwd: false, is4Ps: false, count: 0 };
          
          const age = r.dateOfBirth ? new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear() : 0;
          
          if (age >= 60) current.isSenior = true;
          if (r.isPwd) current.isPwd = true;
          if (r.is4ps) current.is4Ps = true;
          current.count++;
          
          vulnMap.set(r.householdId, current);
      });

      return households.map(h => {
          const stats = vulnMap.get(h.householdId) || { isSenior: false, isPwd: false, is4Ps: false, count: 0 };
          
          let riskCategory = 'Standard';
          if (stats.isPwd) riskCategory = 'PWD';
          else if (stats.isSenior) riskCategory = 'Senior';
          else if (stats.is4Ps) riskCategory = '4Ps';

          return {
              ...h,
              ...stats,
              riskCategory
          };
      });
  }, [households, residents]);

  // -- INFRASTRUCTURE FILTERS --
  const infrastructure = useMemo(() => {
      if (!assets) return { cctv: [], hydrants: [], evac: [] };
      return {
          cctv: assets.filter(a => a.name.toLowerCase().includes('cctv') || (a.type === 'Equipment' && a.name.toLowerCase().includes('camera'))),
          hydrants: assets.filter(a => a.name.toLowerCase().includes('hydrant') || a.name.toLowerCase().includes('water')),
          evac: assets.filter(a => a.name.toLowerCase().includes('evac') || a.type === 'Facility' || a.name.toLowerCase().includes('center')),
      };
  }, [assets]);

  // -- HANDLERS --
  const handleAlertSelect = (id: string, location?: {lat: number, lng: number}) => {
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
      
      if (householdId) {
          setHighlightedHouseholdId(householdId);
      } else {
          setHighlightedHouseholdId(null);
      }
  };
  
  const handleScanArea = (bounds: any) => {
      setIsScanning(false);
      if (!mapHouseholds) return;

      // Filter households inside bounds
      const inside = mapHouseholds.filter(h => {
          if (!h.latitude || !h.longitude) return false;
          // Leaflet bounds has contains method, but passing strict types is hard with dynamic import
          // Manual check:
          const lat = h.latitude;
          const lng = h.longitude;
          const southWest = bounds.getSouthWest();
          const northEast = bounds.getNorthEast();
          return lat >= southWest.lat && lat <= northEast.lat &&
                 lng >= southWest.lng && lng <= northEast.lng;
      });

      // Aggregate
      const totalPop = inside.reduce((sum, h) => sum + (h.count || 0), 0);
      const seniors = inside.filter(h => h.isSenior).length; // Households with seniors, strictly counting households? Or residents? 
      // Current mapHouseholds aggregates bools. To get total seniors count, I need residents.
      // But mapHouseholds only has bool flags. Let's re-scan residents for better accuracy.
      
      let seniorCount = 0;
      let pwdCount = 0;
      let childrenCount = 0;
      
      if (residents) {
          const hhIds = new Set(inside.map(h => h.householdId));
          residents.forEach(r => {
              if (r.householdId && hhIds.has(r.householdId)) {
                  const age = r.dateOfBirth ? new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear() : 0;
                  if (age >= 60) seniorCount++;
                  if (r.isPwd) pwdCount++;
                  if (age <= 12) childrenCount++;
              }
          });
      }

      setScanResult({ 
          hhCount: inside.length, 
          population: totalPop, 
          seniors: seniorCount,
          pwds: pwdCount,
          children: childrenCount
      });
  };

  // Force map resize
  useEffect(() => {
      const timer = setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
      }, 350); 
      return () => clearTimeout(timer);
  }, [isPanelOpen]);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden text-zinc-200 font-sans">
        
        {/* 1. TOP COMMAND BAR */}
        <header className="h-14 shrink-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between px-6 z-30 shadow-sm">
            <div className="flex items-center gap-6">
                
                {/* Back to Dashboard */}
                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                    <Link href="/dashboard" title="Back to Dashboard">
                        <LayoutGrid className="h-4 w-4" />
                    </Link>
                </Button>

                {/* Logo */}
                <div className="flex items-center gap-3">
                    {profile?.logoUrl ? (
                        <img 
                            src={profile.logoUrl} 
                            alt="Logo" 
                            className="h-8 w-8 object-contain rounded-md shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                        />
                    ) : (
                        <div className="h-8 w-8 rounded bg-red-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse-slow">
                            911
                        </div>
                    )}
                    <div>
                        <h1 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
                            {profile?.name || "Incident Command"}
                        </h1>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase flex items-center gap-2">
                            <span>Sector A</span>
                            <span className="text-zinc-700">|</span>
                            <span className="text-emerald-500">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weather & Clock */}
            <div className="flex items-center gap-8">
                 <WeatherHeader />
                 <div className="h-4 w-[1px] bg-zinc-800" />
                 <div className="text-right">
                    <div className="text-xs font-mono text-zinc-300">{new Date().toLocaleTimeString()}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{new Date().toLocaleDateString()}</div>
                 </div>
            </div>
        </header>

        {/* 2. MAIN LAYOUT */}
        <div className="flex-1 flex overflow-hidden relative">
            
            {/* LEFT: MAP CANVAS */}
            <div className="flex-1 relative z-0 bg-zinc-900 border-r border-zinc-800 transition-all duration-300">
                <EmergencyMap 
                    alerts={activeAlerts}
                    responders={responders}
                    households={mapHouseholds}
                    infrastructure={infrastructure}
                    layers={layerState}
                    selectedAlertId={selectedAlertId}
                    route={route} 
                    searchedLocation={searchedLocation}
                    highlightedHouseholdId={highlightedHouseholdId} 
                    onSelectAlert={setSelectedAlertId} 
                    settings={profile}
                    scanMode={isScanning}
                    onScanArea={handleScanArea}
                />
                
                {/* Two-Column Search Bar (Top Left) */}
                <MapSearchBar 
                    residents={residents || []} 
                    assets={assets || []} 
                    households={mapHouseholds || []}
                    onSelectLocation={handleLocationSearch}
                />
                
                {/* Layer Controls - Separated and moved to Left below Search Bar */}
                <div className="absolute top-[72px] left-4 z-[400] transition-all duration-500">
                    <MapLayerControl layers={layerState} toggleLayer={handleToggleLayer} />
                </div>
                
                {/* SCAN BUTTON - Centered */}
                <div className={cn(
                    "absolute top-4 z-[400] transition-all duration-500 left-1/2 -translate-x-1/2"
                )}>
                    <Button 
                        variant={isScanning ? "default" : "secondary"}
                        className={cn(
                            "w-48 justify-center gap-2 shadow-lg backdrop-blur-md transition-all",
                            isScanning ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-800"
                        )}
                        onClick={() => setIsScanning(!isScanning)}
                    >
                        <Scan className="h-4 w-4" />
                        {isScanning ? "Draw Box..." : "Scan Area"}
                    </Button>
                </div>

                {/* Panel Toggle Button */}
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/2 right-0 -translate-y-1/2 z-[500] rounded-r-none rounded-l-md border border-r-0 border-zinc-700 h-16 w-5 bg-zinc-950/80 backdrop-blur text-zinc-400 hover:text-white hover:bg-zinc-900 hover:w-6 transition-all"
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    title={isPanelOpen ? "Collapse Panel" : "Expand Panel"}
                >
                    {isPanelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* RIGHT: OPERATIONS PANEL */}
            <div className={cn(
                "bg-zinc-950 border-l border-zinc-800 flex flex-col z-20 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden",
                isPanelOpen ? "w-[400px] min-w-[400px]" : "w-0 min-w-0 border-l-0"
            )}>
                <OperationsPanel 
                    alerts={activeAlerts} 
                    users={users || []}
                    responders={responders || []}
                    assets={assets || []}
                    households={households || []} 
                    onAlertSelect={handleAlertSelect}
                    selectedAlertId={selectedAlertId}
                    onRouteCalculated={setRoute} 
                    settings={profile} 
                />
            </div>

        </div>

        {/* SCAN RESULT MODAL */}
        <Dialog open={!!scanResult} onOpenChange={(o) => !o && setScanResult(null)}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scan className="h-5 w-5 text-blue-500" />
                        Demographic Scan
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Analysis of the selected area.
                    </DialogDescription>
                </DialogHeader>
                
                {scanResult && (
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-zinc-950 border-zinc-800">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="text-2xl font-bold text-white">{scanResult.hhCount}</div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Households</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-950 border-zinc-800">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="text-2xl font-bold text-white">{scanResult.population}</div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Population</div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 rounded bg-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-purple-400" />
                                    <span className="text-sm">Senior Citizens</span>
                                </div>
                                <span className="font-bold">{scanResult.seniors}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <Accessibility className="h-4 w-4 text-cyan-400" />
                                    <span className="text-sm">PWDs</span>
                                </div>
                                <span className="font-bold">{scanResult.pwds}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <Baby className="h-4 w-4 text-emerald-400" />
                                    <span className="text-sm">Children (0-12)</span>
                                </div>
                                <span className="font-bold">{scanResult.children}</span>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
