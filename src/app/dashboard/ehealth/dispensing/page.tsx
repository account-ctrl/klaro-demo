
'use client';

import { useState, useMemo } from 'react';
import { useResidents } from '@/hooks/use-barangay-data';
import { useInventoryItems, useInventoryBatches, getFefoAllocation, useEHealthRef } from '@/hooks/use-ehealth';
import { BARANGAY_ID } from '@/hooks/use-barangay-data';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, increment } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Pill, User as UserIcon, CheckCircle, AlertCircle, ShoppingCart, Trash2, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface CartItem {
    itemId: string;
    name: string;
    dosage: string;
    quantity: number;
    allocation: { batch: any, deduct: number }[];
}

export default function DispensingPage() {
    const { data: residents } = useResidents();
    const { data: items } = useInventoryItems();
    const { data: allBatches } = useInventoryBatches();
    const logsRef = useEHealthRef('ehealth_dispensing_logs');
    const batchesRef = useEHealthRef('ehealth_inventory_batches');
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResident, setSelectedResident] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Filter Residents
    const filteredResidents = useMemo(() => {
        if (!searchTerm) return [];
        return residents?.filter(r => 
            r.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.lastName.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5) || [];
    }, [residents, searchTerm]);

    const activeResident = useMemo(() => residents?.find(r => r.residentId === selectedResident), [residents, selectedResident]);
    // Use .id here because useCollection injects it
    const activeItem = useMemo(() => items?.find(i => i.id === selectedItem), [items, selectedItem]);

    const addToCart = () => {
        setError(null);
        if (!activeItem || !allBatches) return;

        // Check if already in cart
        // activeItem.id is the document ID, which matches batch.itemId
        if (cart.some(i => i.itemId === activeItem.id)) {
            setError("Item is already in the cart.");
            return;
        }

        // Match batches where batch.itemId equals the item's doc ID
        const itemBatches = allBatches.filter(b => b.itemId === activeItem.id);
        const qty = parseInt(quantity);

        if (qty <= 0) {
            setError("Quantity must be greater than 0.");
            return;
        }

        try {
            const allocation = getFefoAllocation(itemBatches, qty);
            setCart([...cart, {
                itemId: activeItem.id, // Store doc ID as itemId
                name: activeItem.name,
                dosage: activeItem.dosage,
                quantity: qty,
                allocation
            }]);
            
            // Reset input
            setSelectedItem(null);
            setQuantity('1');
        } catch (e: any) {
            setError(e.message);
        }
    };

    const removeFromCart = (itemId: string) => {
        setCart(cart.filter(i => i.itemId !== itemId));
    };

    const handleDispense = async () => {
        if (!activeResident || cart.length === 0 || !user || !logsRef || !firestore) return;

        try {
            // Process each item in the cart
            for (const item of cart) {
                // Process allocation for this item
                for (const alloc of item.allocation) {
                    // 1. Create Log
                    await addDocumentNonBlocking(logsRef, {
                        residentId: activeResident.residentId,
                        residentName: `${activeResident.firstName} ${activeResident.lastName}`,
                        itemId: item.itemId,
                        itemName: item.name,
                        batchId: alloc.batch.id || alloc.batch.batchId, // Ensure we have the batch doc ID
                        batchNumber: alloc.batch.batchNumber,
                        quantity: alloc.deduct,
                        dispensedByUserId: user.uid,
                        dispensedByUserName: user.displayName || 'Staff',
                        dateDispensed: serverTimestamp()
                    });

                    // 2. Update Batch Quantity
                    // Use alloc.batch.id if available from useCollection
                    const batchId = alloc.batch.id || alloc.batch.batchId;
                    const batchDocRef = doc(firestore, batchesRef.path, batchId);
                    await updateDocumentNonBlocking(batchDocRef, {
                        quantity: increment(-alloc.deduct),
                    });
                }
                
                // 3. Update Parent Item Total Stock
                const itemDocRef = doc(firestore, `/barangays/${BARANGAY_ID}/ehealth_inventory_items/${item.itemId}`);
                await updateDocumentNonBlocking(itemDocRef, {
                    totalStock: increment(-item.quantity)
                });
            }

            toast({ title: "Dispensed Successfully", description: `Prescription issued to ${activeResident.firstName}.` });
            
            // Reset All
            setCart([]);
            setSelectedResident(null);
            setSearchTerm('');
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "Transaction failed." });
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Medicine Dispensing</h1>
                <p className="text-muted-foreground">Issue medicine to residents using FEFO logic.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column: Selection */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Step 1: Patient */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <UserIcon className="h-4 w-4"/> 1. Select Patient
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!activeResident ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Search by name..." 
                                            className="pl-8" 
                                            value={searchTerm} 
                                            onChange={e => setSearchTerm(e.target.value)} 
                                        />
                                    </div>
                                    {searchTerm && (
                                        <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                                            {filteredResidents.map(r => (
                                                <div 
                                                    key={r.residentId} 
                                                    className="p-3 cursor-pointer hover:bg-muted flex justify-between items-center"
                                                    onClick={() => { setSelectedResident(r.residentId); setSearchTerm(''); }}
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">{r.firstName} {r.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{r.gender}, {new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear()} y/o</p>
                                                    </div>
                                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            ))}
                                            {filteredResidents.length === 0 && <div className="p-3 text-sm text-muted-foreground">No residents found.</div>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex justify-between items-center p-3 border rounded-md bg-green-50 border-green-200">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border text-green-700">
                                            <UserIcon size={20}/>
                                        </div>
                                        <div>
                                            <p className="font-bold text-green-900">{activeResident.firstName} {activeResident.lastName}</p>
                                            <p className="text-xs text-green-700">ID: {activeResident.residentId.substring(0,8)}...</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedResident(null)}>Change</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 2: Medicine */}
                    <Card className={!activeResident ? "opacity-50 pointer-events-none" : ""}>
                        <CardHeader className="pb-3">
                             <CardTitle className="text-base flex items-center gap-2">
                                <Pill className="h-4 w-4"/> 2. Add Medicines
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label>Medicine</Label>
                                    <Select value={selectedItem || ''} onValueChange={setSelectedItem}>
                                        <SelectTrigger><SelectValue placeholder="Choose medicine..." /></SelectTrigger>
                                        <SelectContent>
                                            {items?.map(i => (
                                                // Use i.id here as the key and value
                                                <SelectItem key={i.id} value={i.id} disabled={!i.totalStock || i.totalStock <= 0}>
                                                    {i.name} ({i.dosage}) - Stock: {i.totalStock || 0}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-[100px] space-y-2">
                                    <Label>Qty</Label>
                                    <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                                </div>
                            </div>
                            
                            {error && (
                                <Alert variant="destructive" className="py-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle className="text-sm font-semibold">Cannot Add</AlertTitle>
                                    <AlertDescription className="text-xs">{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button onClick={addToCart} disabled={!selectedItem} className="w-full">
                                <Plus className="mr-2 h-4 w-4" /> Add to Prescription
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Cart Summary */}
                <div className="lg:col-span-1">
                    <Card className="h-full flex flex-col">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" /> Summary
                            </CardTitle>
                            <CardDescription>Review items before dispensing.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 py-6 overflow-y-auto max-h-[400px]">
                            {cart.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                    No items added yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.itemId} className="flex flex-col gap-2 p-3 border rounded-md bg-white shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{item.name}</p>
                                                    <Badge variant="outline" className="text-[10px]">{item.dosage}</Badge>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold">x{item.quantity}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => removeFromCart(item.itemId)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="text-[10px] text-muted-foreground space-y-1">
                                                <p className="font-medium text-xs">Batch Allocation:</p>
                                                {item.allocation.map((alloc, idx) => (
                                                    <div key={idx} className="flex justify-between">
                                                        <span>#{alloc.batch.batchNumber}</span>
                                                        <span>-{alloc.deduct}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t pt-4">
                            <Button 
                                className="w-full" 
                                size="lg" 
                                disabled={cart.length === 0 || !activeResident} 
                                onClick={handleDispense}
                            >
                                Confirm Dispense
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
