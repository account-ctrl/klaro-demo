
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FixedAsset } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import {
  LOCATION_OPTIONS,
  OFFICIAL_ROSTER,
} from "@/lib/data";
import { AlertTriangle } from "lucide-react";

export type AssetFormValues = Omit<
  FixedAsset,
  "assetId" | "createdAt" | "updatedAt" | "barangayId"
>;

export const initialAssetForm: AssetFormValues = {
  name: "",
  type: "Equipment",
  status: "Available",
  serialNumber: "",
  brand: "",
  model: "",
  plateNumber: "",
  chassisNumber: "",
  engineNumber: "",
  purchaseDate: new Date().toISOString().split("T")[0],
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
    isEditBooking?: boolean;
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
  isEditBooking
}: AssetModalsProps) {
  return (
    <>
      {/* Asset Form Sheet */}
      <Sheet open={isAssetSheetOpen} onOpenChange={setIsAssetSheetOpen}>
        <SheetContent className="sm:max-w-[550px]">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Asset" : "Add New Asset"}</SheetTitle>
            <SheetDescription>
              {isEditMode
                ? "Update the details of the existing asset."
                : "Fill in the form to add a new asset to the inventory."}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={assetForm.name}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={assetForm.type}
                onValueChange={(value) =>
                  setAssetForm({ ...assetForm, type: value as any })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vehicle">Vehicle</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Facility">Facility</SelectItem>
                  <SelectItem value="Furniture">Furniture</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assetForm.type === "Vehicle" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="brand" className="text-right">Brand</Label>
                    <Input id="brand" value={assetForm.brand} onChange={e => setAssetForm({...assetForm, brand: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="model" className="text-right">Model</Label>
                    <Input id="model" value={assetForm.model} onChange={e => setAssetForm({...assetForm, model: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="plateNumber" className="text-right">Plate No.</Label>
                    <Input id="plateNumber" value={assetForm.plateNumber} onChange={e => setAssetForm({...assetForm, plateNumber: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="chassisNumber" className="text-right">Chassis No.</Label>
                    <Input id="chassisNumber" value={assetForm.chassisNumber} onChange={e => setAssetForm({...assetForm, chassisNumber: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="engineNumber" className="text-right">Engine No.</Label>
                    <Input id="engineNumber" value={assetForm.engineNumber} onChange={e => setAssetForm({...assetForm, engineNumber: e.target.value})} className="col-span-3" />
                </div>
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serialNumber" className="text-right">
                Serial No.
              </Label>
              <Input
                id="serialNumber"
                value={assetForm.serialNumber}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, serialNumber: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="custodian" className="text-right">Custodian</Label>
                <Select onValueChange={(val) => setAssetForm({...assetForm, custodianId: val, custodianName: OFFICIAL_ROSTER.find(o=>o.id === val)?.name || ''})} value={assetForm.custodianId}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Assign a person" />
                    </SelectTrigger>
                    <SelectContent>
                        {OFFICIAL_ROSTER.map(person => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Select
                value={assetForm.location}
                onValueChange={(value) =>
                  setAssetForm({ ...assetForm, location: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select location" />
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchaseDate" className="text-right">
                Purchase Date
              </Label>
              <Input
                id="purchaseDate"
                type="date"
                value={assetForm.purchaseDate}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, purchaseDate: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleSaveAsset}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* QR Code Sheet */}
      <Sheet open={isQRSheetOpen} onOpenChange={setIsQRSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Asset QR Code</SheetTitle>
            <SheetDescription>
              Scan this code to quickly view asset details and history.
            </SheetDescription>
          </SheetHeader>
          {selectedQRAsset && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="p-4 border rounded-lg bg-white">
                <QRCodeSVG
                  value={JSON.stringify({ assetId: selectedQRAsset.assetId })}
                  size={256}
                  includeMargin={true}
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-lg font-semibold">{selectedQRAsset.name}</p>
                <p className="text-sm text-muted-foreground">
                  S/N: {selectedQRAsset.serialNumber || "N/A"}
                </p>
              </div>
            </div>
          )}
          <SheetFooter className="mt-auto">
             <Button className="w-full" onClick={() => window.print()}>Print QR Code</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Booking Sheet */}
      <Sheet open={isBookSheetOpen} onOpenChange={setIsBookSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{isEditBooking ? 'Edit Booking' : 'Book an Asset'}</SheetTitle>
            <SheetDescription>
              {isEditBooking ? 'Update the details for this booking.' : 'Schedule a time to borrow a barangay asset.'}
            </SheetDescription>
          </SheetHeader>
           <div className="grid gap-4 py-6">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assetId" className="text-right">Asset</Label>
                    <Select onValueChange={val => setNewBooking({...newBooking, assetId: val})} value={newBooking.assetId}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                        <SelectContent>
                            {assets.filter(a => a.status === 'Available' || (isEditBooking && a.assetId === newBooking.assetId)).map(asset => (
                                <SelectItem key={asset.assetId} value={asset.assetId}>{asset.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="borrowerName" className="text-right">Borrower</Label>
                    <Input id="borrowerName" value={newBooking.borrowerName} onChange={e => setNewBooking({...newBooking, borrowerName: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="purpose" className="text-right">Purpose</Label>
                    <Textarea id="purpose" value={newBooking.purpose} onChange={e => setNewBooking({...newBooking, purpose: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="startDateTime" className="text-right">Start</Label>
                    <Input id="startDateTime" type="datetime-local" value={newBooking.startDateTime} onChange={e => setNewBooking({...newBooking, startDateTime: e.target.value})} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="endDateTime" className="text-right">End</Label>
                    <Input id="endDateTime" type="datetime-local" value={newBooking.endDateTime} onChange={e => setNewBooking({...newBooking, endDateTime: e.target.value})} className="col-span-3" />
                </div>

                {isConflict && (
                     <div className="col-span-4 bg-destructive/10 border border-destructive/50 text-destructive text-xs rounded-md p-3 flex items-start">
                        <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <p><strong>Booking Conflict:</strong> The selected time slot overlaps with an existing booking for this asset. Please choose a different time.</p>
                    </div>
                )}
               
                {bookingConflicts.length > 0 && (
                    <div className="col-span-4">
                        <h4 className="font-medium text-sm mb-2">Existing Schedules for this Asset:</h4>
                        <div className="space-y-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md max-h-32 overflow-y-auto">
                            {bookingConflicts.map(c => (
                                <div key={c.bookingId} className="flex justify-between">
                                    <span>{c.borrowerName}</span>
                                    <span>{new Date(c.startDateTime).toLocaleString()} - {new Date(c.endDateTime).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
           </div>
          <SheetFooter>
            <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleBookAsset} disabled={isConflict}> {isEditBooking ? 'Save Changes' : 'Confirm Booking'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Maintenance Sheet */}
        <Sheet open={isMaintenanceSheetOpen} onOpenChange={setIsMaintenanceSheetOpen}>
            <SheetContent className="sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Log Maintenance</SheetTitle>
                    <SheetDescription>Record maintenance details for the selected asset.</SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-6">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="serviceType" className="text-right">Service Type</Label>
                        <Input id="serviceType" value={maintenanceForm.serviceType} onChange={e => setMaintenanceForm({...maintenanceForm, serviceType: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea id="description" value={maintenanceForm.description} onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="servicedBy" className="text-right">Serviced By</Label>
                        <Input id="servicedBy" value={maintenanceForm.servicedBy} onChange={e => setMaintenanceForm({...maintenanceForm, servicedBy: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="partsUsed" className="text-right">Parts Used</Label>
                        <Input id="partsUsed" value={maintenanceForm.partsUsed} onChange={e => setMaintenanceForm({...maintenanceForm, partsUsed: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cost" className="text-right">Cost</Label>
                        <Input id="cost" type="number" value={maintenanceForm.cost} onChange={e => setMaintenanceForm({...maintenanceForm, cost: parseFloat(e.target.value) || 0})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="serviceDate" className="text-right">Service Date</Label>
                        <Input id="serviceDate" type="date" value={maintenanceForm.serviceDate} onChange={e => setMaintenanceForm({...maintenanceForm, serviceDate: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nextMaintenanceDue" className="text-right">Next Due</Label>
                        <Input id="nextMaintenanceDue" type="date" value={maintenanceForm.nextMaintenanceDue} onChange={e => setMaintenanceForm({...maintenanceForm, nextMaintenanceDue: e.target.value})} className="col-span-3" />
                    </div>
                </div>
                <SheetFooter>
                     <SheetClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button onClick={handleSaveMaintenance}>Save Log</Button>
                </SheetFooter>
            </SheetContent>
      </Sheet>
    </>
  );
}
