
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
import { useTenantContext } from '@/lib/hooks/useTenant'; // Use secure context

export default function OfficialsList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const { tenantPath, tenantId } = useTenantContext(); // SECURE CONTEXT
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    // FIX: Do NOT use '/users' (Global). Use the tenant-scoped collection.
    // However, officials might need login access, so they are hybrid.
    // PATTERN: 
    // 1. Create a shadow profile in the tenant vault for UI listing (this component).
    // 2. The actual Auth user is global, but mapped via 'tenantId'.
    //
    // For this "List" component, we should read from the Tenant Vault's 'officials' subcollection if it exists,
    // OR filter the global 'users' collection by 'tenantId'.
    //
    // SaaS Best Practice: Store "Staff" in the tenant's own DB path for isolation, 
    // and sync critical fields to the global 'users' collection for Auth.
    //
    // CURRENT IMPLEMENTATION (Global Query):
    const officialsCollectionRef = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        // Query global users filtered by THIS tenant.
        // This ensures Captains only see THEIR staff.
        const usersRef = collection(firestore, 'users');
        const q = import('firebase/firestore').then(({ query, where }) => 
             query(usersRef, where('tenantId', '==', tenantId))
        );
        return q;
    }, [firestore, tenantId]);

    // Note: useCollection handles the promise from useMemoFirebase if customized, 
    // but standard hook might expect a direct query. Let's fix the query construction.
    const [officials, setOfficials] = useState<Official[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        if(!firestore || !tenantId) return;
        
        // Manual subscription to ensure complex query works
        const { collection, query, where, onSnapshot } = require('firebase/firestore');
        const q = query(collection(firestore, 'users'), where('tenantId', '==', tenantId));
        
        const unsubscribe = onSnapshot(q, (snapshot: any) => {
            const data = snapshot.docs.map((doc: any) => ({ ...doc.data(), userId: doc.id })) as Official[];
            setOfficials(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, tenantId]);


    const handleAdd = (newOfficial: OfficialFormValues) => {
        if (!firestore || !tenantId) return;
        
        // 1. We create a placeholder user document.
        // In a real app, you'd trigger a Cloud Function to send an invite email.
        const usersRef = collection(firestore, 'users');
        
        const docToAdd: Partial<Official> = {
            ...newOfficial,
            tenantId: tenantId, // CRITICAL: Bind to current tenant
            status: 'Active',
            createdAt: serverTimestamp() as any
        };

        addDocumentNonBlocking(usersRef, docToAdd)
            .then(docRef => {
                if (docRef) {
                    updateDocumentNonBlocking(docRef, { userId: docRef.id });
                }
            });

        toast({ title: "Official Added", description: `${newOfficial.fullName} has been added to the roster.`});
    };

    const handleEdit = (updatedOfficial: Official) => {
        if (!firestore || !updatedOfficial.userId) return;
        
        // Verify ownership (Client-side check, Rules backend check)
        if (updatedOfficial.tenantId !== tenantId) {
             toast({ variant: "destructive", title: "Error", description: "You cannot edit users from another tenant." });
             return;
        }

        const docRef = doc(firestore, 'users', updatedOfficial.userId);
        const { userId, ...dataToUpdate } = updatedOfficial;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Official Updated", description: `Record updated.`});
    };

    const handleDelete = async (id: string, name: string) => {
        if (!firestore) return;
        
        // Best Practice: Don't actually delete the user doc immediately if they have history.
        // Soft delete (disable) is better for audit trails.
        // But if we strictly want to remove them from the list:
        
        // 1. Call API to disable Auth (if they have a login)
        // 2. Delete Firestore Doc
        
        try {
            // For now, simple doc delete (assuming cloud function cleans up auth)
            // Or better: Update status to 'Inactive' / 'Deleted'
            
            // OPTION A: Soft Delete (Recommended)
            // const docRef = doc(firestore, 'users', id);
            // updateDocumentNonBlocking(docRef, { status: 'Archived', tenantId: `${tenantId}_archived` });
            
            // OPTION B: Hard Delete (As requested)
            const docRef = doc(firestore, 'users', id);
            deleteDocumentNonBlocking(docRef);
            
            toast({ title: "Official Removed", description: `${name} has been removed.` });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Failed to remove official." });
        }
    };

    const handleLoadDefaults = async () => {
        if (!firestore || !tenantId) return;

        const sampleOfficials = [
            { fullName: 'Sample Secretary', position: 'Barangay Secretary', email: `sec.${tenantId.substring(0,5)}@demo.gov`, systemRole: 'Admin', status: 'Active' },
            { fullName: 'Sample Treasurer', position: 'Barangay Treasurer', email: `treas.${tenantId.substring(0,5)}@demo.gov`, systemRole: 'Admin', status: 'Active' },
        ];

        try {
            const batch = writeBatch(firestore);
            sampleOfficials.forEach((official) => {
                const newDocRef = doc(collection(firestore, 'users'));
                batch.set(newDocRef, {
                    ...official,
                    userId: newDocRef.id,
                    tenantId: tenantId, // Bind to Tenant
                    password_hash: 'default', 
                });
            });
            await batch.commit();
            toast({ title: "Defaults Loaded", description: "Sample officials added." });
        } catch (error) {
            console.error("Error loading defaults:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load sample data." });
        }
    };

    const handleClearAll = async () => {
        if (!firestore || !officials) return;
        
        try {
            const batch = writeBatch(firestore);
            let count = 0;
            officials.forEach((official) => {
                // Protect the current user from deleting themselves
                if (official.userId !== user?.uid && official.tenantId === tenantId) {
                    const docRef = doc(firestore, 'users', official.userId);
                    batch.delete(docRef);
                    count++;
                }
            });
            
            if(count > 0) {
                await batch.commit();
                toast({ title: "Cleared", description: `${count} officials removed.` });
            } else {
                toast({ title: "No Action", description: "No other officials to remove." });
            }
        } catch (error) {
             console.error("Error clearing data:", error);
             toast({ variant: "destructive", title: "Error", description: "Failed to clear data." });
        }
    }
    
    if (loading) {
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
             <div className="text-muted-foreground col-span-full text-center py-10 bg-slate-50 border border-dashed rounded-lg">
                <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-16 w-16 bg-slate-200 text-slate-400">
                        <AvatarFallback><List className="h-8 w-8" /></AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-lg text-slate-700">No Officials Listed</h3>
                    <p className="max-w-sm text-sm">This tenant has no registered officials yet. Add your staff to grant them access.</p>
                </div>
            </div>
        ) : (
            viewMode === 'card' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {officials.map((official) => (
                        <OfficialCard 
                            key={official.userId} 
                            official={official}
                            onEdit={handleEdit}
                            onDelete={(id) => handleDelete(id, official.fullName)}
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
