
'use client';

import { useState, useMemo } from 'react';
import { useFixedAssets, useAssetBookings, useAssetsRef, BARANGAY_ID } from '@/hooks/use-assets';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useFirestore } from '@/firebase';
import { serverTimestamp, doc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Truck, Wrench, Calendar, Plus, Search, AlertTriangle, PenLine, Trash2, Filter } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import { FixedAsset, AssetBooking } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type AssetFormValues = Omit<FixedAsset, 'assetId' | 'createdAt' | 'purchaseDate'> & { purchaseDate?: string };

const initialAssetForm: AssetFormValues = { 
    name: '', 
    type: 'Equipment', 
    status: 'Available', 
    serialNumber: '', 
    plateNumber: '',
    purchaseDate: ''
};

export default function AssetsPage() {
    const firestore = useFirestore();
    const { data: assets, isLoading: isLoadingAssets } = useFixedAssets();
    const { data: bookings } = useAssetBookings();
    const assetsRef = useAssetsRef('fixed_assets');
    const bookingsRef = useAssetsRef('asset_bookings');
    const { toast } = useToast();

    // Sheet States
    const [isAssetSheetOpen, setIsAssetSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);
    const [isBookSheetOpen, setIsBookSheetOpen] = useState(false);
    const [isMaintenanceSheetOpen, setIsMaintenanceSheetOpen] = useState(false);

    // Form States
    const [assetForm, setAssetForm] = useState<AssetFormValues>(initialAssetForm);
    const [newBooking, setNewBooking] = useState({ assetId: '', borrowerName: '', purpose: '', startDateTime: '', endDateTime: '' });
    const [maintenanceForm, setMaintenanceForm] = useState({ assetId: '', status: 'Maintenance', nextMaintenanceDue: '' });

    // Search/Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');

    // --- Asset CRUD ---

    const handleOpenAddAsset = () => {
        setAssetForm(initialAssetForm);
        setIsEditMode(false);
        setCurrentAssetId(null);
        setIsAssetSheetOpen(true);
    };

    const handleOpenEditAsset = (asset: FixedAsset) => {
        setAssetForm({
            name: asset.name,
            type: asset.type,
            status: asset.status,
            serialNumber: asset.serialNumber || '',
            plateNumber: asset.plateNumber || '',
            purchaseDate: asset.purchaseDate ? asset.purchaseDate : ''
        });
        setCurrentAssetId(asset.assetId);
        setIsEditMode(true);
        setIsAssetSheetOpen(true);
    };

    const handleSaveAsset = () => {
        if (!assetForm.name) {
            toast({ title: "Validation Error", description: "Asset name is required.", variant: "destructive" });
            return;
        }

        const dataToSave = {
            ...assetForm,
            purchaseDate: assetForm.purchaseDate || new Date().toISOString(),
        };

        if (isEditMode && currentAssetId && firestore) {
             const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/fixed_assets/${currentAssetId}`);
             setDocumentNonBlocking(docRef, dataToSave, { merge: true });
             toast({ title: "Asset Updated", description: `${assetForm.name} updated successfully.` });
        } else if (assetsRef) {
             addDocumentNonBlocking(assetsRef, {
                 ...dataToSave,
                 createdAt: serverTimestamp()
             });
             toast({ title: "Asset Added", description: `${assetForm.name} added to inventory.` });
        }
        setIsAssetSheetOpen(false);
    };

    const handleDeleteAsset = (id: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/fixed_assets/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ title: "Asset Deleted", description: "The asset has been removed from inventory." });
    };

    // --- Booking Logic ---

    const handleBookAsset = () => {
        if (!bookingsRef || !newBooking.assetId) return;

        const start = new Date(newBooking.startDateTime).getTime();
        const end = new Date(newBooking.endDateTime).getTime();
        
        if (isNaN(start) || isNaN(end) || start >= end) {
             toast({ variant: "destructive", title: "Invalid Time", description: "Please ensure end time is after start time." });
             return;
        }
        
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
            status: 'Approved',
            createdAt: serverTimestamp()
        });

        setIsBookSheetOpen(false);
        setNewBooking({ assetId: '', borrowerName: '', purpose: '', startDateTime: '', endDateTime: '' });
        toast({ title: "Booking Confirmed", description: "Asset scheduled successfully." });
    };

    // --- Maintenance Logic ---

    const handleOpenMaintenance = (asset: FixedAsset) => {
        setMaintenanceForm({
            assetId: asset.assetId,
            status: asset.status === 'Available' ? 'Maintenance' : asset.status,
            nextMaintenanceDue: asset.nextMaintenanceDue || ''
        });
        setIsMaintenanceSheetOpen(true);
    }

    const handleSaveMaintenance = () => {
        if (!firestore || !maintenanceForm.assetId) return;
        
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/fixed_assets/${maintenanceForm.assetId}`);
        setDocumentNonBlocking(docRef, {
            status: maintenanceForm.status,
            nextMaintenanceDue: maintenanceForm.nextMaintenanceDue
        }, { merge: true });

        setIsMaintenanceSheetOpen(false);
        toast({ title: "Status Updated", description: "Vehicle status and maintenance schedule updated." });
    }


    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        return assets.filter(asset => {
            const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === 'All' || asset.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [assets, searchTerm, typeFilter]);


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Assets & Fleet Management</h1>
                    <p className="text-muted-foreground">Track fixed assets, manage vehicle fleet, and schedule equipment usage.</p>
                </div>
            </div>

            <Tabs defaultValue="inventory" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="inventory">Assets Inventory</TabsTrigger>
                    <TabsTrigger value="bookings">Booking Schedule</TabsTrigger>
                    <TabsTrigger value="fleet">Fleet Maintenance</TabsTrigger>
                </TabsList>

                <TabsContent value="inventory" className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/40 p-4 rounded-lg border">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or serial..." 
                                className="pl-9 bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[150px] bg-background">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Types</SelectItem>
                                    <SelectItem value="Vehicle">Vehicle</SelectItem>
                                    <SelectItem value="Equipment">Equipment</SelectItem>
                                    <SelectItem value="Facility">Facility</SelectItem>
                                    <SelectItem value="Furniture">Furniture</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleOpenAddAsset} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="mr-2 h-4 w-4"/> Add Asset
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {isLoadingAssets && <div className="col-span-full text-center py-10 text-muted-foreground">Loading assets...</div>}
                        {!isLoadingAssets && filteredAssets.length === 0 && (
                             <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">No assets found.</div>
                        )}
                        {filteredAssets.map(asset => (
                            <Card key={asset.assetId} className="hover:shadow-md transition-all flex flex-col group relative">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <Badge variant={asset.type === 'Vehicle' ? 'default' : 'outline'}>{asset.type}</Badge>
                                        <Badge variant={asset.status === 'Available' ? 'secondary' : (asset.status === 'Maintenance' ? 'destructive' : 'outline')}>
                                            {asset.status}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-2 text-lg">{asset.name}</CardTitle>
                                    {asset.plateNumber && <CardDescription>Plate: {asset.plateNumber}</CardDescription>}
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p>Serial: {asset.serialNumber || 'N/A'}</p>
                                        <p>Purchased: {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </CardContent>
                                <div className="p-4 pt-0 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button variant="ghost" size="icon" onClick={() => handleOpenEditAsset(asset)} title="Edit">
                                        <PenLine className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently remove <strong>{asset.name}</strong> from the inventory.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteAsset(asset.assetId)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="bookings" className="space-y-4">
                     <div className="flex justify-end">
                         <Button onClick={() => setIsBookSheetOpen(true)}><Calendar className="mr-2 h-4 w-4"/> Book Asset</Button>
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
                                         <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleOpenMaintenance(vehicle)}>
                                             <Wrench className="mr-2 h-3 w-3"/> Update Status / Maintenance
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

            {/* Asset Sheet */}
            <Sheet open={isAssetSheetOpen} onOpenChange={setIsAssetSheetOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{isEditMode ? 'Edit Asset' : 'Add New Asset'}</SheetTitle>
                        <SheetDescription>Enter the details of the asset.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2"><Label>Asset Name *</Label><Input value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} placeholder="e.g. Generator Set 01" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Type</Label>
                                <Select onValueChange={(val) => setAssetForm({...assetForm, type: val as any})} value={assetForm.type}>
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
                                    <Select onValueChange={(val) => setAssetForm({...assetForm, status: val as any})} value={assetForm.status}>
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
                        <div className="space-y-2"><Label>Purchase Date</Label><Input type="date" value={assetForm.purchaseDate ? assetForm.purchaseDate.split('T')[0] : ''} onChange={e => setAssetForm({...assetForm, purchaseDate: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Serial Number</Label><Input value={assetForm.serialNumber} onChange={e => setAssetForm({...assetForm, serialNumber: e.target.value})} /></div>
                        {assetForm.type === 'Vehicle' && (
                                <div className="space-y-2"><Label>Plate Number</Label><Input value={assetForm.plateNumber} onChange={e => setAssetForm({...assetForm, plateNumber: e.target.value})} /></div>
                        )}
                    </div>
                    <SheetFooter>
                        <Button variant="outline" onClick={() => setIsAssetSheetOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAsset}>{isEditMode ? 'Update' : 'Save'}</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Booking Sheet */}
            <Sheet open={isBookSheetOpen} onOpenChange={setIsBookSheetOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Schedule Booking</SheetTitle>
                        <SheetDescription>Reserve an asset for a specific date and time.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
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
                    <SheetFooter>
                        <Button variant="outline" onClick={() => setIsBookSheetOpen(false)}>Cancel</Button>
                        <Button onClick={handleBookAsset}>Confirm Booking</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Maintenance Sheet */}
            <Sheet open={isMaintenanceSheetOpen} onOpenChange={setIsMaintenanceSheetOpen}>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Update Status & Maintenance</SheetTitle>
                        <SheetDescription>Update the vehicle status and maintenance schedule.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2"><Label>Status</Label>
                            <Select onValueChange={(val) => setMaintenanceForm({...maintenanceForm, status: val})} value={maintenanceForm.status}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="In Use">In Use</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                    <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label>Next Maintenance Due</Label><Input type="date" value={maintenanceForm.nextMaintenanceDue} onChange={e => setMaintenanceForm({...maintenanceForm, nextMaintenanceDue: e.target.value})} /></div>
                    </div>
                    <SheetFooter>
                        <Button variant="outline" onClick={() => setIsMaintenanceSheetOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveMaintenance}>Update</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
