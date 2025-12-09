
'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Program } from '@/lib/types';
import { AddProgram, EditProgram, DeleteProgram, ProgramFormValues } from './program-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { samplePrograms } from './_data';
import { RefreshCcw, Trash2, LayoutGrid, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenantContext } from '@/lib/hooks/useTenant';

type ProgramWithId = Program & { id?: string };

// CORRECTED: Changed from 'export default function' to 'export function'
export function ProgramsList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const { tenantPath } = useTenantContext();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    const programsCollectionRef = useMemoFirebase(() => {
        if (!firestore || !tenantPath) return null;
        return collection(firestore, `${tenantPath}/programs`);
    }, [firestore, tenantPath]);
    
    const { data: programs, isLoading } = useCollection<Program>(programsCollectionRef);

    const handleAdd = (newProgram: ProgramFormValues) => {
        if (!programsCollectionRef || !user) return;
        
        addDocumentNonBlocking(programsCollectionRef, newProgram)
            .then(docRef => {
                if (docRef) {
                    updateDocumentNonBlocking(docRef, { programId: docRef.id });
                }
            });

        toast({ title: "Program Added", description: `${newProgram.name} has been created.`});
    };

    const handleEdit = (updatedProgram: ProgramWithId) => {
        const progId = updatedProgram.id || updatedProgram.programId;
        if (!firestore || !progId || !tenantPath) return;
        const docRef = doc(firestore, `${tenantPath}/programs/${progId}`);
        const { programId, id, ...dataToUpdate } = updatedProgram;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Program Updated", description: `Record updated.`});
    };

    const handleDelete = (id: string) => {
        if (!firestore || !tenantPath) return;
        const docRef = doc(firestore, `${tenantPath}/programs/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Program Deleted", description: "The program has been removed." });
    };

    const handleLoadDefaults = async () => {
        if (!firestore || !tenantPath) return;

        try {
            const batch = writeBatch(firestore);
            samplePrograms.forEach((prog) => {
                const newDocRef = doc(collection(firestore, `${tenantPath}/programs`));
                batch.set(newDocRef, {
                    ...prog,
                    programId: newDocRef.id,
                });
            });
            await batch.commit();
            toast({ title: "Sample Programs Loaded", description: "Default PPAs have been added." });
        } catch (error) {
            console.error("Error loading defaults:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load sample data." });
        }
    };

    const handleClearAll = async () => {
        if (!firestore || !programs || !tenantPath) return;
        
        try {
            const batch = writeBatch(firestore);
            programs.forEach((prog) => {
                const progId = (prog as ProgramWithId).id || prog.programId;
                if (progId) {
                    const docRef = doc(firestore, `${tenantPath}/programs/${progId}`);
                    batch.delete(docRef);
                }
            });
            await batch.commit();
            toast({ variant: "destructive", title: "Data Cleared", description: "All programs have been removed." });
        } catch (error) {
             console.error("Error clearing data:", error);
             toast({ variant: "destructive", title: "Error", description: "Failed to clear data." });
        }
    }
    
    if (isLoading) {
        return (
             <div className="space-y-4">
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-36" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
                    ))}
                </div>
             </div>
        )
    }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <div className="flex items-center bg-muted p-1 rounded-lg border">
                <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'card' | 'list') => value && setViewMode(value)} size="sm">
                    <ToggleGroupItem value="card" aria-label="Card view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={handleLoadDefaults}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Load Samples
                </Button>
                <Button variant="destructive" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleClearAll} disabled={!programs || programs.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                </Button>
                <AddProgram onAdd={handleAdd} />
            </div>
        </div>
        
        {!programs || programs.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10 border border-dashed rounded-lg">
                No programs listed. Start by adding a PPA or loading samples.
            </div>
        ) : (
            viewMode === 'card' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {programs.map((prog) => {
                        const progWithId = prog as ProgramWithId;
                        return (
                            <Card key={prog.programId}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{prog.name}</CardTitle>
                                        <Badge>{prog.category}</Badge>
                                    </div>
                                    <CardDescription>{prog.description}</CardDescription>
                                </CardHeader>
                                <CardFooter className="flex gap-2 justify-end">
                                    <EditProgram record={progWithId} onEdit={handleEdit} />
                                    <DeleteProgram recordId={progWithId.id || progWithId.programId} onDelete={handleDelete} />
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Program Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {programs.map((prog) => {
                                const progWithId = prog as ProgramWithId;
                                return (
                                    <TableRow key={prog.programId}>
                                        <TableCell className="font-medium">{prog.name}</TableCell>
                                        <TableCell><Badge variant="outline">{prog.category}</Badge></TableCell>
                                        <TableCell className="max-w-xs truncate">{prog.description}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <EditProgram record={progWithId} onEdit={handleEdit} />
                                                <DeleteProgram recordId={progWithId.id || progWithId.programId} onDelete={handleDelete} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )
        )}
    </div>
  );
}
