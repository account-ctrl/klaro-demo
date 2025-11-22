
'use client';

import React from 'react';
import { collection, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Program } from '@/lib/types';
import { AddProgram, EditProgram, DeleteProgram, ProgramFormValues } from './program-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const BARANGAY_ID = 'barangay_san_isidro';

export default function ProgramsList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const programsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/programs`);
    }, [firestore]);

    const { data: programs, isLoading } = useCollection<Program>(programsCollectionRef);

    const handleAdd = (newProgram: ProgramFormValues) => {
        if (!programsCollectionRef || !user) return;
        
        addDocumentNonBlocking(programsCollectionRef, newProgram)
            .then(docRef => {
                if (docRef) {
                    updateDocumentNonBlocking(docRef, { programId: docRef.id });
                }
            });

        toast({ title: "Program Added", description: `${newProgram.name} has been created.` });
    };

    const handleEdit = (updatedProgram: Program) => {
        if (!firestore || !updatedProgram.programId) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/programs/${updatedProgram.programId}`);
        const { programId, ...dataToUpdate } = updatedProgram;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Program Updated", description: `The record for ${updatedProgram.name} has been updated.` });
    };

    const handleDelete = (id: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/programs/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Program Deleted", description: "The Program/PPA has been permanently deleted." });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <AddProgram onAdd={handleAdd} />
            </div>
            
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PPA Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && [...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && programs && programs.length > 0 ? (
                            programs.map((program) => (
                                <TableRow key={program.programId}>
                                    <TableCell className="font-medium">{program.name}</TableCell>
                                    <TableCell><Badge variant="outline">{program.category}</Badge></TableCell>
                                    <TableCell className="text-muted-foreground">{program.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <EditProgram record={program} onEdit={handleEdit} />
                                            <DeleteProgram recordId={program.programId} onDelete={handleDelete} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No programs found. Click "New Program/PPA" to add one.
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
