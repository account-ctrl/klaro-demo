
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  onDelete: (id: string) => void;
  onGenerateQR: (asset: FixedAsset) => void;
  onBook: (booking?: any) => void;
  onOpenMaintenance: (asset: FixedAsset) => void;
  bookings: any[];
  onDeleteBooking: (bookingId: string) => void;
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
  onDeleteBooking
}: AssetTabsProps) {
  const filteredAssets = assets.filter(
    (asset) =>
      (asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (typeFilter === "All" || asset.type === typeFilter)
  );

  return (
    <Tabs defaultValue="inventory">
      <TabsList>
        <TabsTrigger value="inventory">Assets Inventory</TabsTrigger>
        <TabsTrigger value="schedule">Booking Schedule</TabsTrigger>
        <TabsTrigger value="fleet">Fleet Maintenance</TabsTrigger>
      </TabsList>
      <TabsContent value="inventory">
        <AssetList
          assets={filteredAssets}
          isLoading={isLoading}
          onEdit={onEdit}
          onDelete={onDelete}
          onGenerateQR={onGenerateQR}
        />
      </TabsContent>
      <TabsContent value="schedule">
        <BookingSchedule bookings={bookings} onBook={onBook} onDeleteBooking={onDeleteBooking} />
      </TabsContent>
      <TabsContent value="fleet">
        <FleetMaintenance assets={assets} onOpenMaintenance={onOpenMaintenance} />
      </TabsContent>
    </Tabs>
  );
}
