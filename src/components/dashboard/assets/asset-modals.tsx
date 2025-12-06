
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FixedAsset } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import {
  LOCATION_OPTIONS,
  OFFICIAL_ROSTER,
} from "@/lib/data";
import { AlertTriangle } from "lucide-react";

export type AssetFormValues = Omit<
  FixedAsset,
  "assetId" | "createdAt" | "purchaseDate"
> & { purchaseDate?: string };

export const initialAssetForm: AssetFormValues = {
  name: "",
  type: "Equipment",
  status: "Available",
  serialNumber: "",
  plateNumber: "",
  purchaseDate: "",
  location: "",
  custodianName: "",
  custodianId: "",
};

interface AssetModalsProps {
  isAssetSheetOpen: boolean;
  setIsAssetSheetOpen: (isOpen: boolean) => void;
  isEditMode: boolean;
  assetForm: AssetFormValues;
  setAssetForm: (form: AssetFormValues) => void;
  handleSaveAsset: () => void;
  isQRSheetOpen: boolean;
  setIsQRSheetOpen: (isOpen: boolean) => void;
  selectedQRAsset: FixedAsset | null;
  isBookSheetOpen: boolean;
  setIsBookSheetOpen: (isOpen: boolean) => void;
  newBooking: any;
  setNewBooking: (booking: any) => void;
  handleBookAsset: () => void;
  isConflict: boolean;
  bookingConflicts: any[];
  assets: FixedAsset[];
  isMaintenanceSheetOpen: boolean;
  setIsMaintenanceSheetOpen: (isOpen: boolean) => void;
  maintenanceForm: any;
  setMaintenanceForm: (form: any) => void;
  handleSaveMaintenance: () => void;
}

export function AssetModals({
  isAssetSheetOpen,
  setIsAssetSheetOpen,
  isEditMode,
  assetForm,
  setAssetForm,
  handleSaveAsset,
  isQRSheetOpen,
  setIsQRSheetOpen,
  selectedQRAsset,
  isBookSheetOpen,
  setIsBookSheetOpen,
  newBooking,
  setNewBooking,
  handleBookAsset,
  isConflict,
  bookingConflicts,
  assets,
  isMaintenanceSheetOpen,
  setIsMaintenanceSheetOpen,
  maintenanceForm,
  setMaintenanceForm,
  handleSaveMaintenance,
}: AssetModalsProps) {
  return (
    <>
      {/* Asset Sheet */}
      <Sheet open={isAssetSheetOpen} onOpenChange={setIsAssetSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Asset" : "Add New Asset"}</SheetTitle>
            <SheetDescription>
              Enter the details of the asset. <br />
              ID and QR code will be generated upon saving.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Asset Name *</Label>
                  <Input
                    value={assetForm.name}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, name: e.target.value })
                    }
                    placeholder="e.g. Generator Set 01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    onValueChange={(val) =>
                      setAssetForm({ ...assetForm, type: val as any })
                    }
                    value={assetForm.type}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vehicle">Vehicle</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Facility">Facility</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    onValueChange={(val) =>
                      setAssetForm({ ...assetForm, status: val as any })
                    }
                    value={assetForm.status}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="In Use">In Use</SelectItem>
                      <SelectItem value="Maintenance">In Maintenance</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="Deployed">Deployed</SelectItem>
                      <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={
                      assetForm.purchaseDate
                        ? assetForm.purchaseDate.split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, purchaseDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input
                    value={assetForm.serialNumber}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, serialNumber: e.target.value })
                    }
                  />
                </div>
                {assetForm.type === "Vehicle" && (
                  <div className="space-y-2">
                    <Label>Plate Number</Label>
                    <Input
                      value={assetForm.plateNumber}
                      onChange={(e) =>
                        setAssetForm({ ...assetForm, plateNumber: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Location and Custodian Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                Logistics & Accountability
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Location / Storage</Label>
                  <Select
                    onValueChange={(val) =>
                      setAssetForm({ ...assetForm, location: val })
                    }
                    value={assetForm.location}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigned Custodian</Label>
                  <Select
                    onValueChange={(val) => {
                      const official = OFFICIAL_ROSTER.find((o) => o.id === val);
                      setAssetForm({
                        ...assetForm,
                        custodianId: val,
                        custodianName: official?.name || "",
                      });
                    }}
                    value={assetForm.custodianId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Official" />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFICIAL_ROSTER.map((official) => (
                        <SelectItem key={official.id} value={official.id}>
                          {official.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAssetSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsset}>
              {isEditMode ? "Update" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* QR Code Sheet */}
      <Sheet open={isQRSheetOpen} onOpenChange={setIsQRSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Asset QR Code</SheetTitle>
            <SheetDescription>
              Scan to view asset details or perform inventory check.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {selectedQRAsset && (
              <>
                <div className="border p-4 bg-white rounded-lg shadow-sm">
                  <QRCodeSVG
                    value={JSON.stringify({
                      id: selectedQRAsset.assetId,
                      name: selectedQRAsset.name,
                    })}
                    size={200}
                    level={"H"}
                    includeMargin={true}
                  />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{selectedQRAsset.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedQRAsset.assetId}
                  </p>
                </div>
                <Button className="w-full" onClick={() => window.print()}>
                  Print Label
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Booking Sheet */}
      <Sheet open={isBookSheetOpen} onOpenChange={setIsBookSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Schedule Booking</SheetTitle>
            <SheetDescription>
              Reserve an asset for a specific date and time.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Select Asset</Label>
              <Select
                onValueChange={(val) =>
                  setNewBooking({ ...newBooking, assetId: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose asset..." />
                </SelectTrigger>
                <SelectContent>
                  {assets
                    ?.filter((a) => a.status !== "Decommissioned")
                    .map((a) => (
                      <SelectItem key={a.assetId} value={a.assetId}>
                        <div className="flex flex-col items-start">
                          <span>{a.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {a.status} • {a.location || "No Location"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visual Calendar Placeholder / Conflict Warning */}
            {isConflict && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Selected time overlaps with an existing reservation!
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={newBooking.startDateTime}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, startDateTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={newBooking.endDateTime}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, endDateTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Borrower Name *</Label>
              <Input
                value={newBooking.borrowerName}
                onChange={(e) =>
                  setNewBooking({ ...newBooking, borrowerName: e.target.value })
                }
                placeholder="Resident or Official Name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Purpose *</Label>
              <Input
                value={newBooking.purpose}
                onChange={(e) =>
                  setNewBooking({ ...newBooking, purpose: e.target.value })
                }
                placeholder="e.g. Official Travel, Event Support"
                required
              />
            </div>

            {/* Simple List of Existing Bookings for this Asset */}
            {bookingConflicts.length > 0 && (
              <div className="border rounded-md p-3 bg-muted/50">
                <p className="text-xs font-medium mb-2">
                  Existing Bookings for this Asset:
                </p>
                <ul className="space-y-1">
                  {bookingConflicts.map((b) => (
                    <li key={b.bookingId} className="text-xs text-muted-foreground">
                      {/* Implement a proper date formatting function */}
                      {b.startDateTime} - {b.endDateTime}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsBookSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBookAsset} disabled={isConflict}>
              Confirm Booking
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Maintenance Sheet */}
      <Sheet open={isMaintenanceSheetOpen} onOpenChange={setIsMaintenanceSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Status & Maintenance</SheetTitle>
            <SheetDescription>
              Update the vehicle status and maintenance schedule.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                onValueChange={(val) =>
                  setMaintenanceForm({ ...maintenanceForm, status: val })
                }
                value={maintenanceForm.status}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="In Use">In Use</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Next Maintenance Due</Label>
              <Input
                type="date"
                value={maintenanceForm.nextMaintenanceDue}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    nextMaintenanceDue: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setIsMaintenanceSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveMaintenance}>Update</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
