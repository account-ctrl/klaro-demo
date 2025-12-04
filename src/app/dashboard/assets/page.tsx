
'use client';

import { useState, useMemo } from 'react';
import { useFixedAssets, useAssetBookings, useAssetsRef } from '@/hooks/use-assets';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Truck, Wrench, Calendar, Plus, Search, AlertTriangle } from 'lucide-react';
import { format, isBefore, parseISO } from 'date-fns';

export default function AssetsPage() {
    const { data: assets } = useFixedAssets();
    const { data: bookings } = useAssetBookings();
    const assetsRef = useAssetsRef('fixed_assets');
    const bookingsRef = useAssetsRef('asset_bookings');
    const { toast } = useToast();

    const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
    const [isBookAssetOpen, setIsBookAssetOpen] = useState(false);
    
    // Forms
    const [newAsset, setNewAsset] = useState({ name: '', type: 'Equipment', status: 'Available', serialNumber: '', plateNumber: '' });
    const [newBooking, setNewBooking] = useState({ assetId: '', borrowerName: '', purpose: '', startDateTime: '', endDateTime: '' });

    const handleAddAsset = () => {
        if (!assetsRef) return;
        addDocumentNonBlocking(assetsRef, {
            name: newAsset.name,
            type: newAsset.type,
            status: newAsset.status,
            serialNumber: newAsset.serialNumber,
            plateNumber: newAsset.plateNumber,
            purchaseDate: new Date().toISOString(),
            createdAt: serverTimestamp()
        });
        setIsAddAssetOpen(false);
        setNewAsset({ name: '', type: 'Equipment', status: 'Available', serialNumber: '', plateNumber: '' });
        toast({ title: "Asset Added", description: `${newAsset.name} added to inventory.` });
    };

    const handleBookAsset = () => {
        if (!bookingsRef || !newBooking.assetId) return;

        // Client-side overlap check
        const start = new Date(newBooking.startDateTime).getTime();
        const end = new Date(newBooking.endDateTime).getTime();
        
        const hasOverlap = bookings?.some(b => {
            if (b.assetId !== newBooking.assetId || b.status === 'Rejected' || b.status === 'Returned') return false;
            const bStart = new Date(b.startDateTime).getTime();
            const bEnd = new Date(b.endDateTime).getTime();
            return (start < bEnd && end > bStart);
        });

        if (hasOverlap) {
            toast({ variant: "destructive", title: "Booking Conflict", description: "Selected time slot overlaps with an existing booking." });
            return;
        }

        const selectedAsset = assets?.find(a => a.assetId === newBooking.assetId);

        addDocumentNonBlocking(bookingsRef, {
            assetId: newBooking.assetId,
            assetName: selectedAsset?.name || 'Unknown Asset',
            borrowerName: newBooking.borrowerName,
            purpose: newBooking.purpose,
            startDateTime: newBooking.startDateTime,
            endDateTime: newBooking.endDateTime,
            status: 'Approved', // Auto-approve for admin
            createdAt: serverTimestamp()
        });

        setIsBookAssetOpen(false);
        setNewBooking({ assetId: '', borrowerName: '', purpose: '', startDateTime: '', endDateTime: '' });
        toast({ title: "Booking Confirmed", description: "Asset scheduled successfully." });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Assets & Fleet Management</h1>
                <p className="text-muted-foreground">Track fixed assets, manage vehicle fleet, and schedule equipment usage.</p>
            </div>

            <Tabs defaultValue="inventory" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="inventory">Assets Inventory</TabsTrigger>
                    <TabsTrigger value="bookings">Booking Schedule</TabsTrigger>
                    <TabsTrigger value="fleet">Fleet Maintenance</TabsTrigger>
                </TabsList>

                <TabsContent value="inventory" className="space-y-4">
                    <div className="flex justify-end">
                         <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
                            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/> Add Asset</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Asset</DialogTitle>
                                    <DialogDescription>Enter the details of the new equipment or vehicle.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label>Asset Name</Label><Input value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. Generator Set 01" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Type</Label>
                                            <Select onValueChange={(val) => setNewAsset({...newAsset, type: val})} defaultValue="Equipment">
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Vehicle">Vehicle</SelectItem>
                                                    <SelectItem value="Equipment">Equipment</SelectItem>
                                                    <SelectItem value="Facility">Facility</SelectItem>
                                                    <SelectItem value="Furniture">Furniture</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2"><Label>Status</Label>
                                             <Select onValueChange={(val) => setNewAsset({...newAsset, status: val})} defaultValue="Available">
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Available">Available</SelectItem>
                                                    <SelectItem value="In Use">In Use</SelectItem>
                                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                                    <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2"><Label>Serial Number (Optional)</Label><Input value={newAsset.serialNumber} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} /></div>
                                    {newAsset.type === 'Vehicle' && (
                                         <div className="space-y-2"><Label>Plate Number</Label><Input value={newAsset.plateNumber} onChange={e => setNewAsset({...newAsset, plateNumber: e.target.value})} /></div>
                                    )}
                                </div>
                                <DialogFooter><Button onClick={handleAddAsset}>Save Asset</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {assets?.map(asset => (
                            <Card key={asset.assetId} className="hover:shadow-md transition-all">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <Badge variant={asset.type === 'Vehicle' ? 'default' : 'outline'}>{asset.type}</Badge>
                                        <Badge variant={asset.status === 'Available' ? 'secondary' : (asset.status === 'Maintenance' ? 'destructive' : 'outline')}>
                                            {asset.status}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-2">{asset.name}</CardTitle>
                                    {asset.plateNumber && <CardDescription>Plate: {asset.plateNumber}</CardDescription>}
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground">
                                        <p>Serial: {asset.serialNumber || 'N/A'}</p>
                                        <p>Purchased: {new Date(asset.purchaseDate).toLocaleDateString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="bookings" className="space-y-4">
                     <div className="flex justify-end">
                         <Dialog open={isBookAssetOpen} onOpenChange={setIsBookAssetOpen}>
                            <DialogTrigger asChild><Button><Calendar className="mr-2 h-4 w-4"/> Book Asset</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Schedule Booking</DialogTitle>
                                    <DialogDescription>Reserve an asset for a specific date and time.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label>Select Asset</Label>
                                        <Select onValueChange={(val) => setNewBooking({...newBooking, assetId: val})}>
                                            <SelectTrigger><SelectValue placeholder="Choose asset..." /></SelectTrigger>
                                            <SelectContent>
                                                {assets?.filter(a => a.status !== 'Decommissioned').map(a => (
                                                    <SelectItem key={a.assetId} value={a.assetId}>{a.name} ({a.status})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><Label>Borrower Name</Label><Input value={newBooking.borrowerName} onChange={e => setNewBooking({...newBooking, borrowerName: e.target.value})} placeholder="Resident or Official Name" /></div>
                                    <div className="space-y-2"><Label>Purpose</Label><Input value={newBooking.purpose} onChange={e => setNewBooking({...newBooking, purpose: e.target.value})} /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Start Time</Label><Input type="datetime-local" value={newBooking.startDateTime} onChange={e => setNewBooking({...newBooking, startDateTime: e.target.value})} /></div>
                                        <div className="space-y-2"><Label>End Time</Label><Input type="datetime-local" value={newBooking.endDateTime} onChange={e => setNewBooking({...newBooking, endDateTime: e.target.value})} /></div>
                                    </div>
                                </div>
                                <DialogFooter><Button onClick={handleBookAsset}>Confirm Booking</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Borrower</TableHead>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings?.map(b => (
                                    <TableRow key={b.bookingId}>
                                        <TableCell className="font-medium">{b.assetName}</TableCell>
                                        <TableCell>{b.borrowerName}<div className="text-xs text-muted-foreground">{b.purpose}</div></TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                {format(new Date(b.startDateTime), 'MMM d, h:mm a')} - <br/>
                                                {format(new Date(b.endDateTime), 'MMM d, h:mm a')}
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                                {bookings?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No active bookings.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="fleet" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                         {assets?.filter(a => a.type === 'Vehicle').map(vehicle => (
                             <Card key={vehicle.assetId} className="border-l-4 border-l-blue-500">
                                 <CardHeader>
                                     <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5"/> {vehicle.name}</CardTitle>
                                     <CardDescription>Plate: {vehicle.plateNumber || 'N/A'}</CardDescription>
                                 </CardHeader>
                                 <CardContent>
                                     <div className="space-y-3 text-sm">
                                         <div className="flex justify-between">
                                             <span className="text-muted-foreground">Status</span>
                                             <Badge variant={vehicle.status === 'Available' ? 'secondary' : 'destructive'}>{vehicle.status}</Badge>
                                         </div>
                                         <div className="flex justify-between items-center">
                                             <span className="text-muted-foreground">Next Maintenance</span>
                                             <span className="font-medium flex items-center gap-1">
                                                 {vehicle.nextMaintenanceDue ? new Date(vehicle.nextMaintenanceDue).toLocaleDateString() : 'Not Scheduled'}
                                                 {vehicle.nextMaintenanceDue && isBefore(new Date(vehicle.nextMaintenanceDue), new Date()) && <AlertTriangle className="h-3 w-3 text-destructive"/>}
                                             </span>
                                         </div>
                                         <Button variant="outline" size="sm" className="w-full mt-2">
                                             <Wrench className="mr-2 h-3 w-3"/> Log Maintenance
                                         </Button>
                                     </div>
                                 </CardContent>
                             </Card>
                         ))}
                         {assets?.filter(a => a.type === 'Vehicle').length === 0 && (
                             <div className="col-span-full text-center text-muted-foreground py-12">No vehicles registered in fleet.</div>
                         )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
