'use client';

import { useMemo, useState } from "react";
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { EmergencyAlert, Resident, User, Household, MapHousehold } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmergencyAlerts, useResidents, useBarangayRef, useResponderLocations, useHouseholds } from '@/hooks/use-barangay-data';
import { collection } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { Siren, MapPin, User as UserIcon, CheckCircle, ShieldCheck, Phone, Trash2, MoreHorizontal, MessageSquare, Users, Truck, Radio, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useTenantProfile } from "@/hooks/use-tenant-profile";
import { useTenant } from '@/providers/tenant-provider';
import { simulateEmergency } from '@/lib/trigger-simulation';

// Import new components
import { ResponderStatusList, AssetList, ActiveAlertFeed } from "./components/sidebar-lists";
import { WeatherHeader } from "./components/weather-header";
import { MapControls } from "./components/map-controls";
import { HouseholdSearch } from "./components/household-search";
import { SOSButton } from "@/features/emergency/components/SosButton";
import { OnDutyToggle } from "@/features/emergency/components/OnDutyToggle";
import { GeolocationDebugger } from "@/features/emergency/components/GeolocationDebugger";

const EmergencyMap = dynamic(() => import('@/components/emergency-map'), { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-zinc-900"><p className="text-zinc-500 font-medium animate-pulse">Initializing Map System...</p></div>
});

type EmergencyAlertWithId = EmergencyAlert & { id?: string };

const RESPONDER_ROLES = [
    'Barangay Tanod (BPSO - Barangay Public Safety Officer)',
    'Chief Tanod (Executive Officer)',
    'Lupon Member (Pangkat Tagapagkasundo)',
    'Driver / Ambulance Operator',
    'VAWC Desk Officer',
    'Barangay Health Worker (BHW)',
    'Eco-Aide / Street Sweeper',
    'Utility Worker'
];

function ResolveAlertDialog({ alertId, onResolve, children }: { alertId: string, onResolve: (id: string, notes: string) => void, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState('');

    const handleResolve = () => {
        onResolve(alertId, notes);
        setOpen(false);
        setNotes('');
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle>Resolve Emergency Alert</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Add resolution notes before closing alert #{alertId}. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="notes" className="text-zinc-300">Resolution Notes</Label>
                    <Textarea
                        id="notes"
                        placeholder="e.g., False alarm, resident confirmed safe. Or, medical assistance provided."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleResolve} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                        <CheckCircle className="mr-2" />
                        Mark as Resolved
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DispatchResponderDialog({ onDispatch, children }: { onDispatch: (responderId: string, vehicle: string) => void, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [selectedResponder, setSelectedResponder] = useState<string>('');
    const [vehicle, setVehicle] = useState<string>('Patrol Vehicle 1');
    
    const firestore = useFirestore();
    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, `/users`) : null, [firestore]);
    const { data: users } = useCollection<User>(usersCollection);

    const activeResponders = users?.filter(u => {
        const isResponderRole = RESPONDER_ROLES.includes(u.position);
        const isSystemResponder = u.systemRole === 'Responder';
        const isActive = u.status === 'Active';
        return isActive && (isResponderRole || isSystemResponder);
    }) || [];

    const handleDispatch = () => {
        if (selectedResponder) {
            onDispatch(selectedResponder, vehicle);
            setOpen(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle>Dispatch Responder</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Select a responder and vehicle to assign to this incident.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Assign Responder</Label>
                        <Select value={selectedResponder} onValueChange={setSelectedResponder}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                                <SelectValue placeholder="Select a responder" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                                {activeResponders.length > 0 ? (
                                    activeResponders.map(user => (
                                        <SelectItem key={user.userId} value={user.userId} className="focus:bg-zinc-700 focus:text-white">
                                            {user.fullName} ({user.position || user.systemRole})
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-zinc-400 text-center">
                                        No active responders available
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-zinc-300">Vehicle / Unit</Label>
                        <Select value={vehicle} onValueChange={setVehicle}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                                <SelectValue placeholder="Select Vehicle" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                                <SelectItem value="Patrol Vehicle 1" className="focus:bg-zinc-700 focus:text-white">Patrol Vehicle 1</SelectItem>
                                <SelectItem value="Patrol Vehicle 2" className="focus:bg-zinc-700 focus:text-white">Patrol Vehicle 2</SelectItem>
                                <SelectItem value="Ambulance" className="focus:bg-zinc-700 focus:text-white">Ambulance</SelectItem>
                                <SelectItem value="Fire Truck" className="focus:bg-zinc-700 focus:text-white">Fire Truck</SelectItem>
                                <SelectItem value="Motorcycle Unit" className="focus:bg-zinc-700 focus:text-white">Motorcycle Unit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleDispatch} disabled={!selectedResponder} className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                        <Siren className="mr-2 h-4 w-4" />
                        Confirm Dispatch
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const getAge = (dateString: string) => {
    if (!dateString) return 'N/A';
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const IncidentActionModal = ({ alert, resident, onAcknowledge, onDispatch, onResolve, onDelete, isOpen, onClose }: { alert: EmergencyAlertWithId; resident: Resident | undefined, onAcknowledge: (id: string) => void; onDispatch: (alertId: string, responderId: string, vehicle: string) => void; onResolve: (id: string, notes: string) => void; onDelete: (id: string) => void; isOpen: boolean; onClose: () => void; }) => {
    const timeAgo = useMemo(() => {
        if (!alert.timestamp) return '...';
        return formatDistanceToNow(alert.timestamp.toDate(), { addSuffix: true });
    }, [alert.timestamp]);

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`;
    
    const statusBadgeVariant = {
        New: "destructive",
        Acknowledged: "secondary",
        Dispatched: "default",
        'On Scene': "default",
        Resolved: "default",
        'False Alarm': "outline"
    }[alert.status] as "default" | "secondary" | "outline" | "destructive";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <div className="flex justify-between items-center mr-8">
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <Siren className={alert.status === 'New' ? 'animate-pulse text-red-500' : 'text-zinc-400'} />
                            <span>Incident Details</span>
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant={statusBadgeVariant} className="uppercase tracking-wider">{alert.status}</Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                                    <DropdownMenuItem 
                                        className="text-red-400 focus:bg-red-900/20 focus:text-red-300" 
                                        onClick={() => onDelete(alert.alertId)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Alert
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                        {alert.category && <Badge variant="outline" className="border-zinc-600 text-zinc-300">{alert.category}</Badge>}
                        <span>Received {timeAgo}</span>
                    </div>
                </DialogHeader>
                <Separator className="bg-zinc-800" />
                <ScrollArea className="flex-grow pr-4">
                    <div className="space-y-6 py-4">
                        {alert.responderDetails && (
                            <>
                            <div className="bg-blue-900/20 p-3 rounded-md border border-blue-800">
                                <h4 className="font-semibold text-blue-300 flex items-center gap-2 text-sm mb-2">
                                    <Truck className="h-4 w-4" /> Dispatched Unit
                                </h4>
                                <div className="text-sm space-y-1 text-zinc-300">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Officer:</span>
                                        <span className="font-medium text-white">{alert.responderDetails.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Vehicle:</span>
                                        <span className="font-medium text-white">{alert.responderDetails.vehicleInfo}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-800/50">
                                        <span className="text-zinc-500">Contact:</span>
                                        <a href={`tel:${alert.responderDetails.contactNumber}`} className="font-medium text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {alert.responderDetails.contactNumber}
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <Separator className="bg-zinc-800" />
                            </>
                        )}

                        <div className="space-y-3">
                            <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><UserIcon className="h-4 w-4 text-zinc-400" /> Applicant Information</h4>
                            <div className="flex items-center gap-3 pl-6">
                                <div>
                                    <p className="font-semibold text-lg text-white">{alert.residentName ?? 'Unknown'}</p>
                                    <p className="text-sm text-zinc-400">{resident ? `${getAge(resident.dateOfBirth)} y/o ${resident.gender}` : 'Resident data not found'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pl-6">
                                <div className="flex flex-wrap gap-1">
                                    {resident?.isPwd && <Badge variant="destructive">PWD</Badge>}
                                    {getAge(resident?.dateOfBirth ?? '0') > 60 && <Badge variant="destructive">Senior Citizen</Badge>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pl-6">
                                <Button variant="outline" size="sm" className="w-full flex items-center gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" asChild>
                                    <a href={`tel:${alert.contactNumber || resident?.contactNumber}`}>
                                        <Phone className="h-4 w-4" />
                                        {alert.contactNumber || resident?.contactNumber || 'No contact #'}
                                    </a>
                                </Button>
                            </div>
                        </div>
                        
                        <Separator className="bg-zinc-800" />
                        
                        {alert.message && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-zinc-400" /> Message from Resident</h4>
                                <div className="p-3 bg-zinc-800/50 rounded-md text-sm pl-6 border-l-4 border-zinc-500 text-zinc-300 italic">
                                    "{alert.message}"
                                </div>
                            </div>
                        )}

                        <Separator className="bg-zinc-800" />

                        <div className="space-y-3">
                            <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400" /> Precise Location</h4>
                            <div className="flex items-start gap-3 pl-6">
                                <div>
                                    <p className="font-semibold text-sm text-zinc-300">GPS Coordinates</p>
                                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 underline hover:text-blue-300">
                                        View on Google Maps ({alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)})
                                    </a>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-zinc-800" />
                        
                        <div className="space-y-3">
                             <div className="w-full">
                                <h4 className="font-semibold text-zinc-200 flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-zinc-400" /> Household & Related Members</h4>
                                {alert.householdMembersSnapshot && alert.householdMembersSnapshot.length > 0 ? (
                                    <div className="border border-zinc-800 rounded-md overflow-hidden">
                                        <div className="bg-zinc-800/50 p-2 grid grid-cols-12 text-xs font-semibold text-zinc-400">
                                            <div className="col-span-6">Name</div>
                                            <div className="col-span-3">Age</div>
                                            <div className="col-span-3">Relation</div>
                                        </div>
                                        <ScrollArea className="h-[120px]">
                                            {alert.householdMembersSnapshot.map((member, idx) => (
                                                <div key={idx} className="p-2 grid grid-cols-12 text-sm text-zinc-300 border-t border-zinc-800/50 hover:bg-zinc-800/20">
                                                    <div className="col-span-6 font-medium">{member.name}</div>
                                                    <div className="col-span-3 text-zinc-500">{member.age !== 'N/A' ? `${member.age} y/o` : 'N/A'}</div>
                                                    <div className="col-span-3 text-zinc-500 italic text-xs">{member.relationship || 'Household Member'}</div>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                ) : (
                                    <div className="text-sm text-zinc-500 italic p-4 text-center border border-dashed border-zinc-800 rounded-md">
                                        No household members linked to this resident's profile.
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-zinc-800 pt-4 mt-auto">
                    {alert.status === 'New' && (
                        <Button variant="secondary" onClick={() => onAcknowledge(alert.alertId)} className="w-full sm:w-auto bg-zinc-700 text-white hover:bg-zinc-600">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Acknowledge
                        </Button>
                    )}
                    {alert.status === 'Acknowledged' && (
                        <DispatchResponderDialog onDispatch={(rId, v) => onDispatch(alert.alertId, rId, v)}>
                            <Button variant="default" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                                <Siren className="mr-2 h-4 w-4" />
                                Dispatch Responder
                            </Button>
                        </DispatchResponderDialog>
                    )}
                    {(alert.status === 'Acknowledged' || alert.status === 'Dispatched' || alert.status === 'On Scene') && (
                        <ResolveAlertDialog alertId={alert.alertId} onResolve={onResolve}>
                            <Button variant="default" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Resolve Alert
                            </Button>
                        </ResolveAlertDialog>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export function EmergencyDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchedLocation, setSearchedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showStructures, setShowStructures] = useState(true);

  // ✅ FIX: add demographic filters state + handler
  const [demographicFilters, setDemographicFilters] = useState({
    showSeniors: false,
    showPWDs: false,
    showChildren: false,
    showPregnancy: false,
    showSoloParents: false,
  });

  const handleToggleDemographic = (key: keyof typeof demographicFilters) => {
    setDemographicFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const { data: allAlerts, isLoading: isLoadingAlerts } = useEmergencyAlerts();
  const { data: residents, isLoading: isLoadingResidents } = useResidents();
  const { data: responders, isLoading: isLoadingResponders } = useResponderLocations();
  const { data: households, isLoading: isLoadingHouseholds } = useHouseholds();
  const { profile } = useTenantProfile();
  const { tenantPath } = useTenant();

  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/users`) : null, [firestore]);
  const { data: users } = useCollection<User>(usersCollectionRef);
  
  const alertsCollectionRef = useBarangayRef('emergency_alerts');
  
  const alerts = useMemo(() => {
      return allAlerts?.filter(a => ['New', 'Acknowledged', 'Dispatched', 'On Scene'].includes(a.status)) ?? [];
  }, [allAlerts]);
  
  const sortedAlerts = useMemo(() => {
    return alerts?.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0)) ?? [];
  }, [alerts]);

  const selectedAlert = useMemo(() => {
      return sortedAlerts.find(a => a.alertId === selectedAlertId) as EmergencyAlertWithId | undefined;
  }, [selectedAlertId, sortedAlerts]);

  const selectedResident = useMemo(() => {
      if(!selectedAlert || !residents) return undefined;
      return residents.find(r => r.residentId === selectedAlert.residentId);
  }, [selectedAlert, residents])

  const mapHouseholds: MapHousehold[] = useMemo(() => {
      if (!households) return [];
      return households.map(h => {
          let vulnerabilityLevel: 'High' | 'Normal' = 'Normal';
          let population = 0;
          let familyName = h.name; 

          if (residents) {
              const members = residents.filter(r => r.householdId === h.householdId);
              population = members.length;
              const hasVulnerable = members.some(m => 
                m.isPwd || 
                (m.vulnerability_tags && m.vulnerability_tags.length > 0) ||
                getAge(m.dateOfBirth) > 60 ||
                getAge(m.dateOfBirth) < 10
              );
              if (hasVulnerable) vulnerabilityLevel = 'High';
          }
          
          return {
              ...h,
              vulnerabilityLevel,
              population,
              familyName
          };
      });
  }, [households, residents]);

  const handleAlertSelect = (id: string) => {
      setSelectedAlertId(id);
      setIsModalOpen(true);
      setSearchedLocation(null);
  };

  const handleSearchSelect = (location: { lat: number; lng: number; label: string; type: 'resident' | 'household' }) => {
      setSearchedLocation({ lat: location.lat, lng: location.lng });
      toast({
          title: "Location Found",
          description: `Focusing map on ${location.label}`,
      });
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedAlertId(null);
  };

  const handleSimulateSOS = async () => {
    if (!tenantPath) {
        toast({ title: "Error", description: "Tenant context not found.", variant: "destructive" });
        return;
    }
    
    setIsSimulating(true);
    const success = await simulateEmergency(tenantPath);
    setIsSimulating(false);

    if (success) {
        toast({
            title: "Simulation Triggered",
            description: "A mock emergency alert has been broadcasted.",
        });
    } else {
        toast({
            title: "Simulation Failed",
            description: "Could not create mock alert.",
            variant: "destructive"
        });
    }
  };
  
  const handleAcknowledge = async (alertId: string) => {
    if (!alertsCollectionRef || !user) return;
    
    const alert = alerts.find(a => a.alertId === alertId) as EmergencyAlertWithId | undefined;
    if (!alert || !alert.id) {
        toast({ title: "Error", description: "Alert document not found.", variant: "destructive" });
        return;
    }

    try {
        const alertRef = doc(alertsCollectionRef, alert.id);
        await updateDocumentNonBlocking(alertRef, {
            status: 'Acknowledged',
            acknowledgedByUserId: user.uid // Use user.uid for Firebase Auth User
        });
        toast({ title: "Acknowledged", description: "Alert status updated." });
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to acknowledge alert.", variant: "destructive" });
    }
  }

  const handleDispatch = async (alertId: string, responderId: string, vehicle: string) => {
    if (!alertsCollectionRef || !users) return;

    const alert = alerts.find(a => a.alertId === alertId) as EmergencyAlertWithId | undefined;
    const responder = users.find(u => u.userId === responderId);

    if (!alert || !alert.id || !responder) {
        toast({ title: "Error", description: "Alert or responder not found.", variant: "destructive" });
        return;
    }

    try {
        const alertRef = doc(alertsCollectionRef, alert.id);
        await updateDocumentNonBlocking(alertRef, {
            status: 'Dispatched',
            responder_team_id: responderId,
            responderDetails: {
                userId: responder.userId,
                name: responder.fullName,
                contactNumber: responder.email || 'N/A', // Using email as placeholder if contact number missing in User type
                vehicleInfo: vehicle
            }
        });
        toast({ title: "Dispatched", description: `${responder.fullName} dispatched.` });
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to dispatch.", variant: "destructive" });
    }
  }

  const handleResolve = async (alertId: string, notes: string) => {
      if (!alertsCollectionRef) return;
      const alert = alerts.find(a => a.alertId === alertId) as EmergencyAlertWithId | undefined;
      
      if (!alert || !alert.id) return;

      try {
          const alertRef = doc(alertsCollectionRef, alert.id);
          await updateDocumentNonBlocking(alertRef, {
              status: 'Resolved',
              resolvedAt: serverTimestamp(),
              notes: notes
          });
          toast({ title: "Resolved", description: "Incident closed." });
          setIsModalOpen(false);
      } catch (e) {
          console.error(e);
          toast({ title: "Error", description: "Failed to resolve.", variant: "destructive" });
      }
  };

  const handleDelete = async (alertId: string) => {
     if (!alertsCollectionRef) return;
     const alert = alerts.find(a => a.alertId === alertId) as EmergencyAlertWithId | undefined;
     
     if (!alert || !alert.id) return;

     try {
         const alertRef = doc(alertsCollectionRef, alert.id);
         await deleteDocumentNonBlocking(alertRef);
         toast({ title: "Deleted", description: "Alert removed." });
         setIsModalOpen(false);
     } catch (e) {
         console.error(e);
         toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
     }
  };

  const isLoading = isLoadingAlerts || isLoadingResidents || isLoadingResponders || isLoadingHouseholds;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-white font-sans">
        
        <div className="absolute inset-0 z-0">
            <EmergencyMap 
                alerts={alerts ?? []}
                responders={responders ?? []}
                households={mapHouseholds} 
                selectedAlertId={selectedAlertId}
                onSelectAlert={handleAlertSelect}
                searchedLocation={searchedLocation} 
                showStructures={showStructures}
                settings={profile}
            />
            <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
        </div>
        
        <div className="absolute top-6 left-6 z-10 pointer-events-none flex flex-col gap-4">
             <div className="pointer-events-auto">
                 <WeatherHeader />
             </div>
             
             {/* Moved GeolocationDebugger here */}
             <div className="pointer-events-auto">
                 <GeolocationDebugger currentUser={user} />
             </div>
        </div>

        <div className="absolute right-6 top-6 bottom-24 z-10 flex flex-col gap-4 overflow-y-auto pointer-events-none w-96 pr-2">
            <div className="pointer-events-auto">
                <OnDutyToggle />
            </div>

            <div className="pointer-events-auto">
                <ActiveAlertFeed 
                    alerts={sortedAlerts} 
                    onSelectAlert={handleAlertSelect}
                    selectedAlertId={selectedAlertId}
                />
            </div>
            <div className="pointer-events-auto">
                <ResponderStatusList responders={users ?? []} />
            </div>
            <div className="pointer-events-auto">
                 <AssetList />
            </div>
        </div>

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
            <HouseholdSearch onSelectLocation={handleSearchSelect} />
        </div>

        {/* ✅ FIX: pass demographicFilters + handler into MapControls */}
        <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
            <MapControls 
                showStructures={showStructures}
                onToggleStructures={() => setShowStructures(!showStructures)}
                demographicFilters={demographicFilters}
                onToggleDemographic={handleToggleDemographic}
            />
        </div>

        {/* Updated SOS Button Location & Component */}
        <div className="absolute bottom-6 right-6 z-[100] pointer-events-auto">
             <SOSButton />
        </div>

        {selectedAlert && (
            <IncidentActionModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                alert={selectedAlert}
                resident={selectedResident}
                onAcknowledge={handleAcknowledge}
                onDispatch={handleDispatch}
                onResolve={handleResolve}
                onDelete={handleDelete}
            />
        )}
    </div>
  );
}
