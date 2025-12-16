
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useInventoryItems, useInventoryBatches, useEHealthRef } from '@/hooks/use-ehealth';
import { MedicineItem, MedicineBatch } from '@/lib/ehealth-types';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useFirestore } from '@/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, AlertTriangle, History, Search, Filter, AlertCircle, Trash2, CalendarIcon, ListPlus, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { serverTimestamp, doc, increment, Timestamp } from 'firebase/firestore';
import { BARANGAY_ID } from '@/hooks/use-barangay-data'; 
import { WithId } from '@/firebase/firestore/use-collection';

// --- Constants ---
const FORM_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Drops', 'Ointment', 'Cream', 'Inhaler', 'Injection', 'Powder', 'Solution'];
const STRENGTH_UNITS = ['mg', 'g', 'mcg', 'mL', 'IU', '%'];
const DISPENSING_UNITS = ['tablet', 'capsule', 'bottle', 'vial', 'sachet', 'box', 'pack', 'pc'];
const SOURCES = ['DOH', 'City Health', 'Donation', 'Purchased', 'Other'];

export default function InventoryPage() {
    const firestore = useFirestore();
    const { data: items, isLoading } = useInventoryItems();
    const { toast } = useToast();
    const itemsRef = useEHealthRef('ehealth_inventory_items');
    const batchesRef = useEHealthRef('ehealth_inventory_batches');

    // State for Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // State for Add Master Item Dialog
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [masterItem, setMasterItem] = useState({
        genericName: '',
        brandName: '',
        strengthValue: '',
        strengthUnit: 'mg',
        formType: 'Tablet',
        dispensingUnit: 'tablet',
        reorderPoint: '10'
    });

    // State for Add Batch Dialog
    const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WithId<MedicineItem> | null>(null);
    const [newBatch, setNewBatch] = useState({
        batchNumber: '',
        expiryDate: '',
        quantityReceived: '0',
        source: 'City Health',
        dateReceived: new Date().toISOString().split('T')[0]
    });

    // Automatically prompt to add batch after creating item
    const [justCreatedItem, setJustCreatedItem] = useState<WithId<MedicineItem> | null>(null);

    const filteredItems = useMemo(() => {
        if (!items) return [];
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLowStock = showLowStockOnly ? (item.totalStock || 0) <= item.reorderPoint : true;
            return matchesSearch && matchesLowStock;
        });
    }, [items, searchTerm, showLowStockOnly]);

    // Handle Master Item Creation
    const handleAddMasterItem = async () => {
        if (!itemsRef) return;
        if (!masterItem.genericName) {
            toast({ variant: "destructive", title: "Missing Name", description: "Generic name is required." });
            return;
        }

        // Construct display name
        const brandPart = masterItem.brandName ? ` (${masterItem.brandName})` : '';
        const strengthPart = masterItem.strengthValue ? ` ${masterItem.strengthValue}${masterItem.strengthUnit}` : '';
        const constructedName = `${masterItem.genericName}${brandPart}${strengthPart} ${masterItem.formType}`;
        const dosage = `${masterItem.strengthValue}${masterItem.strengthUnit}`;

        try {
            const docRef = await addDocumentNonBlocking(itemsRef, {
                name: constructedName,
                genericName: masterItem.genericName,
                brandName: masterItem.brandName,
                dosage: dosage,
                form: masterItem.formType,
                unit: masterItem.dispensingUnit, // Legacy compatibility
                dispensingUnit: masterItem.dispensingUnit,
                reorderPoint: parseInt(masterItem.reorderPoint) || 10,
                totalStock: 0,
                category: 'Medicine',
                createdAt: serverTimestamp()
            });

            // Prepare to prompt for batch
            const newItemStub = { 
                id: docRef.id, 
                name: constructedName, 
                reorderPoint: parseInt(masterItem.reorderPoint) || 10 
            } as WithId<MedicineItem>;
            
            setJustCreatedItem(newItemStub);
            setIsAddItemOpen(false);
            
            // Reset form
            setMasterItem({
                genericName: '',
                brandName: '',
                strengthValue: '',
                strengthUnit: 'mg',
                formType: 'Tablet',
                dispensingUnit: 'tablet',
                reorderPoint: '10'
            });

            toast({ title: "Catalog Updated", description: `${constructedName} added to master list.` });
            
            // Open batch modal immediately
            setTimeout(() => {
                setSelectedItem(newItemStub);
                setIsAddBatchOpen(true);
            }, 500);

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to create item." });
        }
    };

    // Handle Batch Creation
    const handleAddBatch = async () => {
        if (!batchesRef || !selectedItem || !itemsRef || !firestore) return;
        
        const qty = parseInt(newBatch.quantityReceived);
        if (isNaN(qty) || qty <= 0) {
            toast({ variant: "destructive", title: "Invalid Quantity", description: "Quantity must be greater than 0." });
            return;
        }
        if (!newBatch.batchNumber) {
            toast({ variant: "destructive", title: "Missing Batch #", description: "Batch number is required." });
            return;
        }
        if (!newBatch.expiryDate) {
            toast({ variant: "destructive", title: "Missing Expiry", description: "Expiry date is required." });
            return;
        }
        
        const expiry = new Date(newBatch.expiryDate);
        if (expiry < new Date()) {
            toast({ variant: "destructive", title: "Invalid Expiry", description: "Expiry date must be in the future." });
            return;
        }

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
                quantity: qty, // Deprecated but kept for compatibility
                quantityInBatch: qty, // New standard
                status: 'Active',
                source: newBatch.source,
                dateReceived: newBatch.dateReceived ? Timestamp.fromDate(new Date(newBatch.dateReceived)) : serverTimestamp(),
                createdAt: serverTimestamp()
            });

            // 2. Update Parent Total Stock using atomic increment
            const itemDocRef = doc(firestore, `/barangays/${BARANGAY_ID}/ehealth_inventory_items/${itemId}`);
            await updateDocumentNonBlocking(itemDocRef, {
                totalStock: increment(qty)
            });

            setIsAddBatchOpen(false);
            setNewBatch({ 
                batchNumber: '', 
                expiryDate: '', 
                quantityReceived: '0',
                source: 'City Health',
                dateReceived: new Date().toISOString().split('T')[0]
            });
            setJustCreatedItem(null); // Clear context
            toast({ title: "Stock Updated", description: `${qty} units added to ${selectedItem.name}.` });
        } catch (error) {
            console.error("Error adding batch:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update stock." });
        }
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Medicine Inventory</h1>
                    <p className="text-muted-foreground">Manage pharmaceutical stocks, track batches, and monitor expiration dates.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="mr-2 h-4 w-4" /> Add Master Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Add to Master Catalog</DialogTitle>
                                <DialogDescription>Create a new medicine profile. Stock is added separately.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Generic Name <span className="text-red-500">*</span></Label>
                                        <Input 
                                            value={masterItem.genericName} 
                                            onChange={e => setMasterItem({...masterItem, genericName: e.target.value})} 
                                            placeholder="e.g. Paracetamol" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Brand Name (Optional)</Label>
                                        <Input 
                                            value={masterItem.brandName} 
                                            onChange={e => setMasterItem({...masterItem, brandName: e.target.value})} 
                                            placeholder="e.g. Biogesic" 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Strength</Label>
                                        <Input 
                                            type="number" 
                                            value={masterItem.strengthValue} 
                                            onChange={e => setMasterItem({...masterItem, strengthValue: e.target.value})} 
                                            placeholder="500" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit</Label>
                                        <Select value={masterItem.strengthUnit} onValueChange={v => setMasterItem({...masterItem, strengthUnit: v})}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {STRENGTH_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Form</Label>
                                        <Select value={masterItem.formType} onValueChange={v => setMasterItem({...masterItem, formType: v})}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {FORM_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Dispensing Unit</Label>
                                        <Select value={masterItem.dispensingUnit} onValueChange={v => setMasterItem({...masterItem, dispensingUnit: v})}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {DISPENSING_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reorder Point</Label>
                                        <Input 
                                            type="number" 
                                            value={masterItem.reorderPoint} 
                                            onChange={e => setMasterItem({...masterItem, reorderPoint: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddMasterItem}>Save & Add Stock</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters & View Toggle */}
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
                    <div className="h-6 w-px bg-border mx-2 hidden sm:block"></div>
                    <div className="flex items-center bg-background rounded-md border p-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 rounded-sm ${viewMode === 'grid' ? 'bg-muted shadow-sm' : 'text-muted-foreground'}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 rounded-sm ${viewMode === 'list' ? 'bg-muted shadow-sm' : 'text-muted-foreground'}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="text-center py-10">Loading inventory...</div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/10">
                    <p className="text-muted-foreground">No medicines found matching your filters.</p>
                </div>
            ) : viewMode === 'grid' ? (
                // GRID VIEW
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map(item => {
                        const isLowStock = (item.totalStock || 0) <= item.reorderPoint;
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
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full"
                                        onClick={() => { setSelectedItem(item); setIsAddBatchOpen(true); }}
                                    >
                                        <Plus className="mr-2 h-3 w-3"/> Receive New Batch
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                // LIST VIEW
                <div className="rounded-md border bg-white overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category / Form</TableHead>
                                <TableHead className="text-right">Total Stock</TableHead>
                                <TableHead className="text-right">Reorder Point</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => {
                                const isLowStock = (item.totalStock || 0) <= item.reorderPoint;
                                const itemId = item.id;
                                return (
                                    <TableRow key={itemId}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{item.name}</span>
                                                <span className="text-xs text-muted-foreground">{item.dosage}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal">{item.unit}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {item.totalStock || 0}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {item.reorderPoint}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isLowStock ? (
                                                <Badge variant="destructive" className="text-[10px]">Low Stock</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Good</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                    title="Add Batch"
                                                    onClick={() => { setSelectedItem(item); setIsAddBatchOpen(true); }}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" title="Delete Item">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will delete <strong>{item.name}</strong> from the master list. 
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteItem(itemId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* SHARED BATCH DIALOG */}
            <Dialog open={isAddBatchOpen} onOpenChange={setIsAddBatchOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Receive Batch</DialogTitle>
                        <DialogDescription>
                            Adding stock to: <span className="font-semibold text-foreground">{selectedItem?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Batch Number / Lot No. <span className="text-red-500">*</span></Label>
                            <Input 
                                value={newBatch.batchNumber} 
                                onChange={e => setNewBatch({...newBatch, batchNumber: e.target.value})} 
                                placeholder="e.g. B-2023-001" 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Expiry Date <span className="text-red-500">*</span></Label>
                                <Input 
                                    type="date" 
                                    value={newBatch.expiryDate} 
                                    onChange={e => setNewBatch({...newBatch, expiryDate: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantity Received <span className="text-red-500">*</span></Label>
                                <Input 
                                    type="number" 
                                    value={newBatch.quantityReceived} 
                                    onChange={e => setNewBatch({...newBatch, quantityReceived: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Source</Label>
                                <Select value={newBatch.source} onValueChange={v => setNewBatch({...newBatch, source: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Date Received</Label>
                                <Input 
                                    type="date" 
                                    value={newBatch.dateReceived} 
                                    onChange={e => setNewBatch({...newBatch, dateReceived: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddBatchOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddBatch}>Confirm Receipt</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
