
import { 
    doc, 
    collection, 
    runTransaction, 
    serverTimestamp, 
    Timestamp 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Vendor, CatalogItem, PurchaseOrder, POItem } from './purchasing-types';

const { firestore: db } = initializeFirebase();

/**
 * Creates or Updates a Vendor
 */
export async function saveVendor(tenantPath: string, vendor: Omit<Vendor, 'createdAt'>) {
    const ref = vendor.id 
        ? doc(db, `${tenantPath}/vendors`, vendor.id) 
        : doc(collection(db, `${tenantPath}/vendors`));
    
    await runTransaction(db, async (t) => {
        t.set(ref, {
            ...vendor,
            id: ref.id,
            createdAt: serverTimestamp()
        }, { merge: true });
    });
    return ref.id;
}

/**
 * Creates or Updates a Catalog Item
 */
export async function saveCatalogItem(tenantPath: string, item: CatalogItem) {
    const ref = item.id 
        ? doc(db, `${tenantPath}/catalog_items`, item.id) 
        : doc(collection(db, `${tenantPath}/catalog_items`));
    
    await runTransaction(db, async (t) => {
        t.set(ref, { ...item, id: ref.id }, { merge: true });
    });
    return ref.id;
}

/**
 * Generates a Purchase Order
 */
export async function createPurchaseOrder(
    tenantPath: string, 
    po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'status'>
) {
    // Generate PO Number (Simple timestamp-based for now, ideally sequential via transaction counter)
    const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    
    const ref = doc(collection(db, `${tenantPath}/purchase_orders`));
    
    const data: PurchaseOrder = {
        ...po,
        id: ref.id,
        poNumber,
        status: 'DRAFT',
        createdAt: serverTimestamp() as Timestamp,
        date: Timestamp.fromDate(new Date()) // Default to now
    };

    await runTransaction(db, async (t) => {
        t.set(ref, data);
    });
    
    return ref.id;
}
