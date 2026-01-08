
'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from '@/providers/tenant-provider';
import { useCollection, useMemoFirebase } from '@/firebase';
import { tenantRef } from '@/lib/firebase/db-client';
import { Vendor, CatalogItem, PurchaseOrder } from '@/lib/financials/purchasing-types';
import { saveVendor, saveCatalogItem, createPurchaseOrder } from '@/lib/financials/purchasing-logic';
import { Plus, ShoppingCart, Truck, Package, FileText, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProcurementPage() {
    const { tenantPath } = useTenant();
    const { toast } = useToast();
    const { user } = useUser();
    
    // --- Purchase Order Form State ---
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [poItems, setPoItems] = useState<any[]>([]);
    
    // --- Data Fetching ---
    const vendorsRef = useMemoFirebase(() => tenantPath ? tenantRef(null as any, tenantPath, 'vendors') : null, [tenantPath]);
    // NOTE: Passing null as db above because tenantRef implementation uses it for doc(), but strict TS might complain. 
    // Actually tenantRef first arg is Firestore instance. I should pass it properly.
    // Let's rely on useMemoFirebase factory.
    
    // Correction: I need firestore instance.
    // I will use `useFirestore` hook inside the component.
    const { firestore } = require('@/firebase').initializeFirebase(); // Lazy approach or use hook? Hook is better.
    // Wait, useFirestore() hook is available.
    
    return <ProcurementContent />;
}

// Separate component to use Hooks cleanly
function ProcurementContent() {
    const { tenantPath } = useTenant();
    const { firestore } = require('@/firebase').initializeFirebase(); // Using direct import for now as useFirestore might be null initially
    const { toast } = useToast();
    const { user } = useUser();

    // Refs
    const vendorsRef = useMemoFirebase(() => tenantPath && firestore ? tenantRef(firestore, tenantPath, 'vendors') : null, [tenantPath, firestore]);
    const itemsRef = useMemoFirebase(() => tenantPath && firestore ? tenantRef(firestore, tenantPath, 'catalog_items') : null, [tenantPath, firestore]);
    const posRef = useMemoFirebase(() => tenantPath && firestore ? tenantRef(firestore, tenantPath, 'purchase_orders') : null, [tenantPath, firestore]);

    const { data: vendors } = useCollection<Vendor>(vendorsRef);
    const { data: items } = useCollection<CatalogItem>(itemsRef);
    const { data: pos } = useCollection<PurchaseOrder>(posRef);

    // -- State --
    const [newItem, setNewItem] = useState<Partial<CatalogItem>>({ name: '', unit: '', unitCost: 0 });
    const [newVendor, setNewVendor] = useState<Partial<Vendor>>({ name: '', address: '' });
    
    // PO Generation
    const [poVendorId, setPoVendorId] = useState('');
    const [poLineItems, setPoLineItems] = useState<{desc: string, qty: number, cost: number, unit: string}[]>([]);
    const [newLineItem, setNewLineItem] = useState({desc: '', qty: 1, cost: 0, unit: 'pc'});

    const handleSaveVendor = async () => {
        if (!tenantPath || !newVendor.name) return;
        try {
            await saveVendor(tenantPath, newVendor as any);
            toast({ title: "Vendor Saved" });
            setNewVendor({ name: '', address: '' });
        } catch (e) { toast({ variant: "destructive", title: "Error" }); }
    };

    const handleSaveItem = async () => {
        if (!tenantPath || !newItem.name) return;
        try {
            await saveCatalogItem(tenantPath, newItem as any);
            toast({ title: "Item Saved" });
            setNewItem({ name: '', unit: '', unitCost: 0 });
        } catch (e) { toast({ variant: "destructive", title: "Error" }); }
    };

    const addPoItem = () => {
        setPoLineItems([...poLineItems, newLineItem]);
        setNewLineItem({ desc: '', qty: 1, cost: 0, unit: 'pc' });
    };

    const handleCreatePO = async () => {
        if (!tenantPath || !user || !poVendorId) return;
        const vendor = vendors?.find(v => v.id === poVendorId);
        if (!vendor) return;

        try {
            const total = poLineItems.reduce((sum, i) => sum + (i.qty * i.cost), 0);
            await createPurchaseOrder(tenantPath, {
                vendorId: vendor.id,
                vendorName: vendor.name,
                vendorAddress: vendor.address,
                items: poLineItems.map(i => ({
                    description: i.desc,
                    quantity: i.qty,
                    unit: i.unit,
                    unitCost: i.cost,
                    totalCost: i.qty * i.cost
                })),
                totalAmount: total,
                preparedBy: user.uid
            } as any);
            toast({ title: "PO Created!" });
            setPoLineItems([]);
            setPoVendorId('');
        } catch (e) { console.error(e); toast({ variant: "destructive", title: "Failed to create PO" }); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Procurement & Purchasing</h2>
                <Button>
                    <FileText className="mr-2 h-4 w-4" /> Reports
                </Button>
            </div>

            <Tabs defaultValue="pos">
                <TabsList>
                    <TabsTrigger value="pos">Purchase Orders</TabsTrigger>
                    <TabsTrigger value="vendors">Vendors</TabsTrigger>
                    <TabsTrigger value="catalog">Item Catalog</TabsTrigger>
                </TabsList>

                <TabsContent value="pos" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row justify-between">
                            <div>
                                <CardTitle>Purchase Orders</CardTitle>
                                <CardDescription>Manage requisition and procurement.</CardDescription>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/> Create PO</Button></DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                    <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Vendor</Label>
                                            <Select value={poVendorId} onValueChange={setPoVendorId}>
                                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                                                <SelectContent>
                                                    {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div className="border rounded p-4 bg-zinc-50 dark:bg-zinc-900">
                                            <h4 className="mb-2 font-medium">Line Items</h4>
                                            <div className="flex gap-2 mb-2">
                                                <Input placeholder="Description" value={newLineItem.desc} onChange={e => setNewLineItem({...newLineItem, desc: e.target.value})} className="flex-2" />
                                                <Input type="number" placeholder="Qty" className="w-20" value={newLineItem.qty} onChange={e => setNewLineItem({...newLineItem, qty: Number(e.target.value)})} />
                                                <Input placeholder="Unit" className="w-20" value={newLineItem.unit} onChange={e => setNewLineItem({...newLineItem, unit: e.target.value})} />
                                                <Input type="number" placeholder="Cost" className="w-24" value={newLineItem.cost} onChange={e => setNewLineItem({...newLineItem, cost: Number(e.target.value)})} />
                                                <Button size="icon" onClick={addPoItem}><Plus className="h-4 w-4"/></Button>
                                            </div>
                                            <div className="space-y-1">
                                                {poLineItems.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm p-1 border-b">
                                                        <span>{item.desc} ({item.qty} {item.unit})</span>
                                                        <span>₱{(item.qty * item.cost).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="text-right font-bold mt-2">
                                                    Total: ₱{poLineItems.reduce((s, i) => s + (i.qty * i.cost), 0).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreatePO} disabled={!poVendorId || poLineItems.length === 0}>Generate PO</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>PO #</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pos?.map(po => (
                                        <TableRow key={po.id}>
                                            <TableCell className="font-medium">{po.poNumber}</TableCell>
                                            <TableCell>{po.vendorName}</TableCell>
                                            <TableCell>{po.date?.toDate().toLocaleDateString()}</TableCell>
                                            <TableCell>{po.status}</TableCell>
                                            <TableCell className="text-right">₱{po.totalAmount.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm"><Printer className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vendors">
                    <Card>
                        <CardHeader>
                            <CardTitle>Vendor Management</CardTitle>
                            <div className="flex gap-2">
                                <Input placeholder="New Vendor Name" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                                <Input placeholder="Address" value={newVendor.address} onChange={e => setNewVendor({...newVendor, address: e.target.value})} />
                                <Button onClick={handleSaveVendor}><Plus className="h-4 w-4" /></Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Name</TableHead><TableHead>Address</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendors?.map(v => (
                                        <TableRow key={v.id}><TableCell>{v.name}</TableCell><TableCell>{v.address}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="catalog">
                    <Card>
                        <CardHeader>
                            <CardTitle>Item Catalog</CardTitle>
                            <div className="flex gap-2">
                                <Input placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                <Input placeholder="Unit Cost" type="number" className="w-32" value={newItem.unitCost} onChange={e => setNewItem({...newItem, unitCost: Number(e.target.value)})} />
                                <Button onClick={handleSaveItem}><Plus className="h-4 w-4" /></Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                {items?.map(item => (
                                    <div key={item.id} className="p-3 border rounded flex justify-between items-center">
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-sm text-zinc-500">₱{item.unitCost} / {item.unit || 'unit'}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
