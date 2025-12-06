
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FixedAsset } from "@/lib/types";
import { PenLine, QrCode, Trash2 } from "lucide-react";

interface AssetCardProps {
  asset: FixedAsset;
  onEdit: (asset: FixedAsset) => void;
  onDelete: (assetId: string) => void;
  onGenerateQR: (asset: FixedAsset) => void;
}

export function AssetCard({
  asset,
  onEdit,
  onDelete,
  onGenerateQR,
}: AssetCardProps) {
  return (
    <Card className="hover:shadow-md transition-all flex flex-col group relative">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge variant={asset.type === "Vehicle" ? "default" : "outline"}>
            {asset.type}
          </Badge>
          <Badge
            variant={
              asset.status === "Available"
                ? "secondary"
                : asset.status === "Maintenance" || asset.status === "Damaged"
                ? "destructive"
                : "outline"
            }
          >
            {asset.status}
          </Badge>
        </div>
        <CardTitle className="mt-2 text-lg">{asset.name}</CardTitle>
        {asset.plateNumber && (
          <CardDescription>Plate: {asset.plateNumber}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Serial: {asset.serialNumber || "N/A"}</p>
          <p>Location: {asset.location || "Not Assigned"}</p>
          <p>Custodian: {asset.custodianName || "None"}</p>
        </div>
      </CardContent>
      <div className="p-4 pt-0 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onGenerateQR(asset)}
          title="QR Code"
        >
          <QrCode className="h-4 w-4 text-gray-600" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(asset)}
          title="Edit"
        >
          <PenLine className="h-4 w-4 text-blue-600" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:text-destructive hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <strong>{asset.name}</strong> from
                the inventory.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(asset.assetId)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
