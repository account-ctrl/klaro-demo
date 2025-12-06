
"use client";

import {
  Tabs,  TabsContent,  TabsList,  TabsTrigger,} from "@/components/ui/tabs";
import { AssetList } from "./asset-list";
import { BookingSchedule } from "./booking-schedule";
import { FleetMaintenance } from "./fleet-maintenance";
import { FixedAsset } from "@/lib/types";

interface AssetTabsProps {
  assets: FixedAsset[];
  isLoading: boolean;
  searchTerm: string;
  typeFilter: string;
  onEdit: (asset: FixedAsset) => void;
  onDelete: (assetId: string) => void;
  onGenerateQR: (asset: FixedAsset) => void;
  onBook: () => void;
  onOpenMaintenance: (asset: FixedAsset) => void;
  bookings: any[];
}

export function AssetTabs({
  assets,
  isLoading,
  searchTerm,
  typeFilter,
  onEdit,
  onDelete,
  onGenerateQR,
  onBook,
  onOpenMaintenance,
  bookings,
}: AssetTabsProps) {
  return (
    <Tabs defaultValue="inventory" className="space-y-4">
      <TabsList>
        <TabsTrigger value="inventory">Assets Inventory</TabsTrigger>
        <TabsTrigger value="bookings">Booking Schedule</TabsTrigger>
        <TabsTrigger value="fleet">Fleet Maintenance</TabsTrigger>
      </TabsList>
      <TabsContent value="inventory">
        <AssetList
          assets={assets}
          isLoading={isLoading}
          searchTerm={searchTerm}
          typeFilter={typeFilter}
          onEdit={onEdit}
          onDelete={onDelete}
          onGenerateQR={onGenerateQR}
        />
      </TabsContent>
      <TabsContent value="bookings">
        <BookingSchedule bookings={bookings} onBook={onBook} />
      </TabsContent>
      <TabsContent value="fleet">
        <FleetMaintenance
          assets={assets}
          onOpenMaintenance={onOpenMaintenance}
        />
      </TabsContent>
    </Tabs>
  );
}
