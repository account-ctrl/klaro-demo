
'use client';

import React from 'react';
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
import { FileText, Megaphone, CheckCircle, Clock } from "lucide-react";
import { RequestDocumentCard } from "./request-document-card";
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { CertificateRequest, Announcement } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

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
            <ActiveRequests />
            <RecentAnnouncements />
        </div>

        <div className="space-y-8">
            <RequestDocumentCard />
        </div>
      </div>
    </div>
  );
}
