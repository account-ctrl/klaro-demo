
'use client';

import { useState, useMemo } from 'react';
import { useFixedAssets, useAssetBookings, useAssetsRef, BARANGAY_ID } from '@/hooks/use-assets';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useFirestore } from '@/firebase';
import { serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { FixedAsset } from '@/lib/types';
import { AssetFilters } from '@/components/dashboard/assets/asset-filters';
import { AssetTabs } from '@/components/dashboard/assets/asset-tabs';
import { AssetModals, initialAssetForm } from '@/components/dashboard/assets/asset-modals';

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
    const [isQRSheetOpen, setIsQRSheetOpen] = useState(false);
    const [selectedQRAsset, setSelectedQRAsset] = useState<FixedAsset | null>(null);

    // Form States
    const [assetForm, setAssetForm] = useState(initialAssetForm);
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
            purchaseDate: asset.purchaseDate ? asset.purchaseDate : '',
            location: asset.location || '',
            custodianName: asset.custodianName || '',
            custodianId: asset.custodianId || ''
        });
        setCurrentAssetId(asset.assetId);
        setIsEditMode(true);
        setIsAssetSheetOpen(true);
    };

    const handleSaveAsset = async () => {
        if (!assetForm.name) {
            toast({ title: "Validation Error", description: "Asset name is required.", variant: "destructive" });
            return;
        }

        const dataToSave = {
            ...assetForm,
            purchaseDate: assetForm.purchaseDate || new Date().toISOString(),
        };

        try {
            if (isEditMode && currentAssetId && firestore) {
                 const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/fixed_assets/${currentAssetId}`);
                 await setDocumentNonBlocking(docRef, dataToSave, { merge: true });
                 toast({ title: "Asset Updated", description: `${assetForm.name} updated successfully.` });
            } else if (assetsRef) {
                 await addDocumentNonBlocking(assetsRef, {
                     ...dataToSave,
                     createdAt: serverTimestamp()
                 });
                 toast({ title: "Asset Added", description: `${assetForm.name} added to inventory.` });
            }
            setIsAssetSheetOpen(false);
        } catch (error) {
            console.error("Error saving asset:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save asset." });
        }
    };

    const handleDeleteAsset = async (id: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/fixed_assets/${id}`);
        try {
            await deleteDocumentNonBlocking(docRef);
            toast({ title: "Asset Deleted", description: "The asset has been removed from inventory." });
        } catch (error) {
            console.error("Delete error:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete asset." });
        }
    };

    const handleGenerateQR = (asset: FixedAsset) => {
        setSelectedQRAsset(asset);
        setIsQRSheetOpen(true);
    };

    // --- Booking Logic ---

    const handleBookAsset = async () => {
        if (!bookingsRef) {
             console.error("Booking ref not available");
             return;
        }
        if (!newBooking.assetId) {
             toast({ variant: "destructive", title: "Missing Asset", description: "Please select an asset to book." });
             return;
        }
        if (!newBooking.startDateTime || !newBooking.endDateTime) {
             toast({ variant: "destructive", title: "Missing Dates", description: "Start and End times are required." });
             return;
        }
        if (!newBooking.borrowerName) {
             toast({ variant: "destructive", title: "Missing Borrower", description: "Borrower Name is required." });
             return;
        }
        if (!newBooking.purpose) {
             toast({ variant: "destructive", title: "Missing Purpose", description: "Purpose is required." });
             return;
        }

        const start = new Date(newBooking.startDateTime).getTime();
        const end = new Date(newBooking.endDateTime).getTime();
        
        if (isNaN(start) || isNaN(end)) {
             toast({ variant: "destructive", title: "Invalid Time", description: "Date format is invalid." });
             return;
        }
        if (start >= end) {
             toast({ variant: "destructive", title: "Invalid Time", description: "End time must be after start time." });
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

        try {
            await addDocumentNonBlocking(bookingsRef, {
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
        } catch (e) {
            console.error("Booking failed", e);
            toast({ variant: "destructive", title: "Booking Failed", description: "Could not save booking to database." });
        }
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

    // Calendar Visualization (Simple Timeline)
    const bookingConflicts = useMemo(() => {
        if (!newBooking.assetId || !bookings) return [];
        return bookings.filter(b => 
            b.assetId === newBooking.assetId && 
            ['Approved', 'Pending'].includes(b.status)
        );
    }, [newBooking.assetId, bookings]);
    
    // Check real-time conflict for the form
    const isConflict = useMemo(() => {
        if (!newBooking.startDateTime || !newBooking.endDateTime || !newBooking.assetId) return false;
        const start = new Date(newBooking.startDateTime).getTime();
        const end = new Date(newBooking.endDateTime).getTime();
        return bookingConflicts.some(b => {
             const bStart = new Date(b.startDateTime).getTime();
             const bEnd = new Date(b.endDateTime).getTime();
             return (start < bEnd && end > bStart);
        });
    }, [newBooking, bookingConflicts]);


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Assets & Fleet Management</h1>
                    <p className="text-muted-foreground">Track fixed assets, manage vehicle fleet, and schedule equipment usage.</p>
                </div>
            </div>

            <AssetFilters 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                typeFilter={typeFilter} 
                setTypeFilter={setTypeFilter} 
                onAdd={handleOpenAddAsset} 
            />

            <AssetTabs 
                assets={assets || []} 
                isLoading={isLoadingAssets} 
                searchTerm={searchTerm} 
                typeFilter={typeFilter} 
                onEdit={handleOpenEditAsset} 
                onDelete={handleDeleteAsset} 
                onGenerateQR={handleGenerateQR} 
                onBook={() => setIsBookSheetOpen(true)} 
                onOpenMaintenance={handleOpenMaintenance} 
                bookings={bookings || []} 
            />

            <AssetModals 
                isAssetSheetOpen={isAssetSheetOpen} 
                setIsAssetSheetOpen={setIsAssetSheetOpen} 
                isEditMode={isEditMode} 
                assetForm={assetForm} 
                setAssetForm={setAssetForm} 
                handleSaveAsset={handleSaveAsset} 
                isQRSheetOpen={isQRSheetOpen} 
                setIsQRSheetOpen={setIsQRSheetOpen} 
                selectedQRAsset={selectedQRAsset} 
                isBookSheetOpen={isBookSheetOpen} 
                setIsBookSheetOpen={setIsBookSheetOpen} 
                newBooking={newBooking} 
                setNewBooking={setNewBooking} 
                handleBookAsset={handleBookAsset} 
                isConflict={isConflict} 
                bookingConflicts={bookingConflicts} 
                assets={assets || []} 
                isMaintenanceSheetOpen={isMaintenanceSheetOpen} 
                setIsMaintenanceSheetOpen={setIsMaintenanceSheetOpen} 
                maintenanceForm={maintenanceForm} 
                setMaintenanceForm={setMaintenanceForm} 
                handleSaveMaintenance={handleSaveMaintenance} 
            />
        </div>
    );
}
