
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { FixedAsset, AssetBooking, MaintenanceLog } from '@/lib/types';

// TODO: Replace with dynamic config
export const BARANGAY_ID = "1";

export const useAssetsRef = (collectionName: string) => {
    const firestore = useFirestore();
    if (!firestore) return null;
    return collection(firestore, `barangays/${BARANGAY_ID}/${collectionName}`);
}

/**
 * A hook to fetch all fixed assets for the current barangay.
 * @returns An array of fixed assets with their Firestore IDs, loading state, and error state.
 */
export const useFixedAssets = () => {
  const assetsRef = useAssetsRef('fixed_assets');
  const [snapshot, isLoading, error] = useCollection(assetsRef);

  const assets: FixedAsset[] | null = snapshot 
    ? snapshot.docs.map(doc => ({ assetId: doc.id, ...doc.data() } as FixedAsset)) 
    : null;

  return { data: assets, isLoading, error };
};

/**
 * A hook to fetch all asset bookings for the current barangay.
 * @returns An array of asset bookings with their Firestore IDs, loading state, and error state.
 */
export const useAssetBookings = () => {
  const bookingsRef = useAssetsRef('asset_bookings');
  const [snapshot, isLoading, error] = useCollection(bookingsRef);

  const bookings: AssetBooking[] | null = snapshot
    ? snapshot.docs.map(doc => ({ bookingId: doc.id, ...doc.data() } as AssetBooking))
    : null;

  return { data: bookings, isLoading, error };
};


/**
 * A hook to fetch all maintenance logs for a specific asset.
 * @param assetId The ID of the asset to fetch logs for.
 * @returns An array of maintenance logs, loading state, and error state.
 */
export const useMaintenanceLogs = (assetId: string) => {
  const logsRef = useAssetsRef('maintenance_logs');
  const q = logsRef ? query(logsRef, where("assetId", "==", assetId)) : null;
  const [snapshot, isLoading, error] = useCollection(q);

  const logs: MaintenanceLog[] | null = snapshot
    ? snapshot.docs.map(doc => ({ logId: doc.id, ...doc.data() } as MaintenanceLog))
    : null;

  return { data: logs, isLoading, error };
};
