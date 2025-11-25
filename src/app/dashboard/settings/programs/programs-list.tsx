
'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Program } from '@/lib/types';
import { AddProgram, EditProgram, DeleteProgram, ProgramFormValues } from './program-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, LayoutGrid, List, FilePen, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// In a real multi-tenant app, this would come from the user's session/claims or route.
const BARANGAY_ID = 'barangay_san_isidro';


export default function ProgramsList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

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

        toast({ title: "Program Added", description: `${newProgram.name} has been created.`});
    };

    const handleEdit = (updatedProgram: Program) => {
        if (!firestore || !updatedProgram.programId) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/programs/${updatedProgram.programId}`);
        const { programId, ...dataToUpdate } = updatedProgram;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Program Updated", description: `The record for ${updatedProgram.name} has been updated.`});
    };

    const handleDelete = (id: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/programs/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Program Deleted", description: "The program has been permanently deleted." });
    };
    
    if (isLoading) {
        return (
             <div className="space-y-4">
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
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
                <Button 
                    variant={viewMode === 'card' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('card')}
                    className="px-3"
                >
                    <LayoutGrid className="h-4 w-4 mr-2" /> Card
                </Button>
                <Button 
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('list')}
                    className="px-3"
                >
                    <List className="h-4 w-4 mr-2" /> List
                </Button>
            </div>

            <div className="flex gap-2">
                <AddProgram onAdd={handleAdd} />
            </div>
        </div>
        
        {!programs || programs.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10">
                No programs found. Click "New Program" to get started.
            </div>
        ) : (
            viewMode === 'card' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {programs.map((program) => (
                        <Card key={program.programId}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="flex items-center gap-2">
                                        <FolderKanban className="h-5 w-5 text-primary"/>
                                        {program.name}
                                    </CardTitle>
                                    <Badge variant="secondary">{program.category}</Badge>
                                </div>
                                <CardDescription>{program.description || 'No description provided.'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">ID: <span className="font-mono text-xs">{program.programId}</span></p>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2 items-stretch">
                                <EditProgram record={program} onEdit={handleEdit} />
                                <DeleteProgram recordId={program.programId} onDelete={handleDelete} />
                            </CardFooter>
                        </Card>
                    ))}
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
                            {programs.map((program) => (
                                <TableRow key={program.programId}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FolderKanban className="h-4 w-4 text-primary" />
                                        {program.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{program.category}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{program.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <EditProgram 
                                                record={program} 
                                                onEdit={handleEdit} 
                                                trigger={<Button variant="ghost" size="icon"><FilePen className="h-4 w-4"/></Button>}
                                            />
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete Program?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete {program.name}.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDelete(program.programId)} className="bg-destructive">
                                                    Delete
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )
        )}
    </div>
  );
}
