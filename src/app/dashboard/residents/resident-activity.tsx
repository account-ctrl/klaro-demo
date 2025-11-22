
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { CertificateRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

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

export function ResidentActivity({ residentId }: { residentId: string }) {
    const firestore = useFirestore();

    const requestsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/certificate_requests`);
    }, [firestore]);

    const residentRequestsQuery = useMemoFirebase(() => {
        if (!requestsCollectionRef) return null;
        return query(requestsCollectionRef, where('residentId', '==', residentId));
    }, [requestsCollectionRef, residentId]);

    const { data: requests, isLoading } = useCollection<CertificateRequest>(residentRequestsQuery);
    
    const sortedRequests = useMemo(() => {
        return requests?.sort((a, b) => (b.dateRequested?.toMillis() || 0) - (a.dateRequested?.toMillis() || 0));
    }, [requests]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Document Request History</CardTitle>
                <CardDescription>A log of all documents requested by this resident.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh] p-4">
                    {isLoading && (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    )}

                    {!isLoading && (!sortedRequests || sortedRequests.length === 0) && (
                         <div className="flex flex-col items-center justify-center h-40 text-center">
                             <FileText className="h-12 w-12 text-muted-foreground" />
                             <p className="mt-4 text-muted-foreground">No document requests found for this resident.</p>
                         </div>
                    )}
                    
                    {!isLoading && sortedRequests && sortedRequests.length > 0 && (
                        <div className="space-y-4">
                            {sortedRequests.map(req => (
                                <div key={req.requestId} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div>
                                        <p className="font-semibold">{req.certificateName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {req.dateRequested ? format(req.dateRequested.toDate(), 'MMMM d, yyyy') : 'Date not available'}
                                        </p>
                                    </div>
                                    <Badge variant={getStatusBadgeVariant(req.status)}>{req.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
