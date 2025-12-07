
import { useTenantProfile } from '@/hooks/use-tenant-profile';
import { updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useSettings() {
    const { profile, docRef, isLoading, error } = useTenantProfile();
    const { toast } = useToast();

    const addPurok = async (newPurok: string) => {
        if (!docRef || !newPurok) return;
        try {
            await updateDoc(docRef, {
                puroks: arrayUnion(newPurok)
            });
            toast({ title: "Success", description: `${newPurok} added.` });
        } catch (err: any) {
            console.error(err);
            toast({ variant: "destructive", title: "Error", description: "Failed to add purok." });
        }
    };

    const removePurok = async (purok: string) => {
        if (!docRef) return;
        try {
            await updateDoc(docRef, {
                puroks: arrayRemove(purok)
            });
            toast({ title: "Success", description: `${purok} removed.` });
        } catch (err: any) {
            console.error(err);
            toast({ variant: "destructive", title: "Error", description: "Failed to remove purok." });
        }
    };

    return {
        profile,
        isLoading,
        error,
        addPurok,
        removePurok
    };
}
