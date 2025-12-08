
'use client';

import React, { useState } from 'react';
import {
  doc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Household } from '@/lib/types';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { HouseholdFormValues, AddHousehold } from './household-actions';
import { useToast } from '@/hooks/use-toast';
import { useHouseholds, useResidents, useBarangayRef, usePuroks } from '@/hooks/use-barangay-data';
import { Button } from '@/components/ui/button';
import { Trash2, SlidersHorizontal, Search, Columns } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HouseholdMembersSheet } from './household-members-sheet';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant } from '@/providers/tenant-provider';

type HouseholdWithId = Household & { id?: string };

export function HouseholdsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { tenantPath } = useTenant();

  const { data: households, isLoading: isLoadingHouseholds } = useHouseholds();
  const { data: residents, isLoading: isLoadingResidents } = useResidents();
  const { data: puroks } = usePuroks();
  
  const householdsCollectionRef = useBarangayRef('households');
  
  const [selectedHouseholdId, setSelectedHouseholdId] = React.useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  // Filter States
  const [filterQuery, setFilterQuery] = useState('');
  const [purokFilter, setPurokFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [tenureFilter, setTenureFilter] = useState('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
      householdNumber: true,
      name: true,
      purokId: true,
      address: true,
      actions: true
  });


  const handleAdd = async (newRecord: HouseholdFormValues) => {
    if (!householdsCollectionRef || !user || !residents || !firestore || !tenantPath) return;
    
    const head = residents.find(r => r.residentId === newRecord.household_head_id);
    if (!head) {
      toast({ variant: "destructive", title: "Error", description: "Selected Head of Household not found." });
      return;
    }

    const docToAdd: Household = {
      ...newRecord,
      name: `${head.lastName} Family`,
      householdId: `HH-${Date.now()}`,
      createdAt: serverTimestamp() as any,
    };
    
    // Add Household
    await addDocumentNonBlocking(householdsCollectionRef, docToAdd);

    // Update Head of Household's Resident Profile
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const residentDocId = (head as any).id || head.residentId;
    const residentDocRef = doc(firestore, `${safePath}/residents/${residentDocId}`);
    
    await updateDocumentNonBlocking(residentDocRef, { 
        householdId: docToAdd.householdId,
        is_head_of_family: true 
    });

    toast({ title: 'Household Added', description: `Household "${docToAdd.name}" has been created.` });
  };

  const handleEdit = (updatedRecord: HouseholdWithId) => {
    const recordId = updatedRecord.id || updatedRecord.householdId;
    if (!firestore || !recordId || !residents || !tenantPath) return;
    
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/households/${recordId}`);
    
    const head = residents.find(r => r.residentId === updatedRecord.household_head_id);
     if (!head) {
      toast({ variant: "destructive", title: "Error", description: "Selected Head of Household not found." });
      return;
    }

    const { householdId, id, createdAt, ...dataToUpdate } = updatedRecord;

    const finalRecord = {
        ...dataToUpdate,
        name: `${head.lastName} Family`,
    }

    updateDocumentNonBlocking(docRef, finalRecord);
    toast({ title: 'Household Updated', description: `Household "${finalRecord.name}" has been updated.` });
  };

  const handleDelete = (id: string) => {
    if (!firestore || !tenantPath) return;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/households/${id}`);
    
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Household Deleted' });
  };

  const handleDeleteAll = async () => {
      if (!firestore || !households || households.length === 0 || !tenantPath) return;

      try {
          const batch = writeBatch(firestore);
          const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;

          households.forEach(h => {
               const docId = (h as any).id || h.householdId;
               if(docId) {
                   const docRef = doc(firestore, `${safePath}/households/${docId}`);
                   batch.delete(docRef);
               }
          });
          await batch.commit();
          toast({ title: "All Households Deleted", description: "The database has been cleared." });
      } catch (error) {
          console.error("Delete All Error:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to delete all households." });
      }
  }
  
   const handleMemberChange = (residentId: string, householdId: string | null) => {
    if (!firestore || !residentId || !tenantPath) return;
    
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const resident = residents?.find(r => r.residentId === residentId);
    const residentDocId = (resident as any)?.id || residentId;
    
    const residentDocRef = doc(firestore, `${safePath}/residents/${residentDocId}`);
    updateDocumentNonBlocking(residentDocRef, { householdId: householdId });
    toast({
      title: householdId ? "Member Added" : "Member Removed",
      description: `The resident has been ${householdId ? 'added to' : 'removed from'} the household.`
    });
  };
  
  const handleRowClick = (household: Household) => {
      setSelectedHouseholdId(household.householdId);
      setIsSheetOpen(true);
  }

  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, residents ?? [], handleMemberChange), [residents, tenantPath]);

  const filteredData = households?.filter(item => {
      const matchesSearch = filterQuery === '' || 
        item.name?.toLowerCase().includes(filterQuery.toLowerCase()) || 
        item.householdNumber.toLowerCase().includes(filterQuery.toLowerCase());
      
      const matchesPurok = purokFilter === 'all' || item.purokId === purokFilter;
      const matchesMaterial = materialFilter === 'all' || item.housing_material === materialFilter;
      const matchesTenure = tenureFilter === 'all' || item.tenure_status === tenureFilter;

      return matchesSearch && matchesPurok && matchesMaterial && matchesTenure;
  }) ?? [];

  const toggleColumnVisibility = (colId: string) => {
    setColumnVisibility(prev => ({...prev, [colId]: !prev[colId]}));
  }

  return (
    <div className="space-y-4">
         <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search household..." 
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
                            {(purokFilter !== 'all' || materialFilter !== 'all' || tenureFilter !== 'all') && (
                                <span className="ml-2 rounded-sm bg-secondary px-1 font-normal text-xs">
                                    Active
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-4" align="start">
                         <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Filter Households</h4>
                                <p className="text-sm text-muted-foreground">Find specific records.</p>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="purokFilter">Purok</Label>
                                    <Select value={purokFilter} onValueChange={setPurokFilter}>
                                        <SelectTrigger id="purokFilter">
                                            <SelectValue placeholder="All Puroks" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Puroks</SelectItem>
                                            {puroks?.map(p => (
                                                <SelectItem key={p.purokId} value={p.purokId}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="materialFilter">Housing Material</Label>
                                    <Select value={materialFilter} onValueChange={setMaterialFilter}>
                                        <SelectTrigger id="materialFilter">
                                            <SelectValue placeholder="Any" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Any Material</SelectItem>
                                            <SelectItem value="Concrete">Concrete</SelectItem>
                                            <SelectItem value="Semi-Concrete">Semi-Concrete</SelectItem>
                                            <SelectItem value="Light Material">Light Material</SelectItem>
                                            <SelectItem value="Salvaged Material">Salvaged Material</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tenureFilter">Tenure Status</Label>
                                    <Select value={tenureFilter} onValueChange={setTenureFilter}>
                                        <SelectTrigger id="tenureFilter">
                                            <SelectValue placeholder="Any" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Any Status</SelectItem>
                                            <SelectItem value="Owned">Owned</SelectItem>
                                            <SelectItem value="Rented">Rented</SelectItem>
                                            <SelectItem value="Living with Relatives">Living with Relatives</SelectItem>
                                            <SelectItem value="Informal Settler">Informal Settler</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        setPurokFilter('all');
                                        setMaterialFilter('all');
                                        setTenureFilter('all');
                                    }}
                                    className="justify-center text-center"
                                >
                                    Reset Filters
                                </Button>
                            </div>
                         </div>
                    </PopoverContent>
                </Popover>
             </div>
             
             <div className="flex gap-2">
                <AddHousehold onAdd={handleAdd} residents={residents || []} />
                 {households && households.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete All Households?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete {households.length} records.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive">
                                    Confirm
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
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
                            {key === 'purokId' ? 'Purok' : key}
                          </DropdownMenuCheckboxItem>
                        );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <DataTable
            columns={columns.filter(col => {
                const colId = (col as any).accessorKey || (col as any).id;
                const keyToCheck = colId === 'actions' ? 'actions' : colId;
                return columnVisibility[keyToCheck] !== false;
            })}
            data={filteredData}
            isLoading={isLoadingHouseholds || isLoadingResidents}
            onRowClick={handleRowClick}
        />
        
        <HouseholdMembersSheet 
            householdId={selectedHouseholdId}
            open={isSheetOpen}
            onOpenChange={setIsSheetOpen}
        />
    </div>
  );
}
