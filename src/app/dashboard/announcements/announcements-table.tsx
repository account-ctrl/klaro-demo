
'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp, writeBatch, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Announcement } from "@/lib/types";
import { getColumns } from './columns';
import { DataTable } from './data-table';
import { AnnouncementFormValues, ANNOUNCEMENT_TEMPLATES } from './announcement-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Filter, SlidersHorizontal, Search, Columns, CalendarIcon } from 'lucide-react';
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
import { AddAnnouncement } from './announcement-actions';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useTenant } from '@/providers/tenant-provider';

export function AnnouncementsTable() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { tenantPath } = useTenant();
  
  // Filter States
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>();
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
      title: true,
      category: true,
      datePosted: true,
      actions: true
  });


  const announcementsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/announcements`);
  }, [firestore, tenantPath]);


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
    if (!firestore || !updatedRecord.announcementId || !tenantPath) return;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/announcements/${updatedRecord.announcementId}`);
    
    const { announcementId, datePosted, ...dataToUpdate } = updatedRecord;

    updateDocumentNonBlocking(docRef, dataToUpdate);
    toast({ title: 'Announcement Updated', description: 'The announcement has been updated.' });
  };

  const handleDelete = (id: string) => {
    if (!firestore || !tenantPath) return;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const docRef = doc(firestore, `${safePath}/announcements/${id}`);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Announcement Deleted' });
  };

  const handleLoadSamples = async () => {
      if (!firestore || !user || !tenantPath) return;

      try {
          const batch = writeBatch(firestore);
          const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
          ANNOUNCEMENT_TEMPLATES.forEach((tpl) => {
              const newDocRef = doc(collection(firestore, `${safePath}/announcements`));
              batch.set(newDocRef, {
                  announcementId: newDocRef.id,
                  title: tpl.title,
                  content: tpl.content,
                  category: tpl.category as Announcement['category'],
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

  const columns = React.useMemo(() => getColumns(handleEdit, handleDelete), [tenantPath]);

  // Filter Logic
  const filteredData = announcements?.filter(item => {
      const matchesSearch = filterQuery === '' || 
        item.title.toLowerCase().includes(filterQuery.toLowerCase()) || 
        item.content.toLowerCase().includes(filterQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      
      let matchesDate = true;
      if (date?.from && item.datePosted) {
          // item.datePosted is likely a Firestore Timestamp
          let itemDate: Date;
          if (item.datePosted instanceof Timestamp) {
            itemDate = item.datePosted.toDate();
          } else if ((item.datePosted as any).seconds) {
             // Handle case where it's a plain object resembling a timestamp
             itemDate = new Date((item.datePosted as any).seconds * 1000);
          } else {
             // Fallback or if it's already a date (rare in this setup)
             itemDate = new Date(item.datePosted as any);
          }
          
          const from = startOfDay(date.from);
          const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
          
          matchesDate = isWithinInterval(itemDate, { start: from, end: to });
      }

      return matchesSearch && matchesCategory && matchesDate;
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
                        placeholder="Search announcements..." 
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
                            {date?.from && (
                                <span className="ml-2 rounded-sm bg-secondary px-1 font-normal text-xs">
                                    Date Set
                                </span>
                            )}
                            {categoryFilter !== 'all' && (
                                <span className="ml-2 rounded-sm bg-secondary px-1 font-normal text-xs">
                                    Category Set
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-4" align="start">
                         <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Filter Announcements</h4>
                                <p className="text-sm text-muted-foreground">Find specific updates.</p>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="categoryFilter">Category</Label>
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger id="categoryFilter">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            <SelectItem value="General Info">General Info</SelectItem>
                                            <SelectItem value="Event">Event</SelectItem>
                                            <SelectItem value="Health">Health</SelectItem>
                                            <SelectItem value="Ordinance">Ordinance</SelectItem>
                                            <SelectItem value="Emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date Posted</Label>
                                    <div className="grid gap-2">
                                         <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                            className="rounded-md border"
                                        />
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        setCategoryFilter('all');
                                        setDate(undefined);
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
                <Button variant="ghost" size="sm" onClick={handleLoadSamples} disabled={announcements && announcements.length > 0}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Samples
                </Button>
                <AddAnnouncement onAdd={handleAdd} />
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
                            {key === 'datePosted' ? 'Date' : key}
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
            isLoading={isLoadingAnnouncements}
        />
    </div>
  );
}
