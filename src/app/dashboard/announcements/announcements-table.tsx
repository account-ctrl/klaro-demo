
'use client';

import React from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Announcement } from "@/lib/types";
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { AnnouncementFormValues, ANNOUNCEMENT_TEMPLATES } from './announcement-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Trash2 } from 'lucide-react';

const BARANGAY_ID = 'barangay_san_isidro';


export function AnnouncementsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const announcementsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/announcements`);
  }, [firestore]);


  const { data: announcements, isLoading: isLoadingAnnouncements } = useCollection<Announcement>(announcementsCollectionRef);
  
  const handleAdd = (newRecord: AnnouncementFormValues) => {
    if (!announcementsCollectionRef || !user) return;
    
    const docToAdd: Partial<Announcement> = {
      ...newRecord,
      postedByUserId: user.uid,
      datePosted: serverTimestamp() as any,
    };
    
    addDocumentNonBlocking(announcementsCollectionRef, docToAdd).then(docRef => {
        if(docRef) {
             updateDocumentNonBlocking(docRef, { announcementId: docRef.id });
        }
    });

    toast({ title: 'Announcement Published', description: `"${newRecord.title}" is now live.` });
  };

  const handleEdit = (updatedRecord: Announcement) => {
    if (!firestore || !updatedRecord.announcementId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/announcements/${updatedRecord.announcementId}`);
    
    const { announcementId, datePosted, ...dataToUpdate } = updatedRecord;

    updateDocumentNonBlocking(docRef, dataToUpdate);
    toast({ title: 'Announcement Updated', description: 'The announcement has been updated.' });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/announcements/${id}`);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Announcement Deleted' });
  };

  const handleLoadSamples = async () => {
      if (!firestore || !user) return;

      try {
          const batch = writeBatch(firestore);
          ANNOUNCEMENT_TEMPLATES.forEach((tpl) => {
              const newDocRef = doc(collection(firestore, `/barangays/${BARANGAY_ID}/announcements`));
              batch.set(newDocRef, {
                  announcementId: newDocRef.id,
                  title: tpl.title,
                  content: tpl.content,
                  category: tpl.category as Announcement['category'], // Cast to ensure type safety
                  datePosted: serverTimestamp(),
                  postedByUserId: user.uid,
              });
          });
          await batch.commit();
          toast({ title: "Sample Announcements Loaded", description: "Default announcements have been added to the feed." });
      } catch (error) {
          console.error("Error loading samples:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to load sample announcements." });
      }
  };

  const handleClearAll = async () => {
      if (!firestore || !announcements) return;
      
      try {
          const batch = writeBatch(firestore);
          announcements.forEach((a) => {
              const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/announcements/${a.announcementId}`);
              batch.delete(docRef);
          });
          await batch.commit();
          toast({ variant: "destructive", title: "All Announcements Cleared", description: "The announcement feed has been reset." });
      } catch (error) {
           console.error("Error clearing data:", error);
           toast({ variant: "destructive", title: "Error", description: "Failed to clear announcements." });
      }
  };
  
  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete), []);

  return (
    <div className="space-y-4">
        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleLoadSamples}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Load Samples
            </Button>
             <Button variant="destructive" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleClearAll} disabled={!announcements || announcements.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear All
            </Button>
        </div>
        <DataTable
            columns={columns}
            data={announcements ?? []}
            isLoading={isLoadingAnnouncements}
            onAdd={handleAdd}
        />
    </div>
  );
}
