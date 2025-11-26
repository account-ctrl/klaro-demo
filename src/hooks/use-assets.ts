
'use client';

import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { FixedAsset, AssetBooking } from '@/lib/types';
import { BARANGAY_ID } from './use-barangay-data';

// --- REFS ---

export function useAssetsRef(collectionName: string) {
  const firestore = useFirestore();
  return useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/${collectionName}`);
  }, [firestore, collectionName]);
}

// --- HOOKS ---

export function useFixedAssets() {
    const ref = useAssetsRef('fixed_assets');
    const q = useMemoFirebase(() => ref ? query(ref, orderBy('name', 'asc')) : null, [ref]);
    return useCollection<FixedAsset>(q);
}

export function useAssetBookings(assetId?: string) {
    const firestore = useFirestore();
    const q = useMemoFirebase(() => {
        if (!firestore) return null;
        const col = collection(firestore, `/barangays/${BARANGAY_ID}/asset_bookings`);
        if (assetId) {
            return query(col, where('assetId', '==', assetId), orderBy('startDateTime', 'desc'));
        }
        return query(col, orderBy('startDateTime', 'desc'));
    }, [firestore, assetId]);
    
    return useCollection<AssetBooking>(q);
}
