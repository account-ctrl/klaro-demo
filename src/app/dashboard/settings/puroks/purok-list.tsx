
'use client';

import React from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Purok, User as Official } from '@/lib/types';
import { AddPurok, EditPurok, DeletePurok, PurokFormValues } from './purok-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// In a real multi-tenant app, this would come from the user's session/claims or route.
const BARANGAY_ID = 'barangay_san_isidro';


export default function PurokList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const puroksCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/puroks`);
    }, [firestore]);
    
    const officialsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, '/users');
    }, [firestore]);

    const { data: puroks, isLoading: isLoadingPuroks } = useCollection<Purok>(puroksCollectionRef);
    const { data: officials, isLoading: isLoadingOfficials } = useCollection<Official>(officialsCollectionRef);

    const handleAdd = (newPurok: PurokFormValues) => {
        if (!puroksCollectionRef || !user) return;
        
        addDocumentNonBlocking(puroksCollectionRef, newPurok)
            .then(docRef => {
                if (docRef) {
                    updateDocumentNonBlocking(docRef, { purokId: docRef.id, createdAt: serverTimestamp() });
                }
            });

        toast({ title: "Purok Added", description: `${newPurok.name} has been created.`});
    };

    const handleEdit = (updatedPurok: Purok) => {
        if (!firestore || !updatedPurok.purokId) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/puroks/${updatedPurok.purokId}`);
        const { purokId, ...dataToUpdate } = updatedPurok;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Purok Updated", description: `The record for ${updatedPurok.name} has been updated.`});
    };

    const handleDelete = (id: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/puroks/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Purok Deleted", description: "The purok record has been permanently deleted." });
    };
    
    const isLoading = isLoadingPuroks || isLoadingOfficials;

    if (isLoading) {
        return (
             <div className="space-y-4">
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
                    ))}
                </div>
             </div>
        )
    }

  return (
    <div className="space-y-6">
        <div className="flex justify-end">
            <AddPurok onAdd={handleAdd} officials={officials ?? []} />
        </div>
        
        {!puroks || puroks.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10">
                No puroks found. Click "New Purok" to get started.
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {puroks.map((purok) => {
                    const leader = officials?.find(o => o.userId === purok.purokLeaderId);
                    return (
                        <Card key={purok.purokId}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{purok.name}</CardTitle>
                                    {purok.district && <Badge variant="outline">{purok.district}</Badge>}
                                </div>
                                <CardDescription>{purok.description || 'No description provided.'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {leader ? (
                                     <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{leader.fullName.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm">{leader.fullName}</p>
                                            <p className="text-xs text-muted-foreground">Assigned Leader</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <User className="h-10 w-10 p-2 rounded-full bg-muted" />
                                        <div>
                                            <p className="font-semibold text-sm">Unassigned</p>
                                            <p className="text-xs">No leader assigned</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2 items-stretch">
                                <EditPurok record={purok} onEdit={handleEdit} officials={officials ?? []} />
                                <DeletePurok recordId={purok.purokId} onDelete={handleDelete} />
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        )}
    </div>
  );
}
