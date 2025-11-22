
'use client';

import { useMemo, useState } from "react";
import { collection, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { EmergencyAlert, Resident } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Siren, MapPin, User as UserIcon, CheckCircle, ShieldCheck, Phone, AlertTriangle, ScrollText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// In a real multi-tenant app, this would come from the user's session/claims or route.
const BARANGAY_ID = 'barangay_san_isidro';


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

const IncidentActionPanel = ({ alert, resident, onAcknowledge, onResolve }: { alert: EmergencyAlert; resident: Resident | undefined, onAcknowledge: (id: string) => void; onResolve: (id: string, notes: string) => void; }) => {
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
                        <Siren />
                        <span>Incident Details</span>
                    </CardTitle>
                    <Badge variant={statusBadgeVariant}>{alert.status}</Badge>
                </div>
                <CardDescription>
                    Received {timeAgo}
                </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-6 flex-grow overflow-y-auto">
                 {/* Section A: Resident Profile */}
                 <div className="space-y-3">
                    <h4 className="font-semibold text-primary">Applicant Information</h4>
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">{alert.residentName ?? 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{resident ? `${getAge(resident.dateOfBirth)} y/o ${resident.gender}` : 'Resident data not found'}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                         <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                         <div className="flex flex-wrap gap-1">
                             {resident?.isPwd && <Badge variant="destructive">PWD</Badge>}
                             {getAge(resident?.dateOfBirth ?? '0') > 60 && <Badge variant="destructive">Senior Citizen</Badge>}
                             {/* Mock vulnerability tag */}
                             <Badge variant="outline">Diabetic</Badge>
                         </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <Phone className="h-5 w-5 text-muted-foreground" />
                         <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${resident?.contactNumber}`}>{resident?.contactNumber || 'No contact #'}</a>
                         </Button>
                    </div>
                </div>
                <Separator />
                {/* Section B: Location */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-primary">Precise Location</h4>
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">GPS Coordinates</p>
                            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                                View on Google Maps ({alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)})
                            </a>
                        </div>
                    </div>
                </div>

                 <Separator />

                {/* Section D: Incident Log */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-primary">Incident Log</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>14:05 - Alert Received from App.</p>
                        <p>14:06 - Admin accepted. Categorized as "Medical".</p>
                    </div>
                </div>


            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
                {alert.status === 'New' && (
                     <Button variant="secondary" onClick={() => onAcknowledge(alert.alertId)} className="w-full">
                        <ShieldCheck className="mr-2" />
                        Acknowledge
                    </Button>
                )}
                {alert.status === 'Acknowledged' && (
                    <Button variant="default" className="w-full">
                        <Siren className="mr-2" />
                        Dispatch Responder
                    </Button>
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
                <p className="font-semibold">{alert.residentName}</p>
                <Badge variant={alert.status === 'New' ? 'destructive' : 'secondary'}>{alert.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{timeAgo}</p>
        </button>
    )
}

export function EmergencyDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Get active and acknowledged alerts
  const alertsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    const baseRef = collection(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts`);
    return query(baseRef, where('status', 'in', ['New', 'Acknowledged', 'Dispatched', 'On Scene']));
  }, [firestore]);
  
  const residentsCollectionRef = useMemoFirebase(() => {
    if(!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/residents`);
  }, [firestore]);

  const { data: alerts, isLoading: isLoadingAlerts } = useCollection<EmergencyAlert>(alertsCollectionRef);
  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);
  
  const sortedAlerts = useMemo(() => {
    return alerts?.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0)) ?? [];
  }, [alerts]);

  const selectedAlert = useMemo(() => {
      if (!selectedAlertId && sortedAlerts.length > 0) {
          setSelectedAlertId(sortedAlerts[0].alertId);
          return sortedAlerts[0];
      }
      return sortedAlerts.find(a => a.alertId === selectedAlertId);
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
    if(!user) return;

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
        };

        if(firestore) {
            const collectionRef = collection(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts`);
            addDocumentNonBlocking(collectionRef, newAlert).then(docRef => {
                 if (docRef) updateDocumentNonBlocking(docRef, { alertId: docRef.id, timestamp: serverTimestamp() });
            });
        }

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

  const isLoading = isLoadingAlerts || isLoadingResidents;

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6">
        {/* Main Panel */}
        <div className="w-2/3 h-full">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Map Visualization</CardTitle>
                    <CardDescription>Real-time location of alerts and responders.</CardDescription>
                </CardHeader>
                <CardContent className="h-[calc(100%-4.5rem)]">
                    <div className="bg-muted h-full w-full rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Map placeholder</p>
                    </div>
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
                        onResolve={handleResolve}
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

    