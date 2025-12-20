
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Syringe, Baby, Ruler, AlertCircle, FileText, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MCHRecord, GrowthMeasurement, ImmunizationRecord } from '@/lib/ehealth-advanced-types';
import { useTenant } from '@/providers/tenant-provider';

// Hardcoded for now, replace with dynamic context
// const BARANGAY_ID = 'barangay_san_isidro'; // REMOVED

export default function MaternalChildHealthPage() {
  const { tenantPath } = useTenant();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [selectedRecord, setSelectedRecord] = useState<MCHRecord | null>(null);
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Queries
  const recordsRef = useMemo(() => {
    if (!firestore || !tenantPath) return null;
    // Use dynamic path
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/mch_records`);
  }, [firestore, tenantPath]);

  const { data: records, isLoading } = useCollection<MCHRecord>(
    recordsRef ? query(recordsRef, orderBy('updatedAt', 'desc')) : null
  );

  // Sub-collection queries (only active when a record is selected)
  const growthRef = useMemo(() => {
    if (!firestore || !selectedRecord || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/mch_records/${selectedRecord.id}/growth_measurements`);
  }, [firestore, selectedRecord, tenantPath]);
  
  const immunizationRef = useMemo(() => {
    if (!firestore || !selectedRecord || !tenantPath) return null;
    const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    return collection(firestore, `${safePath}/mch_records/${selectedRecord.id}/immunization_schedule`);
  }, [firestore, selectedRecord, tenantPath]);

  const { data: growthHistory } = useCollection<GrowthMeasurement>(
      growthRef ? query(growthRef, orderBy('dateRecorded', 'desc')) : null
  );
  const { data: immunizationSchedule } = useCollection<ImmunizationRecord>(
      immunizationRef ? query(immunizationRef, orderBy('scheduledDate', 'asc')) : null
  );

  // --- ACTIONS ---

  const handleCreateRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!recordsRef || !user) return;
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    // Auto-calculate EDD if LMP is provided (Naegele's Rule: +1 year, -3 months, +7 days)
    let edd = null;
    if (data.lastMenstrualPeriod) {
        const lmp = new Date(data.lastMenstrualPeriod as string);
        edd = new Date(lmp.getFullYear() + 1, lmp.getMonth() - 3, lmp.getDate() + 7);
    }

    try {
        await addDoc(recordsRef, {
            patientId: 'RES-placeholder', // In real app, link to Resident Selector
            patientName: data.patientName,
            type: data.type,
            status: 'Active',
            lastMenstrualPeriod: data.lastMenstrualPeriod || null,
            estimatedDeliveryDate: edd ? edd.toISOString() : null,
            bloodType: data.bloodType,
            allergies: data.allergies ? (data.allergies as string).split(',') : [],
            riskFactors: [],
            obstetricScore: data.obstetricScore || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            assignedMidwifeId: user.uid
        });
        
        setIsNewRecordOpen(false);
        toast({ title: 'Record Created', description: 'New MCH record has been initialized.' });
    } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create record.' });
    }
  };

  const handleAddGrowth = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     if (!growthRef || !selectedRecord) return;
     const formData = new FormData(e.currentTarget);
     
     try {
        await addDoc(growthRef, {
            dateRecorded: new Date().toISOString(),
            weightKg: parseFloat(formData.get('weightKg') as string),
            heightCm: parseFloat(formData.get('heightCm') as string),
            headCircumferenceCm: parseFloat(formData.get('headCircumferenceCm') as string) || null,
            muacCm: parseFloat(formData.get('muacCm') as string) || null,
            notes: formData.get('notes'),
            recordedBy: user?.uid
        });
        toast({ title: 'Growth Recorded', description: 'Measurements added to history.' });
     } catch(err) {
         toast({ variant: 'destructive', title: 'Failed', description: 'Could not save measurements.' });
     }
  };
  
  const handleUpdateVaccine = async (vaccineId: string, status: string) => {
      if(!selectedRecord || !firestore || !tenantPath) return;
      const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
      
      try {
        const docRef = doc(firestore, `${safePath}/mch_records/${selectedRecord.id}/immunization_schedule/${vaccineId}`);
        await updateDoc(docRef, {
            status,
            administeredDate: status === 'Administered' ? new Date().toISOString() : null,
            administeredBy: status === 'Administered' ? user?.uid : null
        });
        toast({ title: 'Vaccination Updated', description: `Status changed to ${status}` });
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Update failed.' });
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Maternal & Child Health</h2>
            <p className="text-muted-foreground">Prenatal care, immunization, and nutrition monitoring.</p>
        </div>
        <Dialog open={isNewRecordOpen} onOpenChange={setIsNewRecordOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> New Record</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create MCH Record</DialogTitle>
                    <DialogDescription>Initialize a new card for a mother or child.</DialogDescription>
                </DialogHeader>
                <form id="create-mch" onSubmit={handleCreateRecord} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Patient Name</Label>
                        <Input name="patientName" required placeholder="Full Name" />
                    </div>
                     <div className="grid gap-2">
                        <Label>Record Type</Label>
                        <Select name="type" defaultValue="Maternal">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Maternal">Maternal (Prenatal)</SelectItem>
                                <SelectItem value="Child">Child (0-5 Years)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label>Last Menstrual Period (For Maternal)</Label>
                        <Input name="lastMenstrualPeriod" type="date" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label>Blood Type</Label>
                             <Select name="bloodType">
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A+">A+</SelectItem>
                                    <SelectItem value="O+">O+</SelectItem>
                                    <SelectItem value="B+">B+</SelectItem>
                                    <SelectItem value="AB+">AB+</SelectItem>
                                </SelectContent>
                            </Select>
                         </div>
                         <div className="grid gap-2">
                            <Label>Obstetric Score</Label>
                            <Input name="obstetricScore" placeholder="G_P_" />
                         </div>
                     </div>
                </form>
                <DialogFooter>
                    <Button type="submit" form="create-mch">Create Record</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
         {/* LEFT: LIST */}
         <div className="col-span-4 border rounded-lg bg-card flex flex-col">
            <div className="p-4 border-b">
                <Input placeholder="Search patients..." className="bg-background" />
            </div>
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading records...</div>
                ) : records?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No records found.</div>
                ) : (
                    <div className="flex flex-col">
                        {records?.map(record => (
                            <button
                                key={record.id}
                                onClick={() => setSelectedRecord(record)}
                                className={cn(
                                    "flex flex-col items-start gap-2 p-4 border-b text-left hover:bg-accent/50 transition-colors",
                                    selectedRecord?.id === record.id && "bg-accent"
                                )}
                            >
                                <div className="flex w-full flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{record.patientName}</span>
                                            <Badge variant={record.type === 'Maternal' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                                {record.type}
                                            </Badge>
                                        </div>
                                        {record.riskFactors && record.riskFactors.length > 0 && (
                                            <AlertCircle className="h-4 w-4 text-destructive" />
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">
                                        ID: {record.id.slice(0,8)} • Updated: {record.updatedAt ? format(record.updatedAt instanceof Date ? record.updatedAt : (record.updatedAt as any).toDate(), 'MMM d, yyyy') : 'N/A'}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>
         </div>

         {/* RIGHT: DETAILS */}
         <div className="col-span-8 border rounded-lg bg-card p-6 overflow-y-auto">
             {selectedRecord ? (
                 <div className="space-y-6">
                     <div className="flex items-start justify-between">
                         <div className="flex items-center gap-4">
                             <Avatar className="h-16 w-16">
                                 <AvatarImage src="" />
                                 <AvatarFallback className="text-lg">
                                     {selectedRecord.patientName.slice(0,2).toUpperCase()}
                                 </AvatarFallback>
                             </Avatar>
                             <div>
                                 <h2 className="text-2xl font-bold">{selectedRecord.patientName}</h2>
                                 <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                     <Badge variant="outline">{selectedRecord.status}</Badge>
                                     <span>•</span>
                                     <span>Blood: {selectedRecord.bloodType || 'Unknown'}</span>
                                     {selectedRecord.type === 'Maternal' && selectedRecord.estimatedDeliveryDate && (
                                         <>
                                            <span>•</span>
                                            <span className="text-primary font-medium">
                                                EDD: {format(new Date(selectedRecord.estimatedDeliveryDate), 'MMM d, yyyy')}
                                            </span>
                                         </>
                                     )}
                                 </div>
                             </div>
                         </div>
                         <Button variant="outline" size="icon"><FileText className="h-4 w-4" /></Button>
                     </div>

                     <Tabs defaultValue="growth" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
                            <TabsTrigger value="growth" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                                Growth & Vitals
                            </TabsTrigger>
                            <TabsTrigger value="immunization" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                                Immunization
                            </TabsTrigger>
                            <TabsTrigger value="prenatal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2" disabled={selectedRecord.type !== 'Maternal'}>
                                Prenatal Visits
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="growth" className="pt-4 space-y-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">Growth Charts</CardTitle>
                                        <CardDescription>Weight and height tracking over time</CardDescription>
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button size="sm" variant="secondary"><Plus className="mr-2 h-3 w-3" /> Add Entry</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <form onSubmit={handleAddGrowth} className="grid gap-3">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium leading-none">New Measurement</h4>
                                                    <p className="text-sm text-muted-foreground">Enter current vitals.</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="grid gap-1">
                                                        <Label>Weight (kg)</Label>
                                                        <Input name="weightKg" type="number" step="0.01" required />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <Label>Height (cm)</Label>
                                                        <Input name="heightCm" type="number" step="0.1" required />
                                                    </div>
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label>Notes</Label>
                                                    <Input name="notes" placeholder="Optional remarks" />
                                                </div>
                                                <Button type="submit">Save</Button>
                                            </form>
                                        </PopoverContent>
                                    </Popover>
                                </CardHeader>
                                <CardContent>
                                    {/* Placeholder for Chart */}
                                    <div className="h-[200px] w-full bg-slate-50 rounded-md flex items-center justify-center border border-dashed">
                                        <Activity className="h-8 w-8 text-slate-300" />
                                        <span className="ml-2 text-slate-400">Chart Visualization Placeholder</span>
                                    </div>
                                    
                                    <div className="mt-4 space-y-2">
                                        <h4 className="text-sm font-medium">Recent Entries</h4>
                                        <div className="space-y-2">
                                            {growthHistory?.map((entry, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm p-2 border rounded-md bg-slate-50/50">
                                                    <div className="flex gap-4">
                                                        <span className="text-muted-foreground w-24">
                                                            {format(new Date(entry.dateRecorded), 'MMM d, h:mm a')}
                                                        </span>
                                                        <span className="font-medium">{entry.weightKg} kg</span>
                                                        <span className="font-medium">{entry.heightCm} cm</span>
                                                    </div>
                                                    {entry.notes && <span className="text-xs text-muted-foreground italic max-w-[150px] truncate">{entry.notes}</span>}
                                                </div>
                                            ))}
                                            {(!growthHistory || growthHistory.length === 0) && <p className="text-sm text-muted-foreground">No data recorded.</p>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="immunization" className="pt-4">
                             <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Vaccination Schedule</CardTitle>
                                    <CardDescription>EPI (Expanded Program on Immunization) Tracker</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1">
                                        {immunizationSchedule?.map((dose) => (
                                            <div key={dose.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", 
                                                        dose.status === 'Administered' ? "bg-green-100 text-green-600" : 
                                                        dose.status === 'Overdue' ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                                                    )}>
                                                        <Syringe className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{dose.vaccineName} <span className="text-muted-foreground font-normal">- Dose {dose.doseNumber}</span></p>
                                                        <p className="text-xs text-muted-foreground">Due: {format(new Date(dose.scheduledDate), 'MMM d, yyyy')}</p>
                                                    </div>
                                                </div>
                                                
                                                {dose.status === 'Pending' || dose.status === 'Overdue' ? (
                                                    <Button size="sm" variant="outline" onClick={() => handleUpdateVaccine(dose.id, 'Administered')}>
                                                        Mark Done
                                                    </Button>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                                                        Administered
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                        {(!immunizationSchedule || immunizationSchedule.length === 0) && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <p>No schedule generated.</p>
                                                <Button variant="link" size="sm">Generate Standard EPI Schedule</Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                             </Card>
                        </TabsContent>
                     </Tabs>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                     <Baby className="h-16 w-16 mb-4 opacity-20" />
                     <p>Select a patient record to view details</p>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
}
