
import { 
  doc, 
  collection, 
  getDoc, 
  Firestore, 
  CollectionReference, 
  DocumentReference 
} from 'firebase/firestore';

/**
 * Client-Side Tenant Helper
 * 
 * Provides type-safe, path-normalized references to the currently active tenant's data.
 * This abstracts away the deep nesting of the "Logical Vault" architecture.
 */

// Overload Signatures
export function tenantRef(db: Firestore, path: string, collectionName: string): CollectionReference;
export function tenantRef(db: Firestore, path: string, collectionName: string, docId: string): DocumentReference;

// Implementation
export function tenantRef(
  db: Firestore, 
  path: string, 
  collectionName: string, 
  docId?: string
): CollectionReference | DocumentReference {
  // Normalize path (remove leading slash if present, though Firestore tolerates it mostly)
  const safePath = path.startsWith('/') ? path.substring(1) : path;
  
  if (docId) {
    return doc(db, `${safePath}/${collectionName}`, docId);
  }
  return collection(db, `${safePath}/${collectionName}`);
}

/**
 * Retrieves the full Firestore path for a tenant using their slug.
 * Useful for login/onboarding flows where we only know the 'bacoor-brgy-genesis' slug.
 */
export async function getTenantPath(db: Firestore, slug: string): Promise<string | null> {
    try {
        const dirRef = doc(db, 'tenant_directory', slug);
        const dirSnap = await getDoc(dirRef);
        if (dirSnap.exists()) {
            return dirSnap.data().fullPath;
        }
        return null;
    } catch (e) {
        console.error("Error fetching tenant path:", e);
        return null;
    }
}
