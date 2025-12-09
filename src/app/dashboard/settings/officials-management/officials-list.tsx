'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutGrid, List, PlusCircle, Trash2, RefreshCcw, Loader2, UserCheck } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/lib/hooks/useTenant';
import { useTenantProfile } from '@/hooks/use-tenant-profile'; // Import profile hook
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Paths } from '@/lib/firebase/paths';

// CORRECTED IMPORTS
import { AddOfficial, EditOfficial } from './officials-actions';
import { OfficialCard } from './official-card';

// Sample Data
import { officialsAndStaff, committeeAssignments, systemRoles, sampleOfficials } from './_data';

export type Official = {
    id: string;
    name: string;
    position: string;
    committee?: string;
    termStart?: Date;
    termEnd?: Date;
    contact?: string;
    email?: string;
    photoUrl?: string;
    status: 'Active' | 'Inactive' | 'On Leave';
    systemRole?: string;
};

export const OfficialsList = () => {
    const [view, setView] = useState<'card' | 'list'>('card');
    const { toast } = useToast();
    const firestore = useFirestore();
    const { tenant } = useTenant();
    const { profile } = useTenantProfile(); // Access tenant profile settings

    const officialsPath = useMemo(() => {
        if (!tenant) return undefined;
        const root = Paths.getVaultRoot(tenant.province, tenant.city, tenant.barangay);
        return `${root}/officials`;
    }, [tenant]);

    const { data: officials, isLoading, add, update, remove, set } = useCollection<Official>(officialsPath);

    const [isProcessing, setIsProcessing] = useState(false);

    const handleAdd = async (newOfficial: Omit<Official, 'id' | 'status'>) => {
        try {
            await add({ ...newOfficial, status: 'Active' });
            toast({ title: 'Success', description: 'Official has been added.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add official.' });
        }
    };

    const handleEdit = async (updatedOfficial: Official) => {
        try {
            await update(updatedOfficial.id, updatedOfficial);
            toast({ title: 'Success', description: 'Official has been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update official.' });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await remove(id);
            toast({ title: 'Success', description: 'Official has been removed.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove official.' });
        }
    };

    const handleSyncCaptain = async () => {
        if (!firestore || !officialsPath || !profile) return;
        
        // Logic: Check if "Punong Barangay" exists. If not, add using profile.captainProfile
        const captainName = profile.captainProfile?.name || profile.name; // Fallback
        const captainEmail = profile.captainProfile?.email || profile.email;

        if (!captainName) {
             toast({ variant: 'destructive', title: 'Missing Profile', description: 'No Captain profile found in settings.' });
             return;
        }

        const exists = officials?.some(o => o.position === 'Punong Barangay' || o.name === captainName);
        if (exists) {
            toast({ title: 'Already Synced', description: 'The Captain is already in the list.' });
            return;
        }

        setIsProcessing(true);
        try {
            await add({
                name: captainName,
                position: 'Punong Barangay',
                status: 'Active',
                email: captainEmail,
                systemRole: 'Admin',
                termStart: serverTimestamp() as any, // Use server timestamp
                termEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
            } as any);
            
            toast({ title: 'Captain Synced', description: `${captainName} has been added to the officials list.` });
        } catch (error) {
            console.error("Sync Error:", error);
            toast({ variant: 'destructive', title: 'Sync Failed', description: 'Could not add Captain.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLoadDefaults = async () => {
        if (!firestore || !officialsPath) return;
        setIsProcessing(true);
        try {
            const batch = writeBatch(firestore);
            sampleOfficials.forEach(official => {
                const docRef = doc(collection(firestore, officialsPath));
                batch.set(docRef, official);
            });
            await batch.commit();
            toast({ title: 'Success', description: 'Sample officials have been loaded.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load sample data.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleClearAll = async () => {
        if (!firestore || !officialsPath || !officials) return;
        setIsProcessing(true);
        try {
            const batch = writeBatch(firestore);
            officials.forEach(official => {
                const docRef = doc(collection(firestore, officialsPath), official.id);
                batch.delete(docRef);
            });
            await batch.commit();
            toast({ title: 'Success', description: 'All officials have been cleared.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to clear officials.' });
        } finally {
            setIsProcessing(false);
        }
    };


    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            );
        }

        if (!officials || officials.length === 0) {
            return (
                <div className="text-muted-foreground text-center py-10 bg-slate-50 border border-dashed rounded-lg flex flex-col items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">No Officials Listed</h3>
                        <p className="text-sm">This tenant has no registered officials yet.</p>
                    </div>
                    <Button onClick={handleSyncCaptain} variant="default" className="bg-amber-600 hover:bg-amber-700">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Sync Captain Profile
                    </Button>
                </div>
            );
        }

        if (view === 'card') {
            return (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {officials.map(official => (
                        <OfficialCard 
                            key={official.id}
                            official={official}
                            onEdit={handleEdit}
                            onDelete={() => handleDelete(official.id)}
                            positions={officialsAndStaff}
                            committees={committeeAssignments}
                            systemRoles={systemRoles}
                        />
                    ))}
                </div>
            );
        }

        return (
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Committee</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {officials.map(official => (
                            <TableRow key={official.id}>
                                <TableCell className="font-medium">{official.name}</TableCell>
                                <TableCell>{official.position}</TableCell>
                                <TableCell>{official.committee || 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge variant={official.status === 'Active' ? 'default' : 'outline'}>
                                        {official.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <EditOfficial 
                                            record={official} 
                                            onEdit={handleEdit} 
                                            positions={officialsAndStaff} 
                                            committees={committeeAssignments} 
                                            systemRoles={systemRoles} 
                                        />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the record for {official.name}. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(official.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        );
    };

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <ToggleGroup type="single" value={view} onValueChange={(value: 'card' | 'list') => value && setView(value)} size="sm">
                    <ToggleGroupItem value="card" aria-label="Card view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
                
                <div className="flex gap-2">
                    {/* Add Sync Button here too for easy access even if list is not empty */}
                    <Button variant="outline" onClick={handleSyncCaptain} disabled={isProcessing} title="Ensure Captain is in list">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Sync Captain
                    </Button>
                    <Button variant="outline" onClick={handleLoadDefaults} disabled={isProcessing}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Load Samples
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-destructive hover:bg-destructive/10" disabled={isProcessing || !officials || officials.length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear All
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Clear All Officials?</AlertDialogTitle><AlertDialogDescription>This will delete all official records. This is irreversible.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearAll}>Confirm</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AddOfficial 
                        onAdd={handleAdd} 
                        positions={officialsAndStaff} 
                        committees={committeeAssignments} 
                        systemRoles={systemRoles} 
                    />
                </div>
            </div>
            
            {renderContent()}
        </div>
    );
};
