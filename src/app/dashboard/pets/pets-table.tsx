
'use client';

import React, { useState, useMemo } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Pet, Resident, Household } from '@/lib/types';
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { AddPet, PetFormValues } from './pet-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Trash2, SlidersHorizontal, Search, Columns } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { useTenant } from '@/providers/tenant-provider'; // Import useTenant

const SPECIES_OPTIONS = [
    { value: 'Dog', label: 'Dog' },
    { value: 'Cat', label: 'Cat' },
    { value: 'Bird', label: 'Bird' },
    { value: 'Fish', label: 'Fish' },
    { value: 'Rabbit', label: 'Rabbit' },
    { value: 'Hamster', label: 'Hamster' },
    { value: 'Reptile', label: 'Reptile' },
    { value: 'Pig', label: 'Pig' },
    { value: 'Chicken', label: 'Chicken' },
    { value: 'Goat', label: 'Goat' },
    { value: 'Cattle', label: 'Cattle' },
    { value: 'Carabao', label: 'Carabao' },
    { value: 'Horse', label: 'Horse' },
    { value: 'Other', label: 'Other' }
];

export function PetsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { tenantPath } = useTenant(); // Get dynamic tenant path

  // Construct dynamic paths
  const petsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/pets`);
  }, [firestore, tenantPath]);

  const residentsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/residents`);
  }, [firestore, tenantPath]);
  
  const householdsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/households`);
  }, [firestore, tenantPath]);

  const { data: pets, isLoading: isLoadingPets } = useCollection<Pet>(petsCollectionRef);
  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);
  const { data: households, isLoading: isLoadingHouseholds } = useCollection<Household>(householdsCollectionRef);

  // Filter States
  const [filterQuery, setFilterQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
      tagNumber: true,
      name: true,
      species: true,
      breed: true,
      actions: true
  });


  const handleAdd = (newRecord: PetFormValues) => {
    if (!petsCollectionRef || !user) return;
    
    const docToAdd: Partial<Pet> = {
      ...newRecord,
      tagNumber: `PET-${Date.now()}`,
      createdAt: serverTimestamp() as any,
    };

    Object.keys(docToAdd).forEach(key => {
        const docKey = key as keyof typeof docToAdd;
        if (docToAdd[docKey] === undefined) {
            delete docToAdd[docKey];
        }
    });
    
    addDocumentNonBlocking(petsCollectionRef, docToAdd).then(docRef => {
        if(docRef) {
             updateDocumentNonBlocking(docRef, { 
                petId: docRef.id
            });
        }
    });

    toast({ title: 'Pet Registered', description: `${newRecord.name} has been added to the registry.` });
  };

  const handleEdit = (updatedRecord: Pet) => {
    if (!firestore || !updatedRecord.petId || !tenantPath) return;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/pets/${updatedRecord.petId}`);
    
    const { petId, createdAt, ...dataToUpdate } = updatedRecord;

    Object.keys(dataToUpdate).forEach(key => {
        const docKey = key as keyof typeof dataToUpdate;
        if (dataToUpdate[docKey] === undefined) {
            delete dataToUpdate[docKey];
        }
    });

    updateDocumentNonBlocking(docRef, dataToUpdate);
    toast({ title: 'Pet Profile Updated', description: `The record for ${updatedRecord.name} has been updated.` });
  };

  const handleDelete = (id: string) => {
    if (!firestore || !tenantPath) return;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/pets/${id}`);
    deleteDocumentNonBlocking(docRef);
     toast({ variant: 'destructive', title: 'Pet Record Deleted', description: 'The record has been permanently deleted.' });
  };
  
  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete, residents ?? [], households ?? []), [residents, households, handleEdit, handleDelete]);

  const isLoading = isLoadingPets || isLoadingResidents || isLoadingHouseholds;

  // Filter Logic
  const filteredData = pets?.filter(item => {
      const matchesSearch = filterQuery === '' || 
        item.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
        item.tagNumber?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        item.breed?.toLowerCase().includes(filterQuery.toLowerCase());
      
      const matchesSpecies = speciesFilter === 'all' || item.species === speciesFilter;
      const matchesGender = genderFilter === 'all' || item.gender === genderFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesSpecies && matchesGender && matchesStatus;
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
                        placeholder="Search pets..." 
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
                            {(speciesFilter !== 'all' || genderFilter !== 'all' || statusFilter !== 'all') && (
                                <span className="ml-2 rounded-sm bg-secondary px-1 font-normal text-xs">
                                    Active
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-4" align="start">
                         <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Filter Pets</h4>
                                <p className="text-sm text-muted-foreground">Find specific animals.</p>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="speciesFilter">Species</Label>
                                    <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                                        <SelectTrigger id="speciesFilter">
                                            <SelectValue placeholder="All Species" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Species</SelectItem>
                                            {SPECIES_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="genderFilter">Gender</Label>
                                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                                        <SelectTrigger id="genderFilter">
                                            <SelectValue placeholder="Any" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Any Gender</SelectItem>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="statusFilter">Status</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger id="statusFilter">
                                            <SelectValue placeholder="Any Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Any Status</SelectItem>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Deceased">Deceased</SelectItem>
                                            <SelectItem value="Lost">Lost</SelectItem>
                                            <SelectItem value="Transferred">Transferred</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        setSpeciesFilter('all');
                                        setGenderFilter('all');
                                        setStatusFilter('all');
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
                <AddPet onAdd={handleAdd} residents={residents || []} households={households || []} />
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
                            {key === 'tagNumber' ? 'Tag' : key}
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
            isLoading={isLoading}
        />
    </div>
  );
}
