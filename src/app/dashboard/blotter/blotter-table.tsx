
'use client';

import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AddBlotterRecord, EditBlotterRecord, DeleteBlotterRecord, generateSummonsHtml, PrintSummonsButton } from './blotter-actions';
import type { BlotterCase, Resident, ScheduleEvent, FacilityResource } from '@/lib/types';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { caseTypes } from './case-types';
import { facilities as defaultFacilities } from '@/lib/facilities';

const BARANGAY_ID = 'barangay_san_isidro';


const getStatusBadgeVariant = (status: BlotterCase['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'Settled':
    case 'Dismissed':
      return 'default';
    case 'Open':
      return 'secondary';
    case 'Under Mediation':
    case 'Conciliation':
    case 'Arbitration':
      return 'outline';
    case 'Issued CFA':
    case 'Referred':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const allCaseTypes = [...caseTypes.criminal, ...caseTypes.civil, ...caseTypes.admin, ...caseTypes.referral];

export function BlotterTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const blottersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/blotter_cases`);
  }, [firestore]);

  const residentsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/residents`);
  }, [firestore]);

  const facilitiesCollectionRef = useMemoFirebase(() => {
    if(!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/facilities_resources`);
  }, [firestore]);
  
  const scheduleCollectionRef = useMemoFirebase(() => {
    if(!firestore) return null;
    return query(collection(firestore, `/barangays/${BARANGAY_ID}/schedule_events`), where('category', '==', 'Blotter'));
  }, [firestore]);

  const { data: records, isLoading: isLoadingBlotter } = useCollection<BlotterCase>(blottersCollectionRef);
  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);
  const { data: facilities, isLoading: isLoadingFacilities } = useCollection<FacilityResource>(facilitiesCollectionRef);
  const { data: scheduleEvents, isLoading: isLoadingSchedule } = useCollection<ScheduleEvent>(scheduleCollectionRef);


  const getParticipantNames = (residentIds: string[]) => {
    if (!residents || residentIds.length === 0) return 'N/A';
    return residentIds.map(id => {
        const resident = residents.find(r => r.residentId === id);
        return resident ? `${resident.firstName} ${resident.lastName}` : 'Unknown';
    }).join(', ');
  }

  const handleAdd = async (newRecord: Partial<BlotterCase> & { scheduleHearing?: boolean, hearingStage?: string, hearingStart?: string, hearingEnd?: string, venueResourceId?: string, generateSummons?: boolean }) => {
    if (!firestore || !blottersCollectionRef || !user || !residents) return;

    const batch = writeBatch(firestore);
    const caseId = `CASE-${Date.now()}`;
    const blotterDocRef = doc(blottersCollectionRef, caseId);
    
    const docToAdd: Partial<BlotterCase> = {
      ...newRecord,
      caseId: caseId,
      dateReported: serverTimestamp() as any,
      filedByUserId: user.uid,
    };
    
    delete (docToAdd as any).scheduleHearing;
    delete (docToAdd as any).hearingStage;
    delete (docToAdd as any).hearingStart;
    delete (docToAdd as any).hearingEnd;
    delete (docToAdd as any).venueResourceId;
    delete (docToAdd as any).generateSummons;


    batch.set(blotterDocRef, docToAdd);
    
    let toastDescription = `Case ${caseId} has been created.`;
    let newEvent: ScheduleEvent | null = null;

    // If scheduling is requested, create a schedule_event as well
    if (newRecord.scheduleHearing && newRecord.hearingStart && newRecord.hearingEnd && newRecord.venueResourceId) {
        const scheduleCollectionRef = collection(firestore, `/barangays/${BARANGAY_ID}/schedule_events`);
        const eventId = `EVT-${Date.now()}`;
        const eventDocRef = doc(scheduleCollectionRef, eventId);
        
        newEvent = {
            eventId: eventId,
            category: 'Blotter',
            title: `${newRecord.hearingStage}: ${newRecord.caseType} (Case #${caseId})`,
            referenceId: caseId,
            start: newRecord.hearingStart,
            end: newRecord.hearingEnd,
            resourceId: newRecord.venueResourceId,
            status: 'Scheduled',
            createdByUserId: user.uid,
        };

        batch.set(eventDocRef, newEvent);
        toastDescription += " A hearing has been scheduled.";
    }

    try {
        await batch.commit();
        toast({ title: 'Blotter Record Added', description: toastDescription });
        
        if (newRecord.generateSummons && newEvent && residents) {
            const complainants = residents.filter(r => newRecord.complainantIds?.includes(r.residentId));
            const respondents = residents.filter(r => newRecord.respondentIds?.includes(r.residentId));
            const currentFacilities = (facilities && facilities.length > 0) ? facilities : defaultFacilities;
            const venue = currentFacilities.find(f => f.resourceId === newRecord.venueResourceId);

            const htmlContent = generateSummonsHtml({ ...docToAdd, dateReported: new Date() as any }, newEvent, complainants, respondents, venue);
            const printWindow = window.open('', '_blank');
            printWindow?.document.write(htmlContent);
            printWindow?.document.close();
            printWindow?.print();
        }

    } catch (error) {
        console.error("Error creating blotter record and schedule: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create record.' });
    }
  };

  const handleEdit = (updatedRecord: BlotterCase) => {
    if (!firestore || !updatedRecord.caseId) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/blotter_cases/${updatedRecord.caseId}`);
    const { caseId, ...dataToUpdate } = updatedRecord;
    updateDocumentNonBlocking(docRef, dataToUpdate);
    toast({ title: 'Blotter Record Updated', description: `Case #${updatedRecord.caseId} has been updated.` });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/blotter_cases/${id}`);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Blotter Record Deleted', description: 'The record has been permanently deleted.' });
  };

  const isLoading = isLoadingBlotter || isLoadingResidents || isLoadingFacilities || isLoadingSchedule;
  const currentFacilities = (facilities && facilities.length > 0) ? facilities : defaultFacilities;

  if (isLoading) {
      return (
          <div className="space-y-4">
              <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Case ID</TableHead>
                            <TableHead>Case Type</TableHead>
                            <TableHead>Complainant(s)</TableHead>
                             <TableHead>Respondent(s)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
          </div>
      )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <AddBlotterRecord onAdd={handleAdd} residents={residents ?? []} facilities={currentFacilities} />
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case ID</TableHead>
              <TableHead>Case Type</TableHead>
              <TableHead>Complainant(s)</TableHead>
              <TableHead>Respondent(s)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records && records.length > 0 ? records.map((record) => (
              <TableRow key={record.caseId}>
                <TableCell className="font-mono text-xs">{record.caseId}</TableCell>
                <TableCell>{allCaseTypes.find(c => c.value === record.caseType)?.label ?? record.caseType}</TableCell>
                <TableCell>{getParticipantNames(record.complainantIds)}</TableCell>
                <TableCell>{getParticipantNames(record.respondentIds)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(record.status)} className="capitalize">
                    {record.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <PrintSummonsButton 
                      blotter={record}
                      residents={residents ?? []}
                      scheduleEvents={scheduleEvents ?? []}
                      facilities={currentFacilities}
                    />
                    <EditBlotterRecord record={record} onEdit={handleEdit} residents={residents ?? []} facilities={currentFacilities}/>
                    <DeleteBlotterRecord recordId={record.caseId} onDelete={handleDelete} />
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No blotter records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
