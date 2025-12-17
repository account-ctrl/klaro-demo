
import { useCollection, useMemoFirebase } from '@/firebase';
import { query, where } from 'firebase/firestore';
import { FixedAsset, AssetBooking, MaintenanceLog } from '@/lib/types';
import { useBarangayRef } from './use-barangay-data';

/**
 * A hook to fetch all fixed assets for the current barangay.
 * @returns An array of fixed assets with their Firestore IDs, loading state, and error state.
 */
export const useFixedAssets = () => {
  const assetsRef = useBarangayRef('fixed_assets');
  const { data: assets, isLoading, error } = useCollection<FixedAsset>(assetsRef);

  return { data: assets, isLoading, error };
};

/**
 * A hook to fetch all asset bookings for the current barangay.
 * @returns An array of asset bookings with their Firestore IDs, loading state, and error state.
 */
export const useAssetBookings = () => {
  const bookingsRef = useBarangayRef('asset_bookings');
  const { data: bookings, isLoading, error } = useCollection<AssetBooking>(bookingsRef);

  return { data: bookings, isLoading, error };
};


/**
 * A hook to fetch all maintenance logs for a specific asset.
 * @param assetId The ID of the asset to fetch logs for.
 * @returns An array of maintenance logs, loading state, and error state.
 */
export const useMaintenanceLogs = (assetId: string) => {
  const logsRef = useBarangayRef('maintenance_logs');
  const q = useMemoFirebase(() => {
    return logsRef ? query(logsRef, where("assetId", "==", assetId)) : null;
  }, [logsRef, assetId]);
  
  const { data: logs, isLoading, error } = useCollection<MaintenanceLog>(q);

  return { data: logs, isLoading, error };
};
