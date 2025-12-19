
'use client';

import { useState, useMemo, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/firebase/provider";
import { useDoc } from "@/firebase/firestore/use-doc";
import { User, ResponderLocation } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Shield, Circle, Clock, Siren, Search, Filter, Radio, UserPlus, FilePen } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { officialsAndStaff } from "@/lib/data";
import { AddOfficial, EditOfficial, OfficialFormValues } from "@/app/dashboard/settings/officials-management/officials-actions";
import { systemRoles } from "@/app/dashboard/settings/officials-management/_data"; // Updated import to use dynamic roles
import { saveOfficials } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { ROLES, SystemRole } from "@/lib/config/roles";
import { useTenant } from "@/providers/tenant-provider";

// Roles that are considered "Responders" - Keep in sync with sidebar-lists.tsx
const RESPONDER_POSITIONS = [
    'Barangay Tanod (BPSO - Barangay Public Safety Officer)',
    'Chief Tanod (Executive Officer)',
    'Lupon Member (Pangkat Tagapagkasundo)',
    'Driver / Ambulance Operator',
    'VAWC Desk Officer',
    'Barangay Health Worker (BHW)',
    'Eco-Aide / Street Sweeper',
    'Utility Worker'
];

// Helper to determine status color
const getStatusColor = (status: string) => {
  switch (status) {
    case "On Duty": return "bg-green-500";
    case "Busy": return "bg-amber-500";
    case "Offline": return "bg-slate-400";
    case "Dispatched": return "bg-red-500 animate-pulse";
    case "Active": return "bg-green-500"; 
    default: return "bg-slate-400";
  }
};

export default function RespondersPage() {
  const firestore = useFirestore();
  const { user } = useAuth();
  const { toast } = useToast();
  const { tenantId } = useTenant(); // Use robust tenantId from context
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 1. Fetch Users Scoped to Tenant
  const usersRef = useMemoFirebase(
    () => (firestore ? collection(firestore, "users") : null),
    [firestore]
  );
  
  const usersQuery = useMemoFirebase(
    () => {
        if (!usersRef || !tenantId) return null;
        // Query users where tenantId matches the current session
        return query(usersRef, where("tenantId", "==", tenantId));
    },
    [tenantId, usersRef]
  );
  
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  // 3. Filter for Responders
  const responders = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => {
        const position = u.position || '';
        const systemRole = (u.systemRole || '').toLowerCase();

        // 1. Check System Role
        const isSystemResponder = ['responder', 'admin', 'health_worker'].includes(systemRole);

        // 2. Check Position (Predefined List)
        const isPredefinedPosition = RESPONDER_POSITIONS.includes(position);

        // 3. Check Keywords
        const positionLower = position.toLowerCase();
        const hasResponderKeyword = positionLower.includes('tanod') || 
                                    positionLower.includes('bpso') ||
                                    positionLower.includes('driver') ||
                                    positionLower.includes('ambulance') ||
                                    positionLower.includes('health') ||
                                    positionLower.includes('bhw');

        return isSystemResponder || isPredefinedPosition || hasResponderKeyword;
    });
  }, [allUsers]);

  const filteredResponders = useMemo(() => {
    return responders.filter(responder => {
      const matchesSearch = responder.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            responder.position.toLowerCase().includes(searchTerm.toLowerCase());
      
      const displayStatus = responder.status === 'Active' ? 'On Duty' : responder.status || 'Offline';
      const matchesStatus = statusFilter === "all" ? true : 
                            (statusFilter === 'Active' ? displayStatus === 'On Duty' : displayStatus === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [responders, searchTerm, statusFilter]);

  // Handlers for Add/Edit
  const handleAddResponder = async (data: OfficialFormValues) => {
    // We re-use the saveOfficials action but adapted for a single entry
    try {
        const result = await saveOfficials([{ name: data.fullName, role: data.position }]); 
        
        if (firestore && tenantId) {
             toast({ title: "Responder Added", description: "The responder has been added successfully." });
        }
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to add responder." });
    }
  };

  const handleEditResponder = async (updatedData: User) => {
      if (firestore) {
          try {
              const userDocRef = doc(firestore, "users", updatedData.userId);
              await updateDoc(userDocRef, {
                  ...updatedData
              });
              toast({ title: "Updated", description: "Responder details updated." });
          } catch (e) {
              toast({ variant: "destructive", title: "Error", description: "Failed to update responder." });
          }
      }
  };


  if (!tenantId) return <div className="p-8"><Skeleton className="h-8 w-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Responder Management</h2>
          <p className="text-muted-foreground">Monitor availability, manage shifts, and dispatch status.</p>
        </div>
        <div className="flex items-center gap-2">
            {/* Re-using the AddOfficial component from settings but passing responder-specific roles */}
            <AddOfficial 
                onAdd={handleAddResponder} 
                positions={RESPONDER_POSITIONS} 
                committees={[]} 
                systemRoles={systemRoles} // Use the imported dynamic roles
            />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* KPI Cards (Same as before) */}
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Responders</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{responders.length}</div></CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">On Duty / Active</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{responders.filter(r => r.status === 'Active' || r.status === 'On Duty').length}</div></CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Dispatched / Busy</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-600">{responders.filter(r => r.status === 'Busy').length}</div></CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Offline / Inactive</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-slate-500">{responders.filter(r => r.status !== 'Active' && r.status !== 'Busy' && r.status !== 'On Duty').length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Personnel List</CardTitle>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search name or position..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Active">On Duty</SelectItem>
                            <SelectItem value="Busy">Busy</SelectItem>
                            <SelectItem value="Inactive">Offline</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <CardDescription>
                Manage shift status and view details of your response team.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingUsers ? (
                <div className="space-y-4">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
            ) : filteredResponders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Radio className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No responders found.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredResponders.map((responder) => (
                        <Card key={responder.userId} className="overflow-hidden group relative">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <EditOfficial 
                                    record={responder} 
                                    onEdit={handleEditResponder}
                                    positions={RESPONDER_POSITIONS}
                                    committees={[]}
                                    systemRoles={systemRoles}
                                />
                            </div>
                            <div className="p-4 flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-12 w-12 border-2 border-background">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${responder.fullName}`} />
                                        <AvatarFallback>{responder.fullName ? responder.fullName.substring(0,2).toUpperCase() : 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold">{responder.fullName}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                            {/* Show Position, or fallback to System Role Label */}
                                            {responder.position || (ROLES[responder.systemRole as SystemRole]?.label || responder.systemRole)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="secondary" className="text-[10px] px-1.5 h-5 gap-1">
                                                <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(responder.status === 'Active' ? 'On Duty' : responder.status)}`} />
                                                {responder.status === 'Active' ? 'On Duty' : (responder.status || 'Offline')}
                                            </Badge>
                                             {/* Quick Status Toggle (Mock) */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 p-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>Last active: {responder.createdAt ? formatDistanceToNow(new Date(), { addSuffix: true }) : 'N/A'}</span>
                                </div>
                                <div className="flex gap-2">
                                     {/* We can add quick action buttons here later */}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
