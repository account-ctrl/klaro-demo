
'use client';

import React from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User as Official } from '@/lib/types';
import { OfficialCard } from './official-card';
import { AddOfficial, OfficialFormValues } from './officials-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { officialsAndStaff, committeeAssignments, systemRoles } from '@/lib/data';


export default function OfficialsList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // The new schema stores users at the root level, not per-barangay
    const officialsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, '/users');
    }, [firestore]);

    const { data: officials, isLoading } = useCollection<Official>(officialsCollectionRef);

    const handleAdd = (newOfficial: OfficialFormValues) => {
        if (!officialsCollectionRef || !user) return;
        
        const docToAdd: Partial<Official> = {
            ...newOfficial,
        };

        addDocumentNonBlocking(officialsCollectionRef, docToAdd)
            .then(docRef => {
                if (docRef) {
                    updateDocumentNonBlocking(docRef, { userId: docRef.id });
                }
            });

        toast({ title: "Official Added", description: `${newOfficial.fullName} has been added.`});
    };

    const handleEdit = (updatedOfficial: Official) => {
        if (!firestore || !updatedOfficial.userId) return;
        const docRef = doc(firestore, `/users/${updatedOfficial.userId}`);
        const { userId, ...dataToUpdate } = updatedOfficial;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Official Updated", description: `The record for ${updatedOfficial.fullName} has been updated.`});
    };

    const handleDelete = (id: string, name: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/users/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Official Deleted", description: `The record for ${name} has been permanently deleted.` });
    };
    
    if (isLoading) {
        return (
             <div className="space-y-4">
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-36" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
                    ))}
                </div>
             </div>
        )
    }

  return (
    <div className="space-y-6">
        <div className="flex justify-end">
            <AddOfficial 
                onAdd={handleAdd} 
                positions={officialsAndStaff} 
                committees={committeeAssignments} 
                systemRoles={systemRoles} 
            />
        </div>
        
        {!officials || officials.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10">
                No officials found. Click "Add Official" to get started.
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {officials.map((official) => (
                    <OfficialCard 
                        key={official.userId} 
                        official={official}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        positions={officialsAndStaff} 
                        committees={committeeAssignments} 
                        systemRoles={systemRoles} 
                    />
                ))}
            </div>
        )}
    </div>
  );
}
