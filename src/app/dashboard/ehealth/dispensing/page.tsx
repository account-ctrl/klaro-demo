
'use client';

import { useState, useMemo } from 'react';
import { useResidents } from '@/hooks/use-barangay-data';
import { useInventoryItems, useInventoryBatches, getFefoAllocation, useEHealthRef } from '@/hooks/use-ehealth';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Pill, User as UserIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DispensingPage() {
    const { data: residents } = useResidents();
    const { data: items } = useInventoryItems();
    const { data: allBatches } = useInventoryBatches();
    const logsRef = useEHealthRef('ehealth_dispensing_logs');
    const batchesRef = useEHealthRef('ehealth_inventory_batches');
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResident, setSelectedResident] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [allocationPreview, setAllocationPreview] = useState<{ batch: any, deduct: number }[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const filteredResidents = useMemo(() => {
        if (!searchTerm) return [];
        return residents?.filter(r => 
            r.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.lastName.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5) || [];
    }, [residents, searchTerm]);

    const activeResident = useMemo(() => residents?.find(r => r.residentId === selectedResident), [residents, selectedResident]);
    const activeItem = useMemo(() => items?.find(i => i.itemId === selectedItem), [items, selectedItem]);

    const handleCheckStock = () => {
        setError(null);
        setAllocationPreview(null);
        
        if (!activeItem || !allBatches) return;
        
        const itemBatches = allBatches.filter(b => b.itemId === activeItem.itemId);
        
        try {
            const alloc = getFefoAllocation(itemBatches, parseInt(quantity));
            setAllocationPreview(alloc);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleDispense = () => {
        if (!allocationPreview || !activeResident || !activeItem || !user || !logsRef || !firestore) return;

        // 1. Create Logs & Update Batches
        allocationPreview.forEach(async (alloc) => {
            // Log
            await addDocumentNonBlocking(logsRef, {
                residentId: activeResident.residentId,
                residentName: `${activeResident.firstName} ${activeResident.lastName}`,
                itemId: activeItem.itemId,
                itemName: activeItem.name,
                batchId: alloc.batch.batchId,
                batchNumber: alloc.batch.batchNumber,
                quantity: alloc.deduct,
                dispensedByUserId: user.uid,
                dispensedByUserName: user.displayName || 'Staff',
                dateDispensed: serverTimestamp()
            });

            // Update Batch Quantity
            // Note: We need the full path to update. useEHealthRef gives collection ref. 
            // We construct doc ref manually using firestore instance from hook.
            // Since we are inside the loop and `batchesRef` is for the collection, we can use `doc(batchesRef, id)` if batchesRef was typed as CollectionReference.
            // However, safe way is:
            const batchDocRef = doc(firestore, batchesRef.path, alloc.batch.batchId);
            updateDocumentNonBlocking(batchDocRef, {
                quantity: alloc.batch.quantity - alloc.deduct,
                status: (alloc.batch.quantity - alloc.deduct) <= 0 ? 'Depleted' : 'Active'
            });
        });

        toast({ title: "Dispensed Successfully", description: ` dispensed to ${activeResident.firstName}.` });
        
        // Reset
        setSelectedItem(null);
        setQuantity('1');
        setAllocationPreview(null);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Medicine Dispensing</h1>
                <p className="text-muted-foreground">Issue medicine to residents using FEFO logic.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Step 1: Select Resident */}
                <Card>
                    <CardHeader>
                        <CardTitle>1. Patient Selection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search resident name..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        {searchTerm && (
                            <div className="border rounded-md divide-y">
                                {filteredResidents.map(r => (
                                    <div 
                                        key={r.residentId} 
                                        className={`p-3 cursor-pointer hover:bg-muted flex justify-between items-center ${selectedResident === r.residentId ? 'bg-primary/10' : ''}`}
                                        onClick={() => setSelectedResident(r.residentId)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><UserIcon size={14}/></div>
                                            <div>
                                                <p className="font-medium text-sm">{r.firstName} {r.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{r.gender}, {new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear()} y/o</p>
                                            </div>
                                        </div>
                                        {selectedResident === r.residentId && <CheckCircle className="h-4 w-4 text-primary" />}
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeResident && (
                            <Alert className="bg-green-50 border-green-200">
                                <UserIcon className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">Selected Patient</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    Dispensing to <strong>{activeResident.firstName} {activeResident.lastName}</strong>
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Step 2: Select Medicine */}
                <Card>
                    <CardHeader>
                        <CardTitle>2. Medicine & Quantity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Medicine</Label>
                            <Select value={selectedItem || ''} onValueChange={setSelectedItem}>
                                <SelectTrigger><SelectValue placeholder="Choose medicine..." /></SelectTrigger>
                                <SelectContent>
                                    {items?.map(i => <SelectItem key={i.itemId} value={i.itemId}>{i.name} ({i.dosage})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                        </div>
                        
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Stock Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {allocationPreview && (
                            <div className="mt-4 space-y-2 border rounded-md p-3 bg-muted/20">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch Allocation (FEFO)</p>
                                {allocationPreview.map((alloc, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span>Batch #{alloc.batch.batchNumber} <span className="text-xs text-muted-foreground">(Exp: {alloc.batch.expiryDate})</span></span>
                                        <Badge variant="secondary">-{alloc.deduct}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={handleCheckStock} disabled={!selectedItem || !selectedResident}>Check Stock</Button>
                        <Button onClick={handleDispense} disabled={!allocationPreview}>Confirm & Dispense</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
