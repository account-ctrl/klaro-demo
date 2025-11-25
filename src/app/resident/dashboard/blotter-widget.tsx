'use client';

import React, { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { AlertCircle, FileText, Loader2, Plus } from "lucide-react";
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const BARANGAY_ID = 'barangay_san_isidro';

const INCIDENT_TYPES = [
    "Noise Complaint",
    "Neighborhood Dispute",
    "Property Damage",
    "Lost Item",
    "Suspicious Activity",
    "Garbage/Sanitation",
    "Stray Animal",
    "Other"
];

interface BlotterReport {
    id: string;
    incidentType: string;
    narrative: string;
    incidentDate: any;
    status: string;
    createdAt: any;
}

export function BlotterWidget() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [openDialog, setOpenDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [incidentType, setIncidentType] = useState('');
    const [narrative, setNarrative] = useState('');
    const [incidentDate, setIncidentDate] = useState('');
    const [location, setLocation] = useState('');
    const [respondent, setRespondent] = useState(''); // Who is being complained against (optional)

    // Data Fetching
    const blotterQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/blotter_reports`),
            where('complainantId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    }, [firestore, user]);

    const { data: myReports, isLoading } = useCollection<BlotterReport>(blotterQuery);


    const handleSubmit = async () => {
        if (!user || !firestore) return;
        
        if (!incidentType || !narrative || !incidentDate) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please fill in all required fields." });
            return;
        }

        setIsSubmitting(true);
        try {
            const reportData = {
                incidentType,
                narrative,
                incidentDate: new Date(incidentDate),
                incidentLocation: location,
                respondent: respondent || 'Unknown/Not Applicable',
                complainantId: user.uid,
                complainantName: user.displayName || 'Anonymous',
                status: 'Filed', // Initial status
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDocumentNonBlocking(collection(firestore, `/barangays/${BARANGAY_ID}/blotter_reports`), reportData);
            
            toast({ title: "Report Filed", description: "Your complaint has been submitted successfully." });
            setOpenDialog(false);
            // Reset Form
            setIncidentType('');
            setNarrative('');
            setIncidentDate('');
            setLocation('');
            setRespondent('');
        } catch (e: any) {
            console.error("Error submitting blotter:", e);
            toast({ variant: 'destructive', title: "Submission Failed", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Resolved': return 'default';
            case 'Filed': return 'secondary';
            case 'Under Investigation': return 'destructive'; // Or warning color if available
            default: return 'outline';
        }
    }

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" /> File a Complaint
                    </CardTitle>
                    <CardDescription>Report non-emergency incidents or disputes.</CardDescription>
                </div>
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1"><Plus className="h-4 w-4"/> New Report</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>File Incident Report</DialogTitle>
                            <DialogDescription>
                                Submit a formal complaint to the barangay. For emergencies, please use the SOS button.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type">Incident Type</Label>
                                <Select value={incidentType} onValueChange={setIncidentType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="date">Date & Time of Incident</Label>
                                <Input 
                                    type="datetime-local" 
                                    id="date" 
                                    value={incidentDate} 
                                    onChange={(e) => setIncidentDate(e.target.value)} 
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="location">Location</Label>
                                <Input 
                                    id="location" 
                                    placeholder="Where did it happen?"
                                    value={location} 
                                    onChange={(e) => setLocation(e.target.value)} 
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="respondent">Respondent (Optional)</Label>
                                <Input 
                                    id="respondent" 
                                    placeholder="Name of person involved (if applicable)"
                                    value={respondent} 
                                    onChange={(e) => setRespondent(e.target.value)} 
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="narrative">Details</Label>
                                <Textarea 
                                    id="narrative" 
                                    placeholder="Describe what happened..." 
                                    className="h-24"
                                    value={narrative}
                                    onChange={(e) => setNarrative(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Report
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground">Recent Reports</h4>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Date Filed</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && myReports && myReports.length > 0 ? myReports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium">{report.incidentType}</TableCell>
                                    <TableCell>{report.createdAt ? format(report.createdAt.toDate(), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                !isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                            No complaints filed recently.
                                        </TableCell>
                                    </TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
