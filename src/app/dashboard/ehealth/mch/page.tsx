
'use client';

import { useState, useMemo } from 'react';
import { useResidents } from '@/hooks/use-barangay-data';
import { useMchRecords, useGrowthMeasurements, useImmunizationRecords, useEHealthAdvancedRef } from '@/hooks/use-ehealth-advanced';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { serverTimestamp, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Baby, Ruler, Syringe, Calendar, Plus, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DemoRestrictionModal } from '@/components/demo-restriction-modal';

export default function MchPage() {
    const { data: mchRecords } = useMchRecords();
    const { data: residents } = useResidents();
    const mchRef = useEHealthAdvancedRef('mch_records');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMchId, setSelectedMchId] = useState<string | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newRecord, setNewRecord] = useState({ residentId: '', motherName: '' });

    const filteredRecords = useMemo(() => {
        if (!mchRecords || !residents) return [];
        return mchRecords.filter(record => {
            const resident = residents.find(r => r.residentId === record.residentId);
            const name = resident ? `${resident.firstName} ${resident.lastName}` : 'Unknown';
            return name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [mchRecords, residents, searchTerm]);

    const selectedRecord = useMemo(() => mchRecords?.find(r => r.mchId === selectedMchId), [mchRecords, selectedMchId]);
    const selectedResident = useMemo(() => residents?.find(r => r.residentId === selectedRecord?.residentId), [residents, selectedRecord]);

    const handleCreateRecord = () => {
        if (!mchRef || !newRecord.residentId) return;
        
        addDocumentNonBlocking(mchRef, {
            residentId: newRecord.residentId,
            motherName: newRecord.motherName,
            latestNutritionalStatus: 'Pending Assessment',
            lastUpdated: serverTimestamp()
        });
        
        setIsAddOpen(false);
        setNewRecord({ residentId: '', motherName: '' });
    };

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
            <DemoRestrictionModal />
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Maternal & Child Health</h1>
                    <p className="text-muted-foreground">Monitor growth, nutrition, and immunization.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4"/> Enroll Child</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Enroll New Child</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Select Child (Resident)</Label>
                                <Select onValueChange={(val) => setNewRecord({...newRecord, residentId: val})}>
                                    <SelectTrigger><SelectValue placeholder="Search resident..." /></SelectTrigger>
                                    <SelectContent>
                                        {residents?.map(r => (
                                            <SelectItem key={r.residentId} value={r.residentId}>{r.firstName} {r.lastName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Mother's Name</Label>
                                <Input value={newRecord.motherName} onChange={e => setNewRecord({...newRecord, motherName: e.target.value})} />
                            </div>
                        </div>
                        <DialogFooter><Button onClick={handleCreateRecord}>Create Record</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-0">
                {/* List Panel */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="pb-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search child name..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto p-0">
                        {filteredRecords.map(record => {
                            const r = residents?.find(res => res.residentId === record.residentId);
                            return (
                                <div 
                                    key={record.mchId}
                                    className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${selectedMchId === record.mchId ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                    onClick={() => setSelectedMchId(record.mchId)}
                                >
                                    <p className="font-semibold">{r ? `${r.firstName} ${r.lastName}` : 'Unknown Child'}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-muted-foreground">Mother: {record.motherName}</span>
                                        <Badge variant={record.latestNutritionalStatus === 'Normal' ? 'default' : 'destructive'} className="text-[10px]">
                                            {record.latestNutritionalStatus || 'Pending'}
                                        </Badge>
                                    </div>
                                </div>
                            )
                        })}
                        {filteredRecords.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">No records found.</div>}
                    </CardContent>
                </Card>

                {/* Detail Panel */}
                <Card className="md:col-span-2 h-full flex flex-col">
                    {selectedRecord && selectedResident ? (
                        <MchDetailView record={selectedRecord} resident={selectedResident} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-2">
                            <Baby className="h-12 w-12 opacity-20" />
                            <p>Select a child to view health records.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function MchDetailView({ record, resident }: { record: any, resident: any }) {
    const { data: measurements } = useGrowthMeasurements(record.mchId);
    const { data: vaccines } = useImmunizationRecords(record.mchId);
    const firestore = useFirestore();

    // Add Measurement State
    const [isMeasureOpen, setIsMeasureOpen] = useState(false);
    const [measureForm, setMeasureForm] = useState({ weight: '', height: '', head: '' });

    // Add Vaccine State
    const [isVaccineOpen, setIsVaccineOpen] = useState(false);
    const [vaccineForm, setVaccineForm] = useState({ name: '', dose: '1', dueDate: '' });

    const handleAddMeasurement = () => {
        if (!firestore) return;
        const colRef = collection(firestore, `barangays/barangay_san_isidro/mch_records/${record.mchId}/growth_measurements`);
        
        addDocumentNonBlocking(colRef, {
            mchId: record.mchId,
            weight: parseFloat(measureForm.weight),
            height: parseFloat(measureForm.height),
            headCircumference: measureForm.head ? parseFloat(measureForm.head) : null,
            recordedAt: serverTimestamp(),
            recordedBy: 'admin' // Replace with actual user ID
        });
        
        setIsMeasureOpen(false);
        setMeasureForm({ weight: '', height: '', head: '' });
    };

    const handleAddVaccine = () => {
        if (!firestore) return;
        const colRef = collection(firestore, `barangays/barangay_san_isidro/mch_records/${record.mchId}/immunization_schedule`);
        
        addDocumentNonBlocking(colRef, {
            mchId: record.mchId,
            vaccineName: vaccineForm.name,
            doseNumber: parseInt(vaccineForm.dose),
            dueDate: new Date(vaccineForm.dueDate), // Store as date object if possible, or ISO string
            status: 'Pending'
        });

        setIsVaccineOpen(false);
        setVaccineForm({ name: '', dose: '1', dueDate: '' });
    };

    const handleAdministerVaccine = (vaccineId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `barangays/barangay_san_isidro/mch_records/${record.mchId}/immunization_schedule/${vaccineId}`);
        updateDocumentNonBlocking(docRef, {
            status: 'Administered',
            administeredAt: serverTimestamp(),
            administeredBy: 'admin'
        });
    };

    return (
        <>
            <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Baby className="h-5 w-5 text-primary" />
                            {resident.firstName} {resident.lastName}
                        </CardTitle>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span>DOB: {resident.dateOfBirth}</span>
                            <span>Sex: {resident.gender}</span>
                            <span>Mother: {record.motherName}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge variant={record.latestNutritionalStatus === 'Normal' ? 'default' : 'destructive'} className="text-sm px-3 py-1">
                            {record.latestNutritionalStatus || 'No Data'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Latest Status</p>
                    </div>
                </div>
            </CardHeader>
            
            <Tabs defaultValue="growth" className="flex-grow flex flex-col">
                <div className="px-6 pt-2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="growth">Growth Monitoring</TabsTrigger>
                        <TabsTrigger value="immunization">Immunization</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="growth" className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2"><Ruler className="h-4 w-4"/> Growth History</h3>
                        <Dialog open={isMeasureOpen} onOpenChange={setIsMeasureOpen}>
                            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2"/> Add Measurement</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>New Growth Measurement</DialogTitle></DialogHeader>
                                <div className="grid grid-cols-2 gap-4 py-4">
                                    <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={measureForm.weight} onChange={e => setMeasureForm({...measureForm, weight: e.target.value})} /></div>
                                    <div className="space-y-2"><Label>Height (cm)</Label><Input type="number" step="0.1" value={measureForm.height} onChange={e => setMeasureForm({...measureForm, height: e.target.value})} /></div>
                                    <div className="space-y-2"><Label>Head Circ. (cm)</Label><Input type="number" step="0.1" value={measureForm.head} onChange={e => setMeasureForm({...measureForm, head: e.target.value})} /></div>
                                </div>
                                <DialogFooter><Button onClick={handleAddMeasurement}>Save</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Height</TableHead>
                                <TableHead>BMI</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {measurements?.map(m => (
                                <TableRow key={m.measureId}>
                                    <TableCell>{m.recordedAt ? formatDistanceToNow(m.recordedAt.toDate(), { addSuffix: true }) : 'Just now'}</TableCell>
                                    <TableCell>{m.weight} kg</TableCell>
                                    <TableCell>{m.height} cm</TableCell>
                                    <TableCell>{m.computedBMI || '-'}</TableCell>
                                    <TableCell><Badge variant="outline">{m.zScoreStatus || m.status || 'Pending'}</Badge></TableCell>
                                </TableRow>
                            ))}
                            {(!measurements || measurements.length === 0) && (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No measurements recorded.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TabsContent>

                <TabsContent value="immunization" className="flex-grow overflow-y-auto p-6 space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2"><Syringe className="h-4 w-4"/> Vaccine Schedule</h3>
                        <Dialog open={isVaccineOpen} onOpenChange={setIsVaccineOpen}>
                            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2"/> Add Schedule</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Immunization Schedule</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label>Vaccine Name</Label><Input value={vaccineForm.name} onChange={e => setVaccineForm({...vaccineForm, name: e.target.value})} placeholder="e.g. BCG, Measles"/></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Dose Number</Label><Input type="number" value={vaccineForm.dose} onChange={e => setVaccineForm({...vaccineForm, dose: e.target.value})} /></div>
                                        <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={vaccineForm.dueDate} onChange={e => setVaccineForm({...vaccineForm, dueDate: e.target.value})} /></div>
                                    </div>
                                </div>
                                <DialogFooter><Button onClick={handleAddVaccine}>Add Schedule</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vaccine</TableHead>
                                <TableHead>Dose</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vaccines?.map(v => (
                                <TableRow key={v.vaccineId}>
                                    <TableCell className="font-medium">{v.vaccineName}</TableCell>
                                    <TableCell>#{v.doseNumber}</TableCell>
                                    <TableCell>{v.dueDate instanceof Object && 'toDate' in v.dueDate ? v.dueDate.toDate().toLocaleDateString() : 'Invalid Date'}</TableCell>
                                    <TableCell>
                                        <Badge variant={v.status === 'Administered' ? 'default' : (v.status === 'Missed' ? 'destructive' : 'outline')}>
                                            {v.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {v.status === 'Pending' && (
                                            <Button size="sm" variant="secondary" onClick={() => handleAdministerVaccine(v.vaccineId)}>Administer</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                             {(!vaccines || vaccines.length === 0) && (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No immunization schedule set.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        </>
    )
}
