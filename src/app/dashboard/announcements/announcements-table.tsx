
'use client';

import React from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Announcement } from "@/lib/types";
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { AnnouncementFormValues } from './announcement-actions';
import { useToast } from '@/hooks/use-toast';

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
  
  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete), []);

  return (
    <DataTable
        columns={columns}
        data={announcements ?? []}
        isLoading={isLoadingAnnouncements}
        onAdd={handleAdd}
      />
  );
}
