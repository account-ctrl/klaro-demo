
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
import { FileText, Clock, CheckCircle } from "lucide-react";
import { useUser, useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { CertificateRequest, CertificateType, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AddRequest, RequestFormValues } from './request-actions';
import { useToast } from '@/hooks/use-toast';

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


export default function MyRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // 0. Get Tenant ID from User Profile first
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<User>(userDocRef);
  const tenantId = userProfile?.tenantId;

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !tenantId) return null;
    return query(
        // IMPORTANT: Assuming we use the same collection as the dashboard hook ('document_requests')
        // OR the one previously hardcoded ('certificate_requests'). 
        // Let's align with the hook used in dashboard: 'document_requests' 
        // to ensure data consistency across the resident app.
        collection(firestore, `/barangays/${tenantId}/document_requests`),
        where('residentId', '==', user.uid),
        orderBy('dateRequested', 'desc')
    );
  }, [firestore, user, tenantId]);

  const certTypesQuery = useMemoFirebase(() => {
    if(!firestore || !tenantId) return null;
    return collection(firestore, `/barangays/${tenantId}/certificate_types`);
  }, [firestore, tenantId]);

  const { data: requests, isLoading: isLoadingRequests } = useCollection<CertificateRequest>(requestsQuery);
  const { data: certificateTypes, isLoading: isLoadingCertTypes } = useCollection<CertificateType>(certTypesQuery);

  const handleAddRequest = (data: RequestFormValues) => {
    if (!firestore || !user || !certificateTypes || !tenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not submit request.' });
      return;
    }
    const selectedCert = certificateTypes.find(c => c.certTypeId === data.certTypeId);
    if (!selectedCert) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected certificate type is invalid.' });
      return;
    }

    const documentsCollectionRef = collection(firestore, `/barangays/${tenantId}/document_requests`);
    const docToAdd: Omit<CertificateRequest, 'requestId' | 'requestNumber'> = {
        residentId: user.uid,
        residentName: user.displayName || 'Anonymous Resident',
        certTypeId: data.certTypeId,
        certificateName: selectedCert.name,
        purpose: data.purpose,
        status: 'Pending',
        dateRequested: serverTimestamp() as any,
    };

    addDocumentNonBlocking(documentsCollectionRef, docToAdd).then(docRef => {
        if(docRef) {
            const generatedId = `REQ-${Date.now()}`;
            updateDocumentNonBlocking(docRef, { 
                requestId: docRef.id,
                requestNumber: generatedId
            });
        }
    });

    toast({
        title: "Request Submitted!",
        description: `Your request for a ${selectedCert.name} has been sent.`,
    });
  }

  const isLoading = isLoadingRequests || isLoadingCertTypes;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My Document Requests</h1>
          <p className="text-muted-foreground">
            Track the status of all your submitted document requests.
          </p>
        </div>
        <AddRequest onAdd={handleAddRequest} certificateTypes={certificateTypes ?? []} />
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText /> Request History</CardTitle>
            <CardDescription>A log of all your past and present requests.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Date Requested</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {isLoading && [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      </TableRow>
                  ))}
                  {!isLoading && requests && requests.length > 0 ? requests.map((req) => (
                      <TableRow key={req.requestId}>
                          <TableCell className="font-medium">{req.certificateName}</TableCell>
                          <TableCell>{req.dateRequested ? format(req.dateRequested.toDate(), 'PP') : 'N/A'}</TableCell>
                          <TableCell>{req.purpose}</TableCell>
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
                              <TableCell colSpan={4} className="text-center h-24">You haven't made any document requests yet.</TableCell>
                          </TableRow>
                      )
                  )}
              </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
