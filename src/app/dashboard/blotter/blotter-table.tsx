
'use client';

import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  or,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SlidersHorizontal, Search, Columns } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTenant } from '@/providers/tenant-provider';

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
  const { tenantPath } = useTenant();
  
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [caseTypeFilter, setCaseTypeFilter] = useState('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
      caseId: true,
      caseType: true,
      complainants: true,
      respondents: true,
      status: true,
      actions: true
  });


  const blottersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    let baseQuery = query(collection(firestore, `${safePath}/blotter_cases`));
    return baseQuery;
  }, [firestore, tenantPath]);

  const residentsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/residents`);
  }, [firestore, tenantPath]);

  const facilitiesCollectionRef = useMemoFirebase(() => {
    if(!firestore || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/facilities_resources`);
  }, [firestore, tenantPath]);
  
  const scheduleCollectionRef = useMemoFirebase(() => {
    if(!firestore || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return query(collection(firestore, `${safePath}/schedule_events`), where('category', '==', 'Blotter'));
  }, [firestore, tenantPath]);

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
    if (!firestore || !blottersCollectionRef || !user || !residents || !tenantPath) return;

    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const batch = writeBatch(firestore);
    const caseId = `CASE-${Date.now()}`;
    const blotterDocRef = doc(collection(firestore, `${safePath}/blotter_cases`), caseId);
    
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

    if (newRecord.scheduleHearing && newRecord.hearingStart && newRecord.hearingEnd && newRecord.venueResourceId) {
        const scheduleCollectionRef = collection(firestore, `${safePath}/schedule_events`);
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
    if (!firestore || !updatedRecord.caseId || !tenantPath) return;
    
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/blotter_cases/${updatedRecord.caseId}`);
    const { caseId, ...dataToUpdate } = updatedRecord;
    updateDocumentNonBlocking(docRef, dataToUpdate);
    toast({ title: 'Blotter Record Updated', description: `Case #${updatedRecord.caseId} has been updated.` });
  };

  const handleDelete = (id: string) => {
    if (!firestore || !tenantPath) return;
    
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/blotter_cases/${id}`);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Blotter Record Deleted', description: 'The record has been permanently deleted.' });
  };

  const isLoading = isLoadingBlotter || isLoadingResidents || isLoadingFacilities || isLoadingSchedule;
  const currentFacilities = (facilities && facilities.length > 0) ? facilities : defaultFacilities;

  // Filter Logic
  const filteredRecords = records?.filter(record => {
      const matchesSearch = filterQuery === '' || 
        record.caseId.toLowerCase().includes(filterQuery.toLowerCase()) ||
        record.caseType.toLowerCase().includes(filterQuery.toLowerCase()) ||
        getParticipantNames(record.complainantIds).toLowerCase().includes(filterQuery.toLowerCase()) ||
        getParticipantNames(record.respondentIds).toLowerCase().includes(filterQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesType = caseTypeFilter === 'all' || record.caseType === caseTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
  }) ?? [];

  const toggleColumnVisibility = (colId: string) => {
      setColumnVisibility(prev => ({...prev, [colId]: !prev[colId]}));
  }


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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search cases, names, or IDs..." 
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="pl-9"
                />
             </div>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="border-dashed">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px]" align="start">
                    <div className="grid gap-4">
                         <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filter Cases</h4>
                            <p className="text-sm text-muted-foreground">Find specific records.</p>
                        </div>
                        <div className="grid gap-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="statusFilter">Status</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger id="statusFilter" className="h-8">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="Open">Open</SelectItem>
                                            <SelectItem value="Under Mediation">Under Mediation</SelectItem>
                                            <SelectItem value="Settled">Settled</SelectItem>
                                            <SelectItem value="Dismissed">Dismissed</SelectItem>
                                            <SelectItem value="Issued CFA">Issued CFA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="typeFilter">Case Type</Label>
                                    <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                                        <SelectTrigger id="typeFilter" className="h-8">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            {allCaseTypes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
             </Popover>
          </div>
          
        <div className="flex items-center gap-2">
            <AddBlotterRecord onAdd={handleAdd} residents={residents ?? []} facilities={currentFacilities} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="ml-auto">
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(columnVisibility).map((key) => {
                     return (
                      <DropdownMenuCheckboxItem
                        key={key}
                        className="capitalize"
                        checked={columnVisibility[key]}
                        onCheckedChange={() => toggleColumnVisibility(key)}
                      >
                        {key === 'caseId' ? 'Case ID' : key.replace(/([A-Z])/g, ' $1').trim()}
                      </DropdownMenuCheckboxItem>
                    );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columnVisibility.caseId && <TableHead>Case ID</TableHead>}
              {columnVisibility.caseType && <TableHead>Case Type</TableHead>}
              {columnVisibility.complainants && <TableHead>Complainant(s)</TableHead>}
              {columnVisibility.respondents && <TableHead>Respondent(s)</TableHead>}
              {columnVisibility.status && <TableHead>Status</TableHead>}
              {columnVisibility.actions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length > 0 ? filteredRecords.map((record) => (
              <TableRow key={record.id}>
                {columnVisibility.caseId && <TableCell className="font-mono text-xs">{record.caseId}</TableCell>}
                {columnVisibility.caseType && <TableCell>{allCaseTypes.find(c => c.value === record.caseType)?.label ?? record.caseType}</TableCell>}
                {columnVisibility.complainants && <TableCell>{getParticipantNames(record.complainantIds)}</TableCell>}
                {columnVisibility.respondents && <TableCell>{getParticipantNames(record.respondentIds)}</TableCell>}
                {columnVisibility.status && (
                    <TableCell>
                    <Badge variant={getStatusBadgeVariant(record.status)} className="capitalize">
                        {record.status}
                    </Badge>
                    </TableCell>
                )}
                {columnVisibility.actions && (
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
                )}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length} className="h-24 text-center">
                  No blotter records found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {filteredRecords.length} record(s) found.
        </div>
      </div>
    </div>
  );
}
