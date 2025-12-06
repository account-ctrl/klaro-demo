
"use client";

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./asset-columns";
import { FixedAsset, AssetBooking } from "@/lib/types";
import { CalendarView } from './calendar-view';
import { FleetMaintenance } from './fleet-maintenance';
import { AssetList as AssetGrid } from './asset-list';
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from 'lucide-react';

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

function AssetTable({ assets, typeFilter, searchTerm, onEdit, onDelete, onGenerateQR, onBook, onOpenMaintenance }: any) {
    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        return assets
            .filter(asset => typeFilter === 'All' || asset.type === typeFilter)
            .filter(asset => {
                const term = searchTerm.toLowerCase();
                // Defensive filtering
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
            search={searchTerm} 
        />
    );
}

export function AssetTabs(props: AssetTabsProps) {
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    return (
        <Tabs defaultValue="inventory" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pb-2">
                <TabsList className="grid w-full sm:w-auto grid-cols-3">
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    <TabsTrigger value="calendar">Bookings</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="inventory" className="space-y-4">
                 <div className="flex items-center justify-end">
                    <div className="flex items-center space-x-2 bg-muted/50 p-1 rounded-md border">
                        <Button 
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('table')}
                            title="List View"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                 </div>

                 <Card>
                    <CardContent className="p-6">
                       {viewMode === 'table' ? (
                           <AssetTable {...props} />
                       ) : (
                           <AssetGrid 
                                assets={props.assets}
                                isLoading={props.isLoading}
                                searchTerm={props.searchTerm}
                                typeFilter={props.typeFilter}
                                onEdit={props.onEdit}
                                onDelete={props.onDelete}
                                onGenerateQR={props.onGenerateQR}
                           />
                       )}
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
