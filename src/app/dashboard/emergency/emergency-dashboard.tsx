
'use client';

import { useMemo, useState } from "react";
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { EmergencyAlert, Resident, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Siren, MapPin, User as UserIcon, CheckCircle, ShieldCheck, Phone, AlertTriangle, ScrollText, Trash2, MoreHorizontal, MessageSquare, Users, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

// Dynamically import the Map component to avoid SSR issues with Leaflet
const EmergencyMap = dynamic(() => import('@/components/emergency-map'), { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted/50 animate-pulse"><p className="text-muted-foreground font-medium">Loading Map...</p></div>
});

// Utility type to ensure we can access the doc ID
type EmergencyAlertWithId = EmergencyAlert & { id?: string };

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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Resolve Emergency Alert</DialogTitle>
                    <DialogDescription>
                        Add resolution notes before closing alert #{alertId}. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="notes">Resolution Notes</Label>
                    <Textarea
                        id="notes"
                        placeholder="e.g., False alarm, resident confirmed safe. Or, medical assistance provided."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleResolve}>
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
    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, `/barangays/${BARANGAY_ID}/users`) : null, [firestore]);
    const { data: users } = useCollection<User>(usersCollection);

    // Filter for potential responders (e.g., systemRole 'Responder' or 'Admin')
    const potentialResponders = users?.filter(u => ['Responder', 'Admin', 'Super Admin'].includes(u.systemRole)) || [];

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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dispatch Responder</DialogTitle>
                    <DialogDescription>
                        Select a responder and vehicle to assign to this incident.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Assign Responder</Label>
                        <Select value={selectedResponder} onValueChange={setSelectedResponder}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a responder" />
                            </SelectTrigger>
                            <SelectContent>
                                {potentialResponders.map(user => (
                                    <SelectItem key={user.userId} value={user.userId}>
                                        {user.fullName} ({user.systemRole})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Vehicle / Unit</Label>
                        <Select value={vehicle} onValueChange={setVehicle}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Vehicle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Patrol Vehicle 1">Patrol Vehicle 1</SelectItem>
                                <SelectItem value="Patrol Vehicle 2">Patrol Vehicle 2</SelectItem>
                                <SelectItem value="Ambulance">Ambulance</SelectItem>
                                <SelectItem value="Fire Truck">Fire Truck</SelectItem>
                                <SelectItem value="Motorcycle Unit">Motorcycle Unit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleDispatch} disabled={!selectedResponder}>
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

const IncidentActionPanel = ({ alert, resident, onAcknowledge, onDispatch, onResolve, onDelete }: { alert: EmergencyAlertWithId; resident: Resident | undefined, onAcknowledge: (id: string) => void; onDispatch: (alertId: string, responderId: string, vehicle: string) => void; onResolve: (id: string, notes: string) => void; onDelete: (id: string) => void; }) => {
    const timeAgo = useMemo(() => {
        if (!alert.timestamp) return '...';
        return formatDistanceToNow(alert.timestamp.toDate(), { addSuffix: true });
    }, [alert.timestamp]);

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`;
    
    const cardVariant = {
        New: "border-destructive",
        Acknowledged: "border-amber-500",
        Dispatched: "border-blue-500",
        'On Scene': "border-blue-500",
        Resolved: "border-green-500",
        'False Alarm': "border-gray-500"
    }[alert.status];

    const statusBadgeVariant = {
        New: "destructive",
        Acknowledged: "secondary",
        Dispatched: "default",
        'On Scene': "default",
        Resolved: "default",
        'False Alarm': "outline"
    }[alert.status] as "default" | "secondary" | "outline" | "destructive";


    return (
        <Card className={`flex flex-col h-full ${cardVariant}`}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Siren className={alert.status === 'New' ? 'animate-pulse text-destructive' : ''} />
                        <span>Incident Details</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant={statusBadgeVariant}>{alert.status}</Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive" 
                                    onClick={() => onDelete(alert.id || alert.alertId)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Alert
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    {alert.category && <Badge variant="outline">{alert.category}</Badge>}
                    <span>Received {timeAgo}</span>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-6 flex-grow overflow-y-auto">
                 {/* Responder Info (if dispatched) */}
                 {alert.responderDetails && (
                    <>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 text-sm mb-2">
                            <Truck className="h-4 w-4" /> Dispatched Unit
                        </h4>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Officer:</span>
                                <span className="font-medium">{alert.responderDetails.name}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Vehicle:</span>
                                <span className="font-medium">{alert.responderDetails.vehicleInfo}</span>
                            </div>
                             <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200/50">
                                <span className="text-muted-foreground">Contact:</span>
                                <a href={`tel:${alert.responderDetails.contactNumber}`} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {alert.responderDetails.contactNumber}
                                </a>
                            </div>
                        </div>
                    </div>
                    <Separator />
                    </>
                 )}

                 {/* Section A: Resident Profile */}
                 <div className="space-y-3">
                    <h4 className="font-semibold text-primary flex items-center gap-2"><UserIcon className="h-4 w-4" /> Applicant Information</h4>
                    <div className="flex items-center gap-3 pl-6">
                        <div>
                            <p className="font-semibold text-lg">{alert.residentName ?? 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{resident ? `${getAge(resident.dateOfBirth)} y/o ${resident.gender}` : 'Resident data not found'}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3 pl-6">
                         <div className="flex flex-wrap gap-1">
                             {resident?.isPwd && <Badge variant="destructive">PWD</Badge>}
                             {getAge(resident?.dateOfBirth ?? '0') > 60 && <Badge variant="destructive">Senior Citizen</Badge>}
                             {/* Mock vulnerability tag */}
                             {/* <Badge variant="outline">Diabetic</Badge> */}
                         </div>
                    </div>
                    <div className="flex items-center gap-3 pl-6">
                         <Button variant="outline" size="sm" className="w-full flex items-center gap-2" asChild>
                            <a href={`tel:${alert.contactNumber || resident?.contactNumber}`}>
                                <Phone className="h-4 w-4" />
                                {alert.contactNumber || resident?.contactNumber || 'No contact #'}
                            </a>
                         </Button>
                    </div>
                </div>
                
                <Separator />
                
                {/* Section A.2: Message / Description */}
                {alert.message && (
                    <div className="space-y-2">
                        <h4 className="font-semibold text-primary flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Message from Resident</h4>
                        <div className="p-3 bg-muted rounded-md text-sm pl-6 border-l-4 border-primary">
                            "{alert.message}"
                        </div>
                    </div>
                )}

                <Separator />

                {/* Section B: Location */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-primary flex items-center gap-2"><MapPin className="h-4 w-4" /> Precise Location</h4>
                    <div className="flex items-start gap-3 pl-6">
                        <div>
                            <p className="font-semibold text-sm">GPS Coordinates</p>
                            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                                View on Google Maps ({alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)})
                            </a>
                        </div>
                    </div>
                </div>

                 <Separator />
                 
                 {/* Section C: Household Members */}
                 {alert.householdMembersSnapshot && alert.householdMembersSnapshot.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-semibold text-primary flex items-center gap-2"><Users className="h-4 w-4" /> Household Members</h4>
                        <div className="pl-6 space-y-1">
                            {alert.householdMembersSnapshot.map((member, idx) => (
                                <div key={idx} className="text-sm flex justify-between items-center p-2 bg-muted/20 rounded">
                                    <span>{member.name}</span>
                                    <span className="text-muted-foreground text-xs">{member.age !== 'N/A' ? `${member.age} y/o` : ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}

            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
                {alert.status === 'New' && (
                     <Button variant="secondary" onClick={() => onAcknowledge(alert.alertId)} className="w-full">
                        <ShieldCheck className="mr-2" />
                        Acknowledge
                    </Button>
                )}
                {alert.status === 'Acknowledged' && (
                    <DispatchResponderDialog onDispatch={(rId, v) => onDispatch(alert.alertId, rId, v)}>
                        <Button variant="default" className="w-full">
                            <Siren className="mr-2" />
                            Dispatch Responder
                        </Button>
                    </DispatchResponderDialog>
                )}
                 {(alert.status === 'Acknowledged' || alert.status === 'Dispatched' || alert.status === 'On Scene') && (
                    <ResolveAlertDialog alertId={alert.alertId} onResolve={onResolve}>
                        <Button variant="default" className="w-full">
                            <CheckCircle className="mr-2" />
                            Resolve Alert
                        </Button>
                    </ResolveAlertDialog>
                )}
            </CardFooter>
        </Card>
    );
};

const AlertFeedItem = ({ alert, onSelect, isSelected }: { alert: EmergencyAlert, onSelect: () => void, isSelected: boolean }) => {
     const timeAgo = useMemo(() => {
        if (!alert.timestamp) return '...';
        return formatDistanceToNow(alert.timestamp.toDate(), { addSuffix: true });
    }, [alert.timestamp]);

    return (
        <button onClick={onSelect} className={`w-full text-left p-3 rounded-lg border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted'}`}>
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <p className="font-semibold">{alert.residentName}</p>
                    <span className="text-xs text-muted-foreground">{alert.category || 'Unspecified'}</span>
                </div>
                <Badge variant={alert.status === 'New' ? 'destructive' : 'secondary'}>{alert.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{alert.message || 'No message provided.'}</p>
            <p className="text-[10px] text-muted-foreground text-right mt-1">{timeAgo} ago</p>
        </button>
    )
}

export function EmergencyDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Use hooks
  const { data: allAlerts, isLoading: isLoadingAlerts } = useEmergencyAlerts();
  const { data: residents, isLoading: isLoadingResidents } = useResidents();
  const { data: responders, isLoading: isLoadingResponders } = useResponderLocations();
  
  // Use useMemoFirebase for users collection
  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/barangays/${BARANGAY_ID}/users`) : null, [firestore]);
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
      if (!selectedAlertId && sortedAlerts.length > 0) {
          setSelectedAlertId(sortedAlerts[0].alertId);
          return sortedAlerts[0] as EmergencyAlertWithId;
      }
      return sortedAlerts.find(a => a.alertId === selectedAlertId) as EmergencyAlertWithId | undefined;
  }, [selectedAlertId, sortedAlerts]);

  const selectedResident = useMemo(() => {
      if(!selectedAlert || !residents) return undefined;
      return residents.find(r => r.residentId === selectedAlert.residentId);
  }, [selectedAlert, residents])

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
      
      // If we can't find the user details (unlikely), fallback to basic info
      const responderName = responderUser?.fullName || 'Assigned Officer';
      const responderPhone = (responderUser as any)?.phoneNumber || '09123456789'; // Assuming phone is on user, or we need to fetch it from resident profile linked to user. 
      // Note: User type has `residentId`. Ideally we fetch from there. 
      // For now, I'll use a placeholder if not directly available on User type (User type currently has email/name).
      
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
  };

  const handleDelete = (alertId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts/${alertId}`);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Alert Deleted", description: "The alert has been permanently removed." });
    if (selectedAlertId === alertId) setSelectedAlertId(null);
  };

  const isLoading = isLoadingAlerts || isLoadingResidents || isLoadingResponders;

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6">
        {/* Main Panel */}
        <div className="w-2/3 h-full">
            <Card className="h-full overflow-hidden">
                <CardHeader>
                    <CardTitle>Map Visualization</CardTitle>
                    <CardDescription>Real-time location of alerts and responders.</CardDescription>
                </CardHeader>
                <CardContent className="h-[calc(100%-4.5rem)] p-0 relative">
                    <EmergencyMap 
                        alerts={alerts ?? []}
                        responders={responders ?? []}
                        selectedAlertId={selectedAlertId}
                        onSelectAlert={setSelectedAlertId}
                    />
                </CardContent>
            </Card>
        </div>

        {/* Side Panel */}
        <div className="w-1/3 h-full flex flex-col gap-6">
            <div className="flex-none">
                <Card>
                    <CardHeader>
                         <div className="flex justify-between items-center">
                            <CardTitle>Active Alert Feed</CardTitle>
                             <Button onClick={handleSimulateSOS} disabled={isLoading || isSimulating} size="sm">
                                {isSimulating ? '...' : 'Simulate SOS'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-48">
                            <div className="space-y-2">
                            {isLoading && (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}
                                </div>
                            )}
                            {!isLoading && sortedAlerts.length === 0 && (
                                <div className="text-center text-muted-foreground pt-8">No active alerts.</div>
                            )}
                            {sortedAlerts.map(alert => (
                                <AlertFeedItem 
                                    key={alert.alertId} 
                                    alert={alert}
                                    onSelect={() => setSelectedAlertId(alert.alertId)}
                                    isSelected={selectedAlertId === alert.alertId}
                                />
                            ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            <div className="flex-grow min-h-0">
                {isLoading && <Skeleton className="h-full w-full" />}
                {!isLoading && selectedAlert && (
                    <IncidentActionPanel 
                        alert={selectedAlert}
                        resident={selectedResident}
                        onAcknowledge={handleAcknowledge}
                        onDispatch={handleDispatch}
                        onResolve={handleResolve}
                        onDelete={handleDelete}
                    />
                )}
                 {!isLoading && sortedAlerts.length === 0 && (
                    <Card className="h-full flex items-center justify-center">
                         <div className="text-center">
                            <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
                            <h3 className="mt-4 text-lg font-medium">All Clear!</h3>
                            <p className="mt-1 text-sm text-muted-foreground">There are no active emergency alerts.</p>
                         </div>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}
