'use client';

import { useMemo, useState } from "react";
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { EmergencyAlert, User } from "@/lib/types";
import { useEmergencyAlerts, useResponderLocations, useHouseholds, useResidents } from '@/hooks/use-barangay-data';
import { useFixedAssets } from '@/hooks/use-assets';
import dynamic from 'next/dynamic';
import { Loader2 } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { useTenant } from "@/providers/tenant-provider";
import { useTenantProfile } from "@/hooks/use-tenant-profile";

// Refactored Components
import { WeatherHeader } from "./components/weather-header";
import { OperationsPanel } from "./components/operations-panel"; 
import { MapLayerControl, LayerState } from "./components/map-layer-control";

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
  const [layerState, setLayerState] = useState<LayerState>({
      showCCTV: false,
      showHydrants: false,
      showEvac: false,
      demographicLayer: 'none'
  });

  // -- DATA HOOKS --
  const { data: allAlerts, isLoading: isLoadingAlerts } = useEmergencyAlerts();
  const { data: responders } = useResponderLocations();
  const { data: assets } = useFixedAssets();
  const { data: households } = useHouseholds();
  const { data: residents } = useResidents();

  // Fetch all users for the responder list logic (to get names/roles)
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
  };

  const handleToggleLayer = (key: keyof LayerState, value?: any) => {
      setLayerState(prev => ({
          ...prev,
          [key]: value !== undefined ? value : !prev[key]
      }));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden text-zinc-200 font-sans">
        
        {/* 1. TOP COMMAND BAR (HUD Header) */}
        <header className="h-14 shrink-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between px-6 z-30 shadow-sm">
            <div className="flex items-center gap-6">
                {/* Logo / Branding */}
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-red-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse-slow">
                        911
                    </div>
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

            {/* Weather & System Status */}
            <div className="flex items-center gap-8">
                 <WeatherHeader />
                 <div className="h-4 w-[1px] bg-zinc-800" />
                 <div className="text-right">
                    <div className="text-xs font-mono text-zinc-300">{new Date().toLocaleTimeString()}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{new Date().toLocaleDateString()}</div>
                 </div>
            </div>
        </header>

        {/* 2. MAIN LAYOUT (Docked View) */}
        <div className="flex-1 flex overflow-hidden relative">
            
            {/* LEFT: MAP CANVAS (Flex-1) */}
            <div className="flex-1 relative z-0 bg-zinc-900 border-r border-zinc-800">
                <EmergencyMap 
                    alerts={activeAlerts}
                    responders={responders}
                    households={mapHouseholds}
                    infrastructure={infrastructure}
                    layers={layerState}
                    selectedAlertId={selectedAlertId}
                    onSelectAlert={setSelectedAlertId} 
                    settings={profile}
                />
                <MapLayerControl layers={layerState} toggleLayer={handleToggleLayer} />
            </div>

            {/* RIGHT: OPERATIONS PANEL (Fixed Width) */}
            <div className="w-[400px] bg-zinc-950 border-l border-zinc-800 flex flex-col z-20 shadow-2xl">
                <OperationsPanel 
                    alerts={activeAlerts} 
                    users={users || []}
                    responders={responders || []}
                    assets={assets || []}
                    households={households || []} 
                    onAlertSelect={handleAlertSelect}
                    selectedAlertId={selectedAlertId}
                />
            </div>

        </div>
    </div>
  );
}
