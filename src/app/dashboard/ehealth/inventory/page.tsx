
'use client';

import { useState, useMemo } from 'react';
import { useInventoryItems, useInventoryBatches, useEHealthRef } from '@/hooks/use-ehealth';
import { MedicineItem, MedicineBatch } from '@/lib/ehealth-types';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useFirestore } from '@/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, AlertTriangle, History, Search, Filter, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { serverTimestamp, doc, increment } from 'firebase/firestore';
import { BARANGAY_ID } from '@/hooks/use-barangay-data'; 
import { WithId } from '@/firebase/firestore/use-collection';

export default function InventoryPage() {
    const firestore = useFirestore();
    const { data: items, isLoading } = useInventoryItems();
    const { toast } = useToast();
    const itemsRef = useEHealthRef('ehealth_inventory_items');
    const batchesRef = useEHealthRef('ehealth_inventory_batches');

    // State for Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    // State for Add Item Dialog
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', dosage: '', unit: '', reorderPoint: '10' });

    // State for Add Batch Dialog
    const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
    // Note: selectedItem now uses the WithId wrapper type implicitly from the hook data
    const [selectedItem, setSelectedItem] = useState<WithId<MedicineItem> | null>(null);
    const [newBatch, setNewBatch] = useState({ batchNumber: '', expiryDate: '', quantity: '0' });

    const filteredItems = useMemo(() => {
        if (!items) return [];
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            // Note: filtering by low stock relies on item.totalStock being accurate.
            const matchesLowStock = showLowStockOnly ? (item.totalStock || 0) <= item.reorderPoint : true;
            return matchesSearch && matchesLowStock;
        });
    }, [items, searchTerm, showLowStockOnly]);

    const handleAddItem = () => {
        if (!itemsRef) return;
        addDocumentNonBlocking(itemsRef, {
            ...newItem,
            reorderPoint: parseInt(newItem.reorderPoint),
            totalStock: 0,
            createdAt: serverTimestamp()
        });
        setIsAddItemOpen(false);
        setNewItem({ name: '', dosage: '', unit: '', reorderPoint: '10' });
        toast({ title: "Item Added", description: `${newItem.name} added to master inventory.` });
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/ehealth_inventory_items/${itemId}`);
        try {
            await deleteDocumentNonBlocking(docRef);
            toast({ title: "Item Deleted", description: "Inventory item has been removed." });
        } catch (error) {
            console.error("Delete error:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete item." });
        }
    };

    const handleAddBatch = async () => {
        if (!batchesRef || !selectedItem || !itemsRef || !firestore) return;
        const qty = parseInt(newBatch.quantity);
        
        // Use 'id' from useCollection, fallback to 'itemId' if defined, though 'id' is preferred
        const itemId = selectedItem.id; 

        if (!itemId) {
             toast({ variant: "destructive", title: "Error", description: "Item ID is missing." });
             return;
        }

        try {
            // 1. Add Batch
            await addDocumentNonBlocking(batchesRef, {
                itemId: itemId, 
                itemName: selectedItem.name,
                batchNumber: newBatch.batchNumber,
                expiryDate: newBatch.expiryDate,
                quantity: qty,
                status: 'Active',
                createdAt: serverTimestamp()
            });

            // 2. Update Parent Total Stock using atomic increment
            const itemDocRef = doc(firestore, `/barangays/${BARANGAY_ID}/ehealth_inventory_items/${itemId}`);
            await updateDocumentNonBlocking(itemDocRef, {
                totalStock: increment(qty)
            });

            setIsAddBatchOpen(false);
            setNewBatch({ batchNumber: '', expiryDate: '', quantity: '0' });
            toast({ title: "Batch Added", description: `Stock added for ${selectedItem.name}.` });
        } catch (error) {
            console.error("Error adding batch:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update stock." });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Medicine Inventory</h1>
                    <p className="text-muted-foreground">Manage pharmaceutical stocks and monitor expiration dates.</p>
                </div>
                <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" /> Add Master Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add New Medicine</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Generic Name</Label><Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Paracetamol" /></div>
                                <div className="space-y-2"><Label>Dosage</Label><Input value={newItem.dosage} onChange={e => setNewItem({...newItem, dosage: e.target.value})} placeholder="500mg" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Unit</Label><Input value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="Tablet/Syrup" /></div>
                                <div className="space-y-2"><Label>Reorder Point</Label><Input type="number" value={newItem.reorderPoint} onChange={e => setNewItem({...newItem, reorderPoint: e.target.value})} /></div>
                            </div>
                        </div>
                        <DialogFooter><Button onClick={handleAddItem}>Save Item</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-muted/40 p-4 rounded-lg border">
                <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search medicines..." 
                        className="pl-9 bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant={showLowStockOnly ? "secondary" : "outline"} 
                        size="sm"
                        onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                        className={showLowStockOnly ? "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" : ""}
                    >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Low Stock Alerts
                    </Button>
                </div>
            </div>

            {/* Items Grid */}
            {isLoading ? (
                <div className="text-center py-10">Loading inventory...</div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/10">
                    <p className="text-muted-foreground">No medicines found matching your filters.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map(item => {
                        const isLowStock = (item.totalStock || 0) <= item.reorderPoint;
                        // Use item.id (from useCollection) for the key and references
                        const itemId = item.id;

                        return (
                            <Card key={itemId} className={`flex flex-col group relative ${isLowStock ? 'border-red-200 shadow-sm' : ''}`}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                {item.name}
                                                {isLowStock && <Badge variant="destructive" className="text-[10px] h-5">Low Stock</Badge>}
                                            </CardTitle>
                                            <div className="flex gap-2">
                                                <Badge variant="outline">{item.dosage}</Badge>
                                                <Badge variant="secondary" className="font-normal">{item.unit}</Badge>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold">{item.totalStock || 0}</div>
                                            <div className="text-xs text-muted-foreground">Total Qty</div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will delete <strong>{item.name}</strong> from the master list. 
                                                        Existing batches may remain in the database but will be orphaned.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteItem(itemId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="text-xs text-muted-foreground mb-4">
                                        Reorder Point: <span className="font-medium text-foreground">{item.reorderPoint}</span>
                                    </div>
                                    <BatchList itemId={itemId} />
                                </CardContent>
                                <CardFooter className="pt-4 border-t bg-muted/20">
                                    <Dialog open={isAddBatchOpen && selectedItem?.id === itemId} onOpenChange={(open) => { setIsAddBatchOpen(open); if(open) setSelectedItem(item); }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Plus className="mr-2 h-3 w-3"/> Receive New Batch
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Receive Batch: {item.name}</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2"><Label>Batch Number / Lot No.</Label><Input value={newBatch.batchNumber} onChange={e => setNewBatch({...newBatch, batchNumber: e.target.value})} placeholder="e.g. B-2023-001" /></div>
                                                <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={newBatch.expiryDate} onChange={e => setNewBatch({...newBatch, expiryDate: e.target.value})} /></div>
                                                <div className="space-y-2"><Label>Quantity Received</Label><Input type="number" value={newBatch.quantity} onChange={e => setNewBatch({...newBatch, quantity: e.target.value})} /></div>
                                            </div>
                                            <DialogFooter><Button onClick={handleAddBatch}>Confirm Receipt</Button></DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function BatchList({ itemId }: { itemId: string }) {
    const { data: batches } = useInventoryBatches(itemId);
    
    // Only show active batches or recently expired/depleted? 
    // For density, maybe just show the next expiring batch or top 3.
    const activeBatches = batches?.filter(b => b.quantity > 0 || new Date(b.expiryDate) > new Date()) || [];
    
    if (activeBatches.length === 0) return <div className="text-xs text-muted-foreground italic py-2">No active batches.</div>;

    // Sort by expiry (soonest first)
    const sortedBatches = [...activeBatches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()).slice(0, 3);

    return (
        <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-normal">Active Batches (FEFO)</Label>
            <div className="space-y-1">
                {sortedBatches.map(batch => {
                    const isExpiringSoon = new Date(batch.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && new Date(batch.expiryDate) > new Date(); // 90 days warning
                    const isExpired = new Date(batch.expiryDate) < new Date();
                    return (
                        <div key={batch.id || batch.batchId} className="flex justify-between items-center text-xs p-1.5 rounded-md bg-background border">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-muted-foreground">{batch.batchNumber}</span>
                                {isExpiringSoon && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                                {isExpired && <AlertCircle className="h-3 w-3 text-red-500" />}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`${isExpiringSoon ? 'text-orange-600 font-medium' : ''} ${isExpired ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                    {batch.expiryDate}
                                </span>
                                <Badge variant="secondary" className="h-5 px-1.5 min-w-[30px] justify-center">{batch.quantity}</Badge>
                            </div>
                        </div>
                    )
                })}
                {activeBatches.length > 3 && (
                    <div className="text-center text-[10px] text-muted-foreground pt-1">
                        + {activeBatches.length - 3} more batches
                    </div>
                )}
            </div>
        </div>
    )
}
