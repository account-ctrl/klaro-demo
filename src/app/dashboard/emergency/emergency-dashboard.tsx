
'use client';

import { useMemo, useState } from "react";
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { EmergencyAlert, User } from "@/lib/types";
import { useEmergencyAlerts, useResponderLocations } from '@/hooks/use-barangay-data';
import dynamic from 'next/dynamic';
import { Loader2 } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { useTenant } from "@/providers/tenant-provider";

// Simplified Sidebar Components
import { ResponderStatusList, AssetList, ActiveAlertFeed } from "./components/sidebar-lists";
import { WeatherHeader } from "./components/weather-header";

const EmergencyMap = dynamic(() => import('@/components/emergency-map'), { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-500">Loading Map Engine...</div>
});

export function EmergencyDashboard() {
  const { tenantId } = useTenant();
  const firestore = useFirestore();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const { data: allAlerts, isLoading: isLoadingAlerts } = useEmergencyAlerts();
  const { data: responders } = useResponderLocations();

  // Fetch all users for the responder list
  const usersQuery = useMemoFirebase(() => {
    if (!tenantId || !firestore) return null;
    return query(collection(firestore, 'users'), where('tenantId', '==', tenantId));
  }, [tenantId, firestore]);
  
  const { data: users } = useCollection<User>(usersQuery);

  const alerts = useMemo(() => {
      return allAlerts?.filter(a => ['New', 'Acknowledged', 'Dispatched', 'On Scene'].includes(a.status)) ?? [];
  }, [allAlerts]);

  const handleAlertSelect = (id: string) => {
      setSelectedAlertId(id);
  };

  if (isLoadingAlerts) {
      return (
          <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-white">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin h-10 w-10 text-red-500" />
                  <p className="text-zinc-400 font-medium">Initializing Command Center...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-white">
        {/* Map Layer */}
        <div className="absolute inset-0 z-0">
            <EmergencyMap 
                alerts={alerts}
                responders={responders}
                selectedAlertId={selectedAlertId}
                onSelectAlert={handleAlertSelect}
            />
            <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/40 via-transparent to-black/40"></div>
        </div>
        
        {/* UI Overlays */}
        <div className="absolute top-6 left-6 z-10 pointer-events-none">
             <div className="pointer-events-auto">
                 <WeatherHeader />
             </div>
        </div>

        <div className="absolute right-6 top-6 bottom-6 z-10 flex flex-col gap-4 w-96 pointer-events-none">
            <div className="pointer-events-auto flex-1 overflow-hidden flex flex-col gap-4">
                <ActiveAlertFeed 
                    alerts={alerts} 
                    onSelectAlert={handleAlertSelect}
                    selectedAlertId={selectedAlertId}
                />
                <ResponderStatusList responders={users || []} />
                <AssetList />
            </div>
        </div>
    </div>
  );
}
