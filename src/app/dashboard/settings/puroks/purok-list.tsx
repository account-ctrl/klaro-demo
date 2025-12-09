
'use client';

import React, { useState, useEffect } from 'react';
import { 
    collection, 
    doc, 
    serverTimestamp, 
    writeBatch, 
    query, 
    where, 
    onSnapshot,
    DocumentData 
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Purok, User as Official } from '@/lib/types';
import { AddPurok, EditPurok, DeletePurok, PurokFormValues } from './purok-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User, RefreshCcw, Trash2, LayoutGrid, List, FilePen } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { useTenantContext } from '@/lib/hooks/useTenant';

// CORRECTED: Changed from 'export default function' to 'export function'
export function PurokList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const { tenantPath, tenantId } = useTenantContext();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    const puroksCollectionRef = useMemoFirebase(() => {
        if (!firestore || !tenantPath) return null;
        // Ensure path doesn't start with double slash if tenantPath has one
        const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
        return collection(firestore, `${safePath}/puroks`);
    }, [firestore, tenantPath]);
    
    const [officials, setOfficials] = useState<Official[]>([]);
    const [isLoadingOfficials, setIsLoadingOfficials] = useState(true);

    useEffect(() => {
        if(!firestore || !tenantId) {
            setIsLoadingOfficials(false); // Stop loading if requirements aren't met
            return;
        }
        
        // Fetch officials (users) associated with this tenant
        // Assuming 'users' collection is at root and has 'tenantId' field
        const q = query(collection(firestore, 'users'), where('tenantId', '==', tenantId));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ ...doc.data(), userId: doc.id })) as Official[];
            setOfficials(data);
            setIsLoadingOfficials(false);
        }, (error) => {
            console.error("Error fetching officials:", error);
            setIsLoadingOfficials(false);
        });

        return () => unsubscribe();
    }, [firestore, tenantId]);


    const { data: puroks, isLoading: isLoadingPuroks } = useCollection<Purok>(puroksCollectionRef);

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
        if (!firestore || !updatedPurok.purokId || !tenantPath) return;
        const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
        const docRef = doc(firestore, `${safePath}/puroks/${updatedPurok.purokId}`);
        const { purokId, ...dataToUpdate } = updatedPurok;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Purok Updated", description: `The record for ${updatedPurok.name} has been updated.`});
    };

    const handleDelete = (id: string) => {
        if (!firestore || !tenantPath) return;
        const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
        const docRef = doc(firestore, `${safePath}/puroks/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Purok Deleted", description: "The purok record has been permanently deleted." });
    };

    const handleLoadDefaults = async () => {
        if (!firestore || !tenantPath) return;

        const samplePuroks = [
            { name: 'Purok 1', district: 'Centro', description: 'Main commercial area.' },
            { name: 'Purok 2', district: 'Riverside', description: 'Residential area near the river.' },
            { name: 'Purok 3', district: 'Upland', description: 'Agricultural zone.' },
        ];

        try {
            const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
            const batch = writeBatch(firestore);
            const collectionRef = collection(firestore, `${safePath}/puroks`);
            
            samplePuroks.forEach((purok) => {
                const newDocRef = doc(collectionRef); // Use doc(CollectionReference) to generate ID
                batch.set(newDocRef, {
                    ...purok,
                    purokId: newDocRef.id,
                    createdAt: serverTimestamp(),
                });
            });
            await batch.commit();
            toast({ title: "Sample Puroks Loaded", description: "Default purok list has been added." });
        } catch (error) {
            console.error("Error loading defaults:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load sample data." });
        }
    };

    const handleClearAll = async () => {
        if (!firestore || !puroks || !tenantPath) return;
        
        try {
            const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
            const batch = writeBatch(firestore);
            puroks.forEach((purok) => {
                const docRef = doc(firestore, `${safePath}/puroks/${purok.purokId}`);
                batch.delete(docRef);
            });
            await batch.commit();
            toast({ variant: "destructive", title: "Data Cleared", description: "All purok records have been removed." });
        } catch (error) {
             console.error("Error clearing data:", error);
             toast({ variant: "destructive", title: "Error", description: "Failed to clear data." });
        }
    }
    
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
                <Button variant="destructive" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleClearAll} disabled={!puroks || puroks.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                </Button>
                <AddPurok onAdd={handleAdd} officials={officials ?? []} />
            </div>
        </div>
        
        {!puroks || puroks.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10">
                No puroks found. Click "New Purok" or "Load Samples" to get started.
            </div>
        ) : (
            viewMode === 'card' ? (
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
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Purok Name</TableHead>
                                <TableHead>District</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Leader</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {puroks.map((purok) => {
                                const leader = officials?.find(o => o.userId === purok.purokLeaderId);
                                return (
                                    <TableRow key={purok.purokId}>
                                        <TableCell className="font-medium">{purok.name}</TableCell>
                                        <TableCell>{purok.district || '-'}</TableCell>
                                        <TableCell>{purok.description}</TableCell>
                                        <TableCell>
                                            {leader ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="text-[10px]">{leader.fullName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">{leader.fullName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <EditPurok 
                                                    record={purok} 
                                                    onEdit={handleEdit} 
                                                    officials={officials ?? []} 
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
                                                      <AlertDialogTitle>Delete Purok?</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete {purok.name}.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => handleDelete(purok.purokId)} className="bg-destructive">
                                                        Delete
                                                      </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )
        )}
    </div>
  );
}
