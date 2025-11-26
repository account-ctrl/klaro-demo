
'use client';

import { useMemo, useState } from "react";
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { EmergencyAlert, Resident, User } from "@/lib/types";
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
import { useEmergencyAlerts, useResidents, useBarangayRef, BARANGAY_ID, useResponderLocations } from '@/hooks/use-barangay-data';
import { collection } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { Siren, MapPin, User as UserIcon, CheckCircle, ShieldCheck, Phone, Trash2, MoreHorizontal, MessageSquare, Users, Truck, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// Import new components
import { ResponderStatusList, AssetList, ActiveAlertFeed } from "./components/sidebar-lists";
import { WeatherHeader } from "./components/weather-header";
import { MapControls } from "./components/map-controls";

// Dynamically import the Map component to avoid SSR issues with Leaflet
const EmergencyMap = dynamic(() => import('@/components/emergency-map'), { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-zinc-900"><p className="text-zinc-500 font-medium animate-pulse">Initializing Map System...</p></div>
});

// Utility type to ensure we can access the doc ID
type EmergencyAlertWithId = EmergencyAlert & { id?: string };

// Roles that are considered "Responders"
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
    
    // Fetch users to list as responders
    const firestore = useFirestore();
    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, `/users`) : null, [firestore]);
    const { data: users } = useCollection<User>(usersCollection);

    // Filter for potential responders:
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
                                        onClick={() => onDelete(alert.id || alert.alertId)}
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
                        {/* Responder Info (if dispatched) */}
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

                        {/* Section A: Resident Profile */}
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
                        
                        {/* Section A.2: Message / Description */}
                        {alert.message && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-zinc-400" /> Message from Resident</h4>
                                <div className="p-3 bg-zinc-800/50 rounded-md text-sm pl-6 border-l-4 border-zinc-500 text-zinc-300 italic">
                                    "{alert.message}"
                                </div>
                            </div>
                        )}

                        <Separator className="bg-zinc-800" />

                        {/* Section B: Location */}
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
                        
                        {/* Section C: Household Members */}
                        {alert.householdMembersSnapshot && alert.householdMembersSnapshot.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="font-semibold text-zinc-200 flex items-center gap-2"><Users className="h-4 w-4 text-zinc-400" /> Household Members</h4>
                                <div className="pl-6 space-y-1">
                                    {alert.householdMembersSnapshot.map((member, idx) => (
                                        <div key={idx} className="text-sm flex justify-between items-center p-2 bg-zinc-800/30 rounded border border-zinc-800">
                                            <span className="text-zinc-300">{member.name}</span>
                                            <span className="text-zinc-500 text-xs">{member.age !== 'N/A' ? `${member.age} y/o` : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use hooks
  const { data: allAlerts, isLoading: isLoadingAlerts } = useEmergencyAlerts();
  const { data: residents, isLoading: isLoadingResidents } = useResidents();
  const { data: responders, isLoading: isLoadingResponders } = useResponderLocations();
  
  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/users`) : null, [firestore]);
  const { data: users } = useCollection<User>(usersCollectionRef);
  
  // Collection ref for writing
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

  const handleAlertSelect = (id: string) => {
      setSelectedAlertId(id);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedAlertId(null);
  };

  const handleSimulateSOS = () => {
    if (!residents || residents.length === 0) {
        toast({ variant: 'destructive', title: 'Cannot Simulate', description: 'No residents found in the database to simulate an alert.' });
        return;
    }
    if(!user || !alertsCollectionRef) return;

    setIsSimulating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const randomResident = residents[Math.floor(Math.random() * residents.length)];
        
        const newAlert: Omit<EmergencyAlert, 'alertId' | 'timestamp'> = {
            residentId: randomResident.residentId,
            residentName: `${randomResident.firstName} ${randomResident.lastName}`,
            latitude,
            longitude,
            status: 'New',
            category: 'Unspecified',
            message: 'Simulated Alert via Admin Dashboard',
            contactNumber: randomResident.contactNumber || '09123456789',
        };

        addDocumentNonBlocking(alertsCollectionRef, newAlert).then(docRef => {
                if (docRef) updateDocumentNonBlocking(docRef, { alertId: docRef.id, timestamp: serverTimestamp() });
        });

        toast({ title: "SOS Simulated!", description: `An alert from ${randomResident.firstName} has been triggered.` });
        setIsSimulating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({ variant: 'destructive', title: 'Geolocation Error', description: 'Could not get your location. Please enable location services.' });
        setIsSimulating(false);
      },
      { enableHighAccuracy: true }
    );
  };
  
  const handleAcknowledge = (alertId: string) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts/${alertId}`);
    updateDocumentNonBlocking(docRef, {
        status: 'Acknowledged',
        acknowledgedByUserId: user.uid,
    });
    toast({ title: "Alert Acknowledged", description: `You are now handling alert #${alertId}.`});
  }

  const handleDispatch = (alertId: string, responderId: string, vehicle: string) => {
      if (!firestore || !users) return;
      
      const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts/${alertId}`);
      const responderUser = users.find(u => u.userId === responderId);
      
      const responderName = responderUser?.fullName || 'Assigned Officer';
      // Use 'contactNumber' field if 'phoneNumber' is missing or use dummy as fallback
      const responderPhone = (responderUser as any)?.phoneNumber || (responderUser as any)?.contactNumber || '09123456789';
      
      updateDocumentNonBlocking(docRef, {
          status: 'Dispatched',
          responder_team_id: responderId,
          responderDetails: {
              userId: responderId,
              name: responderName,
              contactNumber: responderPhone,
              vehicleInfo: vehicle,
          }
      });
      
      toast({ 
          title: "Responder Dispatched", 
          description: `${responderName} has been assigned to this incident.`
      });
  }

  const handleResolve = (alertId: string, notes: string) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts/${alertId}`);
    updateDocumentNonBlocking(docRef, {
        status: 'Resolved',
        resolvedAt: serverTimestamp(),
        acknowledgedByUserId: user.uid,
        notes: notes,
    });
     toast({ title: "Alert Resolved", description: `Alert #${alertId} has been marked as resolved.`});
     setIsModalOpen(false);
  };

  const handleDelete = (alertId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts/${alertId}`);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Alert Deleted", description: "The alert has been permanently removed." });
    if (selectedAlertId === alertId) {
        setSelectedAlertId(null);
        setIsModalOpen(false);
    }
  };

  const isLoading = isLoadingAlerts || isLoadingResidents || isLoadingResponders;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-white font-sans">
        
        {/* Full Screen Map Layer (Z-Index 0) */}
        <div className="absolute inset-0 z-0">
            <EmergencyMap 
                alerts={alerts ?? []}
                responders={responders ?? []}
                selectedAlertId={selectedAlertId}
                onSelectAlert={handleAlertSelect}
            />
             {/* Gradient Overlay for better text readability at edges */}
            <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
        </div>
        
        {/* Back Button Overlay */}
        <div className="absolute top-6 left-6 z-20 pointer-events-auto">
             <Button variant="ghost" className="text-white hover:bg-white/10 gap-2 px-2" onClick={() => window.history.back()}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                 Back to Dashboard
             </Button>
        </div>

        {/* Top Left: Header & Weather (Z-Index 10) */}
        <div className="absolute top-16 left-6 z-10 pointer-events-none">
             <WeatherHeader />
        </div>

        {/* Right Sidebar: Lists (Z-Index 10) */}
        <div className="absolute right-6 top-6 bottom-24 z-10 flex flex-col gap-4 overflow-y-auto pointer-events-none w-80 pr-2">
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

        {/* Bottom Left: Controls (Z-Index 10) */}
        <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
            <MapControls />
        </div>

        {/* Floating Broadcast Button (Bottom Right) */}
        <Button 
            className="absolute bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-[0_0_40px_-10px_rgba(220,38,38,0.7)] border-4 border-red-800 animate-pulse hover:animate-none transition-all scale-100 hover:scale-110 flex items-center justify-center"
            onClick={handleSimulateSOS} // Using simulate SOS as the action for now as per previous logic
            disabled={isLoading || isSimulating}
            title="Broadcast Emergency Alert"
        >
            <Siren className="h-8 w-8 text-white" />
        </Button>

        {/* Incident Modal */}
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
