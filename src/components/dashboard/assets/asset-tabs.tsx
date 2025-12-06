
"use client";

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./asset-columns";
import { FixedAsset, AssetBooking } from "@/lib/types";
import { CalendarView } from './calendar-view';
import { FleetMaintenance } from './fleet-maintenance';

interface AssetTabsProps {
    assets: FixedAsset[];
    isLoading: boolean;
    searchTerm: string;
    typeFilter: string;
    onEdit: (asset: FixedAsset) => void;
    onDelete: (id: string) => void;
    onGenerateQR: (asset: FixedAsset) => void;
    onBook: (booking?: any) => void;
    onOpenMaintenance: (asset: FixedAsset) => void;
    bookings: AssetBooking[];
    onDeleteBooking: (id: string) => void;
}

function AssetList({ assets, typeFilter, searchTerm, onEdit, onDelete, onGenerateQR, onBook, onOpenMaintenance }: any) {
    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        return assets
            .filter(asset => typeFilter === 'All' || asset.type === typeFilter)
            .filter(asset => {
                const term = searchTerm.toLowerCase();
                // Defensive filtering: check if properties exist before calling toLowerCase()
                return (
                    (asset.name && asset.name.toLowerCase().includes(term)) ||
                    (asset.serialNumber && asset.serialNumber.toLowerCase().includes(term)) ||
                    (asset.plateNumber && asset.plateNumber.toLowerCase().includes(term)) ||
                    (asset.custodianName && asset.custodianName.toLowerCase().includes(term)) ||
                    (asset.location && asset.location.toLowerCase().includes(term))
                );
            });
    }, [assets, typeFilter, searchTerm]);

    return (
        <DataTable 
            columns={columns({ onEdit, onDelete, onGenerateQR, onBook, onOpenMaintenance })} 
            data={filteredAssets} 
            filterColumn='name'
            filterPlaceholder='Search by name, S/N, custodian...'
            search={searchTerm} // This seems redundant if filtering is manual?
        />
    );
}

export function AssetTabs(props: AssetTabsProps) {
    return (
        <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Assets</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="calendar">Booking Calendar</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
                 <Card>
                    <CardHeader>
                        <CardTitle>All Assets</CardTitle>
                        <CardDescription>A complete list of all barangay-owned assets and equipment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <AssetList {...props} />
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="inventory">
                 <Card>
                    <CardHeader>
                        <CardTitle>Inventory View</CardTitle>
                        <CardDescription>Detailed list of all assets.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <AssetList {...props} />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="calendar">
                <CalendarView bookings={props.bookings} onBook={props.onBook} onDelete={props.onDeleteBooking} />
            </TabsContent>
            <TabsContent value="maintenance">
                <FleetMaintenance assets={props.assets} onOpenMaintenance={props.onOpenMaintenance} />
            </TabsContent>
        </Tabs>
    );
}
