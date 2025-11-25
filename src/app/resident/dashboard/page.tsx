'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Megaphone, CheckCircle, Clock, Siren, Loader2, Phone, MessageSquare, Users, Truck } from "lucide-react";
import { RequestDocumentCard } from "./request-document-card";
import { BlotterWidget } from "./blotter-widget"; 
import { TransparencyBoard } from "./transparency-board"; 
import { CommunityCalendar } from "./community-calendar"; // New Component
import { MyHousehold } from "./household-pets-widget"; // New Component
import { useUser, useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, serverTimestamp, doc, getDoc, getDocs } from 'firebase/firestore';
import { CertificateRequest, Announcement, EmergencyAlert, Resident } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const BARANGAY_ID = 'barangay_san_isidro';


const getStatusBadgeVariant = (status: CertificateRequest['status']) => {
    switch (status) {
        case 'Claimed':
        case 'Approved':
            return 'default';
        case 'Ready for Pickup':
            return 'secondary';
        case 'Denied':
            return 'destructive';
        default:
            return 'outline';
    }
}

function ActiveRequests() {
    const firestore = useFirestore();
    const { user } = useUser();

    const requestsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/certificate_requests`),
            where('residentId', '==', user.uid),
            orderBy('dateRequested', 'desc'),
            limit(5)
        );
    }, [firestore, user]);

    const { data: requests, isLoading } = useCollection<CertificateRequest>(requestsQuery);
    
    return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> My Active Requests</CardTitle>
                <CardDescription>A summary of your recent document requests.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Document Type</TableHead>
                            <TableHead>Date Requested</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && [...Array(2)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && requests && requests.length > 0 ? requests.map((req) => (
                            <TableRow key={req.requestId}>
                                <TableCell>{req.certificateName}</TableCell>
                                <TableCell>{req.dateRequested ? format(req.dateRequested.toDate(), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(req.status)} className="flex items-center gap-1 w-fit">
                                        {req.status === 'Ready for Pickup' ? <Clock className="h-3 w-3"/> : <CheckCircle className="h-3 w-3"/> }
                                        {req.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">List View for Demo is not Available</TableCell>
                                </TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function RecentAnnouncements() {
    const firestore = useFirestore();
    
    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/announcements`),
            orderBy('datePosted', 'desc'),
            limit(3)
        );
    }, [firestore]);

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone /> Recent Announcements</CardTitle>
                <CardDescription>Stay updated with the latest news from the barangay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                {!isLoading && announcements && announcements.length > 0 ? announcements.map(item => (
                   <div key={item.announcementId} className="flex justify-between items-center">
                       <div>
                           <p className="font-medium">{item.title}</p>
                           <p className="text-sm text-muted-foreground">{item.datePosted ? format(item.datePosted.toDate(), 'MMM dd, yyyy') : 'N/A'}</p>
                       </div>
                       <Badge variant="outline">{item.category}</Badge>
                   </div>
               )) : (
                   !isLoading && <p className="text-center text-muted-foreground py-8">No announcements yet.</p>
               )}
            </CardContent>
        </Card>
    )
}

function EmergencySOSButton() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSending, setIsSending] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
    const [category, setCategory] = useState<string>('Unspecified');
    const [message, setMessage] = useState('');
    const [contactNumber, setContactNumber] = useState('');

    // Fetch active alert document
    const activeAlertRef = useMemoFirebase(() => {
        if (!firestore || !activeAlertId) return null;
        return doc(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts/${activeAlertId}`);
    }, [firestore, activeAlertId]);

    const { data: activeAlert } = useDoc<EmergencyAlert>(activeAlertRef);

    // Initial check for existing active alert on mount
    useEffect(() => {
        if (!firestore || !user || activeAlertId) return; // Don't check if we already have one
        
        // Simple one-off check to restore state if page refreshed
        const checkActive = async () => {
             const q = query(
                collection(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts`),
                where('residentId', '==', user.uid),
                where('status', 'in', ['New', 'Acknowledged', 'Dispatched', 'On Scene']),
                orderBy('timestamp', 'desc'),
                limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                setActiveAlertId(snap.docs[0].id);
                setMessage(data.message || '');
                setCategory(data.category || 'Unspecified');
            }
        }
        checkActive();
    }, [firestore, user, activeAlertId]);


    const handleSendSOS = async () => {
        if (!user || !firestore) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send an SOS.' });
             return;
        }

        setIsSending(true);

        if (!navigator.geolocation) {
             toast({ variant: 'destructive', title: 'Error', description: 'Geolocation is not supported by your browser.' });
             setIsSending(false);
             return;
        }

        // 1. Fetch Resident Profile to get Household ID and Contact
        let residentData: Resident | undefined;
        let householdMembersSnapshot: { name: string; age?: string; relationship?: string }[] = [];

        try {
            const residentRef = doc(firestore, `/barangays/${BARANGAY_ID}/residents/${user.uid}`);
            const residentSnap = await getDoc(residentRef);
            if (residentSnap.exists()) {
                residentData = residentSnap.data() as Resident;
                if (!contactNumber && residentData.contactNumber) {
                     setContactNumber(residentData.contactNumber); // Update local state for UI
                }
                
                // 2. Fetch Household Members if householdId exists
                if (residentData.householdId) {
                    const membersQuery = query(
                        collection(firestore, `/barangays/${BARANGAY_ID}/residents`),
                        where('householdId', '==', residentData.householdId)
                    );
                    const membersSnap = await getDocs(membersQuery);
                    membersSnap.forEach(doc => {
                        const member = doc.data() as Resident;
                        householdMembersSnapshot.push({
                            name: `${member.firstName} ${member.lastName}`,
                            relationship: member.residentId === user.uid ? 'Self' : 'Member',
                            // Calculate age safely
                            age: member.dateOfBirth ? String(new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear()) : 'N/A'
                        });
                    });
                }
            }
        } catch (e) {
            console.warn("Failed to fetch resident details, proceeding with basic alert.", e);
        }


        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    const alertsCollectionRef = collection(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts`);
                    
                    // Prepare safe alert object, ensuring no undefined fields
                    const newAlert: Record<string, any> = {
                        residentId: user.uid,
                        residentName: user.displayName || (residentData?.firstName ? `${residentData?.firstName} ${residentData?.lastName}` : 'Resident'), 
                        latitude,
                        longitude,
                        status: 'New',
                        category: category,
                        message: message,
                        contactNumber: contactNumber || residentData?.contactNumber || 'No contact #',
                        householdMembersSnapshot: householdMembersSnapshot,
                    };
                    
                    if (residentData?.householdId) {
                        newAlert.householdId = residentData.householdId;
                    }

                    const docRef = await addDocumentNonBlocking(alertsCollectionRef, newAlert);
                    if (docRef) {
                         await updateDocumentNonBlocking(docRef, { alertId: docRef.id, timestamp: serverTimestamp() });
                         setActiveAlertId(docRef.id);
                    }

                    toast({ 
                        title: "SOS SENT!", 
                        description: "Help is on the way. Keep your phone close.",
                        className: "bg-red-600 text-white border-none"
                    });
                    setOpenDialog(false);
                } catch (error: any) {
                    console.error("Error sending SOS:", error);
                    toast({ variant: 'destructive', title: 'Failed to send SOS', description: error.message || 'Please try again or call emergency services directly.' });
                } finally {
                    setIsSending(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                toast({ variant: 'destructive', title: 'Location Error', description: error.message });
                setIsSending(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleUpdateMessage = async () => {
         if (!activeAlertId || !firestore) return;
         const alertRef = doc(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts/${activeAlertId}`);
         updateDocumentNonBlocking(alertRef, { message, category: category as any });
         toast({ title: "Update Sent", description: "Incident details updated." });
    }

    const handleResolveAlert = async () => {
         if (!activeAlertId || !firestore) return;
         const alertRef = doc(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts/${activeAlertId}`);
         await updateDocumentNonBlocking(alertRef, { 
             status: 'Resolved',
             resolvedAt: serverTimestamp(),
             notes: 'Resolved by resident.' 
         });
         
         toast({ title: "Alert Closed", description: "You have marked the incident as resolved." });
         setActiveAlertId(null);
    }

    return (
        <Card className="bg-red-50 border-red-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                    <Siren className="h-6 w-6 animate-pulse" />
                    Emergency Assistance
                </CardTitle>
                <CardDescription className="text-red-600/80">
                    Press the button below to instantly alert barangay authorities and send your current location.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!activeAlertId ? (
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                        <DialogTrigger asChild>
                            <Button 
                                variant="destructive" 
                                size="lg" 
                                className="w-full h-16 text-lg font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all"
                            >
                                SEND SOS ALERT
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-red-600 flex items-center gap-2"><Siren className="h-5 w-5"/> CONFIRM SOS ALERT</DialogTitle>
                                <DialogDescription>
                                    This will send your location and details to the Barangay Response Team immediately.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nature of Emergency</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Medical">Medical Emergency</SelectItem>
                                            <SelectItem value="Fire">Fire</SelectItem>
                                            <SelectItem value="Crime">Crime / Public Safety</SelectItem>
                                            <SelectItem value="Accident">Accident</SelectItem>
                                            <SelectItem value="Unspecified">Other / Unspecified</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Additional Details (Optional)</Label>
                                    <Textarea 
                                        placeholder="Briefly describe what happened..." 
                                        value={message} 
                                        onChange={(e) => setMessage(e.target.value)} 
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Callback Number</Label>
                                    <Input 
                                        placeholder="Enter your phone number" 
                                        value={contactNumber} 
                                        onChange={(e) => setContactNumber(e.target.value)} 
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleSendSOS} disabled={isSending}>
                                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    CONFIRM & SEND
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <div className="space-y-4">
                         <div className="bg-red-100 text-red-800 p-4 rounded-md text-center border border-red-200">
                            <h3 className="font-bold text-lg animate-pulse">ALERT ACTIVE</h3>
                            <p className="text-sm mt-1">Help is on the way. Do not close this app if possible.</p>
                            {activeAlert?.status === 'Acknowledged' && (
                                <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800 border-yellow-200">Received by Admin</Badge>
                            )}
                            {activeAlert?.status === 'Dispatched' && (
                                <div className="mt-4 bg-white p-3 rounded shadow-sm text-left border border-blue-200 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-2 text-blue-700 font-bold mb-2">
                                        <Truck className="h-5 w-5" /> RESPONDER DISPATCHED
                                    </div>
                                    {activeAlert.responderDetails && (
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><span className="font-semibold">Officer:</span> {activeAlert.responderDetails.name}</p>
                                            <p><span className="font-semibold">Vehicle:</span> {activeAlert.responderDetails.vehicleInfo}</p>
                                            <Button size="sm" variant="outline" className="w-full mt-2 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50" asChild>
                                                <a href={`tel:${activeAlert.responderDetails.contactNumber}`}>
                                                    <Phone className="h-4 w-4" /> Call Responder
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                         </div>
                         <div className="space-y-2">
                            <Label>Update Situation</Label>
                            <Textarea 
                                placeholder="Update message..." 
                                value={message} 
                                onChange={(e) => setMessage(e.target.value)} 
                            />
                            <Button onClick={handleUpdateMessage} size="sm" className="w-full">
                                Update Message
                            </Button>
                         </div>
                         <Button variant="outline" size="sm" className="w-full" onClick={handleResolveAlert}>
                            Report Resolved / Close
                         </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


export default function ResidentDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Resident Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome! Access barangay services and stay informed.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
            <EmergencySOSButton />
            <div className="grid md:grid-cols-2 gap-4">
                 <BlotterWidget />
                 <TransparencyBoard />
            </div>
            <ActiveRequests />
            <RecentAnnouncements />
        </div>

        <div className="space-y-8">
             <MyHousehold />
             <RequestDocumentCard />
             <CommunityCalendar />
        </div>
      </div>
    </div>
  );
}
