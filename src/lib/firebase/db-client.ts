
import { doc, getDoc, getFirestore, DocumentReference, Firestore } from 'firebase/firestore';

// Helper to get the full path from the short slug
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

// Helper to get a reference to the tenant document, accepting either full path or slug (needs async if slug)
// Since we can't easily do async in a simple Ref getter without awaiting, we usually resolve the path first in the app flow.
// But we can provide a utility that takes the path string.

export function getTenantRef(db: Firestore, path: string): DocumentReference {
    return doc(db, path);
}
