'use client';

import React from 'react';
import { EmergencyAlert, User, ResponderLocation } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Radio, MapPin, Clock, Ambulance } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';

interface OperationsPanelProps {
  alerts: EmergencyAlert[];
  responders: ResponderLocation[]; 
  users: User[];
  onAlertSelect: (alertId: string, location?: { lat: number; lng: number }) => void;
  selectedAlertId: string | null;
}

export function OperationsPanel({ 
  alerts, 
  responders, 
  users, 
  onAlertSelect,
  selectedAlertId 
}: OperationsPanelProps) {

  // Helper to format timestamp safely
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '--:--';
    // Handle Firestore Timestamp or JS Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    try {
        return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
        return 'Invalid Date';
    }
  };

  return (
    <div className="w-96 h-full flex flex-col border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl z-20">
      
      {/* Panel Header */}
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
                Incidents <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{alerts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-xs uppercase data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-400">
                Fleet Status
            </TabsTrigger>
            </TabsList>
        </div>

        {/* INCIDENTS TAB */}
        <TabsContent value="incidents" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-10 text-zinc-600 text-sm">
                  <div className="inline-block p-3 rounded-full bg-zinc-900 mb-3"><Radio className="w-5 h-5" /></div>
                  <p>No Active Alerts</p>
                  <p className="text-xs mt-1">Monitoring channels...</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <Card 
                    key={alert.id}
                    onClick={() => onAlertSelect(alert.id, alert.location ? { lat: alert.latitude, lng: alert.longitude } : undefined)}
                    className={cn(
                      "p-3 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all cursor-pointer group relative overflow-hidden",
                      selectedAlertId === alert.id ? "border-red-500/50 bg-red-950/10 ring-1 ring-red-500/20" : ""
                    )}
                  >
                    {/* Status Indicator Bar */}
                    <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        alert.status === 'New' ? "bg-red-500 animate-pulse" : "bg-orange-500"
                    )} />

                    <div className="pl-3">
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-mono tracking-wider border-0",
                                alert.status === 'New' ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"
                            )}>
                                {alert.status}
                            </Badge>
                            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(alert.timestamp)}
                            </span>
                        </div>

                        <h3 className="font-semibold text-zinc-200 text-sm mb-1 group-hover:text-white transition-colors">
                            {alert.residentName || "Unknown Resident"}
                        </h3>
                        
                        <div className="flex items-center text-xs text-zinc-500 font-mono gap-1">
                            <MapPin className="w-3 h-3" />
                            {alert.latitude && alert.longitude ? 
                                `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}` : 
                                "No GPS Data"
                            }
                        </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ASSETS TAB */}
        <TabsContent value="assets" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                    {users?.filter(u => u.systemRole === 'Responder' || u.systemRole === 'Admin').map((user) => {
                        // Attempt to find realtime location/status data for this user
                        const responderLoc = responders.find(r => r.userId === user.userId || r.id === user.userId);
                        const isOnline = responderLoc ? responderLoc.status !== 'Offline' : false; 
                        
                        return (
                            <div key={user.userId} className="flex items-center justify-between p-3 rounded-md border border-zinc-800 bg-zinc-900/30">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-8 w-8 rounded flex items-center justify-center border",
                                        isOnline ? "bg-blue-900/30 text-blue-400 border-blue-800/50" : "bg-zinc-800/30 text-zinc-600 border-zinc-800"
                                    )}>
                                        <Ambulance className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-zinc-200">{user.fullName || user.email}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase font-mono">{user.systemRole}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className={cn(
                                        "text-[10px]",
                                        isOnline ? "border-emerald-900 bg-emerald-950 text-emerald-500" : "border-zinc-800 bg-zinc-900 text-zinc-600"
                                    )}>
                                        {responderLoc?.status || 'Offline'}
                                    </Badge>
                                </div>
                            </div>
                        )
                    })}
                    {(!users || users.length === 0) && (
                         <div className="text-center py-10 text-zinc-600 text-sm">
                            <p>No Fleet Data</p>
                         </div>
                    )}
                </div>
            </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
