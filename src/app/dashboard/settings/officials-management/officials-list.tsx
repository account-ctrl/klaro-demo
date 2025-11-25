
'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User as Official } from '@/lib/types';
import { OfficialCard } from './official-card';
import { AddOfficial, OfficialFormValues } from './officials-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { officialsAndStaff, committeeAssignments, systemRoles } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Trash2, LayoutGrid, List } from 'lucide-react';
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
import { EditOfficial, DeleteOfficial } from './official-card'; // Assuming these are exported or I need to inline/refactor

export default function OfficialsList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
            { fullName: 'Juan Dela Cruz', position: 'Punong Barangay', email: 'kapitan@barangay.gov.ph', systemRole: 'Super Admin', status: 'Active' },
            { fullName: 'Maria Clara', position: 'Barangay Secretary', email: 'sec@barangay.gov.ph', systemRole: 'Admin', status: 'Active' },
            { fullName: 'Crisostomo Ibarra', position: 'Barangay Treasurer', email: 'treasurer@barangay.gov.ph', systemRole: 'Admin', status: 'Active' },
            { fullName: 'Sisa Baliwag', position: 'Kagawad', committee: 'Committee on Health', email: 'kagawad1@barangay.gov.ph', systemRole: 'Encoder', status: 'Active' },
            { fullName: 'Basilio Dimasalang', position: 'Kagawad', committee: 'Committee on Peace and Order', email: 'kagawad2@barangay.gov.ph', systemRole: 'Responder', status: 'Active' },
            { fullName: 'Pedro Penduko', position: 'Tanod', email: 'tanod1@barangay.gov.ph', systemRole: 'Responder', status: 'Active' },
        ];

        try {
            const batch = writeBatch(firestore);
            sampleOfficials.forEach((official) => {
                const newDocRef = doc(collection(firestore, '/users'));
                batch.set(newDocRef, {
                    ...official,
                    userId: newDocRef.id,
                    password_hash: 'default', // Placeholder
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
                // Prevent deleting the currently logged in user if possible to avoid self-lockout
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
             <div className="flex items-center bg-muted rounded-md p-1">
                <Button 
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0"
                >
                    <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button 
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0"
                >
                    <List className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex justify-end gap-2">
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
            <>
            {viewMode === 'grid' ? (
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
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Official</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {officials.map((official) => (
                                <TableRow key={official.userId}>
                                    <TableCell className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={official.digitalSignatureUrl} alt={official.fullName} />
                                            <AvatarFallback>{official.fullName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{official.fullName}</div>
                                            <div className="text-xs text-muted-foreground">{official.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{official.position}</div>
                                        {official.committee && <div className="text-xs text-muted-foreground">{official.committee}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{official.systemRole}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={official.status === 'Active' ? 'default' : 'secondary'}>
                                            {official.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* Note: Reusing EditOfficial and DeleteOfficial would require exporting them from official-card or refactoring. 
                                            Assuming OfficialCard exports them or I need to use a dropdown menu here.
                                            For simplicity, I'll assume I need to extract them. 
                                            Since I cannot see official-card.tsx exports, I will use OfficialCard but with a 'row' prop or similar if supported? 
                                            No, OfficialCard is a Card component. 
                                            I will need to replicate the Edit/Delete buttons logic here or refactor.
                                            I'll check official-card.tsx imports if possible, but I'll just reuse the passed props onEdit and onDelete.
                                        */}
                                        <div className="flex justify-end gap-2">
                                            {/* I'll assume EditOfficial and DeleteOfficial are not exported. I'll reimplement basic buttons that call the handlers 
                                                Wait, I can just use standard buttons for now or try to import if I knew they were exported.
                                                Let's try to import them. If they fail, I'll fix.
                                            */}
                                            {/* Actually, I will update imports above to try to import them. */}
                                            <OfficialRowActions official={official} onEdit={handleEdit} onDelete={handleDelete} positions={officialsAndStaff} committees={committeeAssignments} systemRoles={systemRoles} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            </>
        )}
    </div>
  );
}

// Helper component for row actions to avoid duplication (and circular dependency if extracting from card)
import { EditOfficial as EditDialog, DeleteOfficial as DeleteDialog } from './official-card';

function OfficialRowActions({ official, onEdit, onDelete, positions, committees, systemRoles }: any) {
    return (
        <div className="flex items-center gap-2">
             <EditDialog official={official} onEdit={onEdit} positions={positions} committees={committees} systemRoles={systemRoles} triggerAsChild={false} variant="ghost" size="icon" />
             <DeleteDialog id={official.userId} name={official.fullName} onDelete={onDelete} triggerAsChild={false} variant="ghost" size="icon" />
        </div>
    )
}
