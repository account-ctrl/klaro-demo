
'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User as Official } from '@/lib/types';
import { OfficialCard } from './official-card';
import { AddOfficial, OfficialFormValues, EditOfficial } from './officials-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { officialsAndStaff, committeeAssignments, systemRoles } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Trash2, LayoutGrid, List, FilePen } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export default function OfficialsList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

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

    const handleLoadDefaults = async () => {
        if (!firestore) return;

        const sampleOfficials = [
            { fullName: 'Juan Dela Cruz', position: 'Punong Barangay (Barangay Captain)', email: 'kapitan@barangay.gov.ph', systemRole: 'Super Admin', status: 'Active' },
            { fullName: 'Maria Clara', position: 'Barangay Secretary', email: 'sec@barangay.gov.ph', systemRole: 'Admin', status: 'Active' },
            { fullName: 'Crisostomo Ibarra', position: 'Barangay Treasurer', email: 'treasurer@barangay.gov.ph', systemRole: 'Admin', status: 'Active' },
            { fullName: 'Sisa Baliwag', position: 'Sangguniang Barangay Member (Barangay Kagawad)', committee: 'Committee on Health & Sanitation', email: 'kagawad1@barangay.gov.ph', systemRole: 'Encoder', status: 'Active' },
            { fullName: 'Basilio Dimasalang', position: 'Sangguniang Barangay Member (Barangay Kagawad)', committee: 'Committee on Peace and Order & Public Safety', email: 'kagawad2@barangay.gov.ph', systemRole: 'Responder', status: 'Active' },
            { fullName: 'Pedro Penduko', position: 'Barangay Tanod (BPSO - Barangay Public Safety Officer)', email: 'tanod1@barangay.gov.ph', systemRole: 'Responder', status: 'Active' },
        ];

        try {
            const batch = writeBatch(firestore);
            sampleOfficials.forEach((official) => {
                const newDocRef = doc(collection(firestore, '/users'));
                batch.set(newDocRef, {
                    ...official,
                    userId: newDocRef.id,
                    password_hash: 'default', 
                });
            });
            await batch.commit();
            toast({ title: "Sample Data Loaded", description: "Default officials and staff have been added." });
        } catch (error) {
            console.error("Error loading defaults:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load sample data." });
        }
    };

    const handleClearAll = async () => {
        if (!firestore || !officials) return;
        
        try {
            const batch = writeBatch(firestore);
            officials.forEach((official) => {
                if (official.userId !== user?.uid) {
                    const docRef = doc(firestore, `/users/${official.userId}`);
                    batch.delete(docRef);
                }
            });
            await batch.commit();
            toast({ variant: "destructive", title: "Data Cleared", description: "All officials (except yourself) have been removed." });
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
                <Button variant="outline" onClick={handleLoadDefaults}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Load Samples
                </Button>
                <Button variant="destructive" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleClearAll} disabled={!officials || officials.length <= 1}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                </Button>
                <AddOfficial 
                    onAdd={handleAdd} 
                    positions={officialsAndStaff} 
                    committees={committeeAssignments} 
                    systemRoles={systemRoles} 
                />
            </div>
        </div>
        
        {!officials || officials.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10">
                No officials found. Click "Add Official" or "Load Samples" to get started.
            </div>
        ) : (
            viewMode === 'card' ? (
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
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Committee</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {officials.map((official) => (
                                <TableRow key={official.userId}>
                                    <TableCell className="font-medium flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            {/* <AvatarImage src={official.avatarUrl} /> */}
                                            <AvatarFallback>{official.fullName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {official.fullName}
                                    </TableCell>
                                    <TableCell>{official.position}</TableCell>
                                    <TableCell>{official.committee || '-'}</TableCell>
                                    <TableCell>{official.systemRole}</TableCell>
                                    <TableCell>
                                        <Badge variant={official.status === 'Active' ? 'default' : 'secondary'}>
                                            {official.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Pass EditOfficial with trigger prop if implemented, or standard button */}
                                            <EditOfficial 
                                                record={official} 
                                                onEdit={handleEdit} 
                                                positions={officialsAndStaff} 
                                                committees={committeeAssignments} 
                                                systemRoles={systemRoles} 
                                            />
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete Official?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the record for {official.fullName}.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDelete(official.userId, official.fullName)} className="bg-destructive">
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
