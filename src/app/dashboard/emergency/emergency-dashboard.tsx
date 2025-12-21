'use client';

import { useMemo, useState } from "react";
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { EmergencyAlert, User } from "@/lib/types";
import { useEmergencyAlerts, useResponderLocations } from '@/hooks/use-barangay-data';
import dynamic from 'next/dynamic';
import { Loader2 } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { useTenant } from "@/providers/tenant-provider";
import { useTenantProfile } from "@/hooks/use-tenant-profile";

// Refactored Components
import { WeatherHeader } from "./components/weather-header";
import { OperationsPanel } from "./components/operations-panel"; // Import the new panel

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

  // -- DATA HOOKS (Existing Logic Preserved) --
  const { data: allAlerts, isLoading: isLoadingAlerts } = useEmergencyAlerts();
  const { data: responders } = useResponderLocations();

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

  // -- HANDLERS --
  const handleAlertSelect = (id: string, location?: {lat: number, lng: number}) => {
      setSelectedAlertId(id);
      // Map component will react to the prop change
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden text-zinc-200">
        
        {/* 1. TOP COMMAND BAR (HUD Header) */}
        <header className="h-14 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 z-30">
            <div className="flex items-center gap-4">
                {/* Logo / Branding */}
                <div className="flex items-center gap-3">
                     {/* Use existing profile logo or fallback */}
                    <div className="h-8 w-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                        SOS
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
                            {profile?.name || "Command Center"}
                        </h1>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                            Live Situational Awareness
                        </div>
                    </div>
                </div>
            </div>

            {/* Weather & System Status */}
            <div className="flex items-center gap-6">
                 <WeatherHeader />
                 <div className="h-4 w-[1px] bg-zinc-800" />
                 <div className="text-[10px] font-mono text-zinc-500">
                    V.2.4.0 <span className="text-emerald-500">STABLE</span>
                 </div>
            </div>
        </header>

        {/* 2. MAIN LAYOUT (Split View) */}
        <div className="flex-1 flex overflow-hidden relative">
            
            {/* LEFT: MAP CANVAS */}
            <div className="flex-1 relative z-0 bg-zinc-900">
                <EmergencyMap 
                    alerts={activeAlerts}
                    responders={responders}
                    selectedAlertId={selectedAlertId}
                    onSelectAlert={setSelectedAlertId} 
                    settings={profile}
                />
                
                {/* Overlay: Current Selection Info (Floating HUD Element) */}
                {selectedAlertId && (
                    <div className="absolute top-4 left-4 z-[400] bg-zinc-950/90 backdrop-blur border border-zinc-800 p-4 rounded-lg shadow-xl w-64 animate-in fade-in slide-in-from-top-2">
                         <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Target Locked</div>
                         <div className="font-mono text-emerald-400 text-sm">
                            {activeAlerts.find(a => a.id === selectedAlertId)?.residentName || "Unknown Target"}
                         </div>
                    </div>
                )}
            </div>

            {/* RIGHT: OPERATIONS PANEL */}
            <OperationsPanel 
                alerts={activeAlerts} 
                users={users || []}
                responders={responders || []}
                onAlertSelect={handleAlertSelect}
                selectedAlertId={selectedAlertId}
            />

        </div>
    </div>
  );
}
