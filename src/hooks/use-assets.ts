
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
  const { data: rawAssets, isLoading, error } = useCollection<FixedAsset>(assetsRef);

  // Map Firestore 'id' to 'assetId' to match the type definition
  const assets = rawAssets?.map(doc => ({
    ...doc,
    assetId: doc.id
  })) as FixedAsset[] | null;

  return { data: assets, isLoading, error };
};

/**
 * A hook to fetch all asset bookings for the current barangay.
 * @returns An array of asset bookings with their Firestore IDs, loading state, and error state.
 */
export const useAssetBookings = () => {
  const bookingsRef = useBarangayRef('asset_bookings');
  const { data: rawBookings, isLoading, error } = useCollection<AssetBooking>(bookingsRef);

  // Map Firestore 'id' to 'bookingId'
  const bookings = rawBookings?.map(doc => ({
    ...doc,
    bookingId: doc.id
  })) as AssetBooking[] | null;

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
  
  const { data: rawLogs, isLoading, error } = useCollection<MaintenanceLog>(q);

  // Map Firestore 'id' to 'logId'
  const logs = rawLogs?.map(doc => ({
    ...doc,
    logId: doc.id
  })) as MaintenanceLog[] | null;

  return { data: logs, isLoading, error };
};
