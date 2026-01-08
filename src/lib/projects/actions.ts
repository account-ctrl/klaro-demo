
import { 
    doc, 
    collection, 
    runTransaction, 
    serverTimestamp, 
    Timestamp 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Project } from './types';

const { firestore: db } = initializeFirebase();

export async function saveProject(tenantPath: string, project: Omit<Project, 'createdAt' | 'updatedAt' | 'disbursed'>) {
    const ref = project.id 
        ? doc(db, `${tenantPath}/projects`, project.id) 
        : doc(collection(db, `${tenantPath}/projects`));
    
    const data = {
        ...project,
        id: ref.id,
        disbursed: project.id ? undefined : 0, // Don't reset if update, set 0 if new
        createdAt: project.id ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    // Remove undefined
    Object.keys(data).forEach(key => data[key as keyof typeof data] === undefined && delete data[key as keyof typeof data]);

    await runTransaction(db, async (t) => {
        t.set(ref, data, { merge: true });
    });
    
    return ref.id;
}
