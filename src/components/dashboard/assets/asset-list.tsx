
"use client";

import { FixedAsset } from "@/lib/types";
import { AssetCard } from "./asset-card";

interface AssetListProps {
  assets: FixedAsset[];
  isLoading: boolean;
  searchTerm: string;
  typeFilter: string;
  onEdit: (asset: FixedAsset) => void;
  onDelete: (assetId: string) => void;
  onGenerateQR: (asset: FixedAsset) => void;
}

export function AssetList({
  assets,
  isLoading,
  searchTerm,
  typeFilter,
  onEdit,
  onDelete,
  onGenerateQR,
}: AssetListProps) {
  
  if (isLoading) {
    return (
      <div className="col-span-full text-center py-10 text-muted-foreground">
        Loading assets...
      </div>
    );
  }

  const filteredAssets = (assets || [])
    .filter(asset => asset && asset.assetId)
    .filter((asset) => {
        const matchesSearch = asset.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "All" || asset.type === typeFilter;
        return matchesSearch && matchesType;
    });


  if (filteredAssets.length === 0) {
    return (
      <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
        <p>No assets found.</p>
        <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredAssets.map((asset) => (
        <AssetCard
          key={asset.assetId} // React key for list rendering
          asset={asset}
          onEdit={onEdit}
          onDelete={onDelete}
          onGenerateQR={onGenerateQR}
        />
      ))}
    </div>
  );
}
