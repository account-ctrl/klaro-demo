
'use client';

import { useState, useMemo } from 'react';
import { useResidents } from '@/hooks/use-barangay-data';
import { useMchRecords, useGrowthMeasurements, useImmunizationRecords, useEHealthAdvancedRef } from '@/hooks/use-ehealth-advanced';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { serverTimestamp, doc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Baby, Ruler, Syringe, Calendar, Plus, Search, CheckCircle2, AlertCircle, Pencil, Save, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from "@/components/ui/progress";

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
            latestNutritionalStatus: 'Normal', // Default
            lastUpdated: serverTimestamp()
        });
        
        setIsAddOpen(false);
        setNewRecord({ residentId: '', motherName: '' });
    };

    const handleUnenrollCallback = () => {
        setSelectedMchId(null);
    };

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Maternal & Child Health</h1>
                    <p className="text-muted-foreground">Monitor child growth, nutrition, and immunization programs.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white"><Plus className="mr-2 h-4 w-4"/> Enroll Child</Button>
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
                                <Input value={newRecord.motherName} onChange={e => setNewRecord({...newRecord, motherName: e.target.value})} placeholder="Full Name" />
                            </div>
                        </div>
                        <DialogFooter><Button onClick={handleCreateRecord}>Create Record</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-0">
                {/* List Panel */}
                <Card className="flex flex-col h-full border-r-0 md:border-r shadow-none md:shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/10">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search child name..." className="pl-8 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto p-0">
                        {filteredRecords.map(record => {
                            const r = residents?.find(res => res.residentId === record.residentId);
                            return (
                                <div 
                                    key={record.mchId}
                                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedMchId === record.mchId ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                    onClick={() => setSelectedMchId(record.mchId)}
                                >
                                    <p className="font-semibold text-sm">{r ? `${r.firstName} ${r.lastName}` : 'Unknown Child'}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-muted-foreground">Mom: {record.motherName}</span>
                                        <Badge variant={record.latestNutritionalStatus === 'Normal' ? 'outline' : 'destructive'} className="text-[10px] h-5">
                                            {record.latestNutritionalStatus || 'Pending'}
                                        </Badge>
                                    </div>
                                </div>
                            )
                        })}
                        {filteredRecords.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No records found.</div>}
                    </CardContent>
                </Card>

                {/* Detail Panel */}
                <Card className="md:col-span-2 h-full flex flex-col shadow-none md:shadow-sm">
                    {selectedRecord && selectedResident ? (
                        <MchDetailView 
                            record={selectedRecord} 
                            resident={selectedResident} 
                            onUnenroll={handleUnenrollCallback} 
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
                            <div className="p-4 bg-muted/30 rounded-full">
                                <Baby className="h-12 w-12 opacity-30" />
                            </div>
                            <p>Select a child from the list to view health records.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function MchDetailView({ record, resident, onUnenroll }: { record: any, resident: any, onUnenroll: () => void }) {
    const { data: measurements } = useGrowthMeasurements(record.mchId);
    const { data: vaccines } = useImmunizationRecords(record.mchId);
    const firestore = useFirestore();

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ 
        motherName: record.motherName || '', 
        latestNutritionalStatus: record.latestNutritionalStatus || 'Normal' 
    });

    // Measurement State
    const [isMeasureOpen, setIsMeasureOpen] = useState(false);
    const [measureForm, setMeasureForm] = useState({ weight: '', height: '', head: '' });

    // Vaccine State
    const [isVaccineOpen, setIsVaccineOpen] = useState(false);
    const [vaccineForm, setVaccineForm] = useState({ name: '', dose: '1', dueDate: '' });

    // Computed Stats
    const immunizationProgress = useMemo(() => {
        if (!vaccines || vaccines.length === 0) return 0;
        const completed = vaccines.filter(v => v.status === 'Administered').length;
        return Math.round((completed / vaccines.length) * 100);
    }, [vaccines]);

    const handleEditToggle = () => {
        if (!isEditing) {
            // Populate form when entering edit mode
            setEditForm({
                motherName: record.motherName || '',
                latestNutritionalStatus: record.latestNutritionalStatus || 'Normal'
            });
        }
        setIsEditing(!isEditing);
    };

    const handleSaveChanges = async () => {
        if (!firestore) return;
        const docRef = doc(firestore, `barangays/barangay_san_isidro/mch_records/${record.mchId}`);
        await updateDocumentNonBlocking(docRef, {
            motherName: editForm.motherName,
            latestNutritionalStatus: editForm.latestNutritionalStatus,
            lastUpdated: serverTimestamp()
        });
        setIsEditing(false);
    };

    const handleUnenroll = async () => {
        if (!firestore) return;
        const docRef = doc(firestore, `barangays/barangay_san_isidro/mch_records/${record.mchId}`);
        await deleteDocumentNonBlocking(docRef);
        onUnenroll(); // Callback to clear selection
    };

    const handleAddMeasurement = () => {
        if (!firestore) return;
        const colRef = collection(firestore, `barangays/barangay_san_isidro/mch_records/${record.mchId}/growth_measurements`);
        
        addDocumentNonBlocking(colRef, {
            mchId: record.mchId,
            weight: parseFloat(measureForm.weight),
            height: parseFloat(measureForm.height),
            headCircumference: measureForm.head ? parseFloat(measureForm.head) : null,
            recordedAt: serverTimestamp(),
            recordedBy: 'admin' 
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
            dueDate: new Date(vaccineForm.dueDate),
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
            <CardHeader className="border-b bg-muted/5 pb-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-white shadow-sm">
                            {resident.firstName.charAt(0)}
                        </div>
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                {resident.firstName} {resident.lastName}
                            </CardTitle>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="font-normal">{resident.gender}</Badge>
                                <span>{resident.dateOfBirth} ({new Date().getFullYear() - new Date(resident.dateOfBirth).getFullYear()}y)</span>
                            </div>
                            {isEditing ? (
                                <div className="mt-2 flex items-center gap-2">
                                    <Label className="text-xs">Mother:</Label>
                                    <Input 
                                        value={editForm.motherName} 
                                        onChange={e => setEditForm({...editForm, motherName: e.target.value})} 
                                        className="h-7 text-xs w-[200px]" 
                                    />
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground mt-1">Mother: {record.motherName}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {isEditing ? (
                            <div className="flex items-center gap-2 mb-2">
                                 <Select 
                                    value={editForm.latestNutritionalStatus} 
                                    onValueChange={(val) => setEditForm({...editForm, latestNutritionalStatus: val})}
                                 >
                                    <SelectTrigger className="h-8 w-[140px] text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="Underweight">Underweight</SelectItem>
                                        <SelectItem value="Stunted">Stunted</SelectItem>
                                        <SelectItem value="Wasted">Wasted</SelectItem>
                                        <SelectItem value="Overweight">Overweight</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nutritional Status</span>
                                <Badge variant={record.latestNutritionalStatus === 'Normal' ? 'outline' : 'destructive'} className="text-sm px-3 py-1">
                                    {record.latestNutritionalStatus || 'Pending'}
                                </Badge>
                            </div>
                        )}

                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <Button size="sm" variant="ghost" onClick={handleEditToggle}><X className="h-4 w-4"/></Button>
                                    <Button size="sm" onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700 text-white"><Save className="h-4 w-4 mr-1"/> Save</Button>
                                </>
                            ) : (
                                <>
                                    <Button size="sm" variant="outline" onClick={handleEditToggle} title="Edit Record">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" title="Unenroll">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Unenroll Child?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will remove the child from the MCH program registry. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleUnenroll} className="bg-red-600 hover:bg-red-700">Unenroll</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <Tabs defaultValue="immunization" className="flex-grow flex flex-col">
                <div className="px-6 pt-2 border-b">
                    <TabsList className="bg-transparent h-auto p-0">
                        <TabsTrigger value="immunization" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Immunization</TabsTrigger>
                        <TabsTrigger value="growth" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Growth Monitoring</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="immunization" className="flex-grow overflow-y-auto p-6 space-y-6">
                     <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-blue-900 text-sm">Vaccination Progress</h4>
                            <span className="text-xs font-medium text-blue-700">{immunizationProgress}% Completed</span>
                        </div>
                        <Progress value={immunizationProgress} className="h-2 bg-blue-200" />
                     </div>

                     <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground"><Syringe className="h-4 w-4"/> Upcoming & Pending</h3>
                            <Dialog open={isVaccineOpen} onOpenChange={setIsVaccineOpen}>
                                <DialogTrigger asChild><Button size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3 mr-1"/> Schedule Dose</Button></DialogTrigger>
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

                        {vaccines && vaccines.length > 0 ? (
                            <div className="space-y-3">
                                {vaccines.map(v => (
                                    <div key={v.vaccineId} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${v.status === 'Administered' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {v.status === 'Administered' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{v.vaccineName} <span className="text-muted-foreground font-normal"> (Dose {v.doseNumber})</span></p>
                                                <p className="text-xs text-muted-foreground">Due: {v.dueDate instanceof Object && 'toDate' in v.dueDate ? v.dueDate.toDate().toLocaleDateString() : 'Invalid Date'}</p>
                                            </div>
                                        </div>
                                        {v.status === 'Pending' ? (
                                            <Button size="sm" onClick={() => handleAdministerVaccine(v.vaccineId)}>Administer</Button>
                                        ) : (
                                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Completed</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">No schedule set. Add a vaccine to track.</div>
                        )}
                     </div>
                </TabsContent>

                <TabsContent value="growth" className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground"><Ruler className="h-4 w-4"/> Measurements Log</h3>
                        <Dialog open={isMeasureOpen} onOpenChange={setIsMeasureOpen}>
                            <DialogTrigger asChild><Button size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3 mr-1"/> Log Measurement</Button></DialogTrigger>
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
                    
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Date Recorded</TableHead>
                                    <TableHead>Weight</TableHead>
                                    <TableHead>Height</TableHead>
                                    <TableHead>BMI</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {measurements?.map(m => (
                                    <TableRow key={m.measureId}>
                                        <TableCell className="font-medium">{m.recordedAt ? formatDistanceToNow(m.recordedAt.toDate(), { addSuffix: true }) : 'Just now'}</TableCell>
                                        <TableCell>{m.weight} kg</TableCell>
                                        <TableCell>{m.height} cm</TableCell>
                                        <TableCell>{m.computedBMI || '-'}</TableCell>
                                        <TableCell><Badge variant="outline">{m.zScoreStatus || m.status || 'Pending'}</Badge></TableCell>
                                    </TableRow>
                                ))}
                                {(!measurements || measurements.length === 0) && (
                                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No measurements recorded yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </>
    )
}
