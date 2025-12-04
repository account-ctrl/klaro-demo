
'use client';

import { useState, useMemo } from 'react';
import { useResidents } from '@/hooks/use-barangay-data';
import { useEpidemiologyCases, useTreatmentLogs, useEHealthAdvancedRef } from '@/hooks/use-ehealth-advanced';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { serverTimestamp, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Microscope, AlertCircle, MapPin, CheckCircle, Plus, CalendarDays } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DemoRestrictionModal } from '@/components/demo-restriction-modal';

export default function EpidemiologyPage() {
    const { data: cases } = useEpidemiologyCases();
    const { data: residents } = useResidents();
    const casesRef = useEHealthAdvancedRef('epidemiology_cases');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCase, setNewCase] = useState({ residentId: '', diseaseName: '', purok: '', status: 'Active' });

    const activeCases = useMemo(() => cases?.filter(c => c.status === 'Active') || [], [cases]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    
    const selectedCase = useMemo(() => cases?.find(c => c.caseId === selectedCaseId), [cases, selectedCaseId]);
    const selectedResident = useMemo(() => residents?.find(r => r.residentId === selectedCase?.residentId), [residents, selectedCase]);

    const handleReportCase = () => {
        if (!casesRef || !newCase.residentId) return;
        
        addDocumentNonBlocking(casesRef, {
            residentId: newCase.residentId,
            diseaseName: newCase.diseaseName,
            status: newCase.status,
            purok: newCase.purok, // In real app, fetch from resident profile
            diagnosisDate: serverTimestamp()
        });
        setIsAddOpen(false);
        setNewCase({ residentId: '', diseaseName: '', purok: '', status: 'Active' });
    };

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
            <DemoRestrictionModal />
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Disease Surveillance</h1>
                    <p className="text-muted-foreground">Monitor outbreaks and manage infectious cases (e.g., TB DOTS).</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive"><AlertCircle className="mr-2 h-4 w-4"/> Report New Case</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Report Epidemiology Case</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Affected Resident</Label>
                                <Select onValueChange={(val) => {
                                    const r = residents?.find(res => res.residentId === val);
                                    setNewCase({...newCase, residentId: val, purok: r?.purokId || 'Unknown'})
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Select resident..." /></SelectTrigger>
                                    <SelectContent>
                                        {residents?.map(r => (
                                            <SelectItem key={r.residentId} value={r.residentId}>{r.firstName} {r.lastName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Disease Name</Label>
                                <Select onValueChange={(val) => setNewCase({...newCase, diseaseName: val})}>
                                    <SelectTrigger><SelectValue placeholder="Select disease..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Dengue">Dengue</SelectItem>
                                        <SelectItem value="Tuberculosis">Tuberculosis (TB)</SelectItem>
                                        <SelectItem value="Measles">Measles</SelectItem>
                                        <SelectItem value="COVID-19">COVID-19</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter><Button variant="destructive" onClick={handleReportCase}>Submit Report</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                {/* Active Cases List */}
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>Active Cases</span>
                            <Badge variant="destructive">{activeCases.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow overflow-y-auto">
                        {activeCases.map(c => {
                            const r = residents?.find(res => res.residentId === c.residentId);
                            return (
                                <div 
                                    key={c.caseId} 
                                    className={`p-4 border-b cursor-pointer hover:bg-muted ${selectedCaseId === c.caseId ? 'bg-destructive/5 border-l-4 border-l-destructive' : ''}`}
                                    onClick={() => setSelectedCaseId(c.caseId)}
                                >
                                    <div className="flex justify-between">
                                        <span className="font-semibold">{r ? `${r.firstName} ${r.lastName}` : 'Unknown'}</span>
                                        <span className="text-xs text-muted-foreground">{c.diagnosisDate ? formatDistanceToNow(c.diagnosisDate.toDate(), {addSuffix: true}) : ''}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">{c.diseaseName}</Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> {c.purok}</span>
                                    </div>
                                </div>
                            )
                        })}
                        {activeCases.length === 0 && <div className="p-8 text-center text-muted-foreground">No active cases reported.</div>}
                    </CardContent>
                </Card>

                {/* Case Management / DOTS Panel */}
                <Card className="lg:col-span-2 h-full flex flex-col">
                    {selectedCase && selectedResident ? (
                        <CaseDetailView caseData={selectedCase} resident={selectedResident} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-2">
                            <Microscope className="h-12 w-12 opacity-20" />
                            <p>Select a case to view details or log treatment.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function CaseDetailView({ caseData, resident }: { caseData: any, resident: any }) {
    const { data: logs } = useTreatmentLogs(caseData.caseId);
    const firestore = useFirestore();
    
    const handleLogTreatment = () => {
        if (!firestore) return;
        const colRef = collection(firestore, `barangays/barangay_san_isidro/epidemiology_cases/${caseData.caseId}/dots_treatment_logs`);
        addDocumentNonBlocking(colRef, {
            medicineTaken: 'Standard DOTS Regimen',
            takenAt: serverTimestamp(),
            observedBy: 'admin', // Replace with actual user
            notes: 'Daily intake observed.'
        });
    };

    const handleResolveCase = () => {
        if (!firestore) return;
        const docRef = doc(firestore, `barangays/barangay_san_isidro/epidemiology_cases/${caseData.caseId}`);
        updateDocumentNonBlocking(docRef, { status: 'Recovered' });
    };

    return (
        <>
            <CardHeader className="border-b bg-muted/20 pb-4">
                 <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <span className="text-destructive">{caseData.diseaseName}</span>
                            <span className="text-muted-foreground mx-2">|</span>
                            {resident.firstName} {resident.lastName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Purok: {caseData.purok}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleResolveCase}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600"/> Mark as Recovered
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-6 flex-grow overflow-y-auto space-y-6">
                {/* TB Specific DOTS Panel */}
                {caseData.diseaseName === 'Tuberculosis' && (
                    <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-semibold text-blue-700 flex items-center gap-2"><CalendarDays className="h-5 w-5"/> DOTS Treatment Log</h3>
                                <p className="text-xs text-blue-600/80">Directly Observed Treatment, Short-course</p>
                            </div>
                            <Button size="sm" onClick={handleLogTreatment}>Log Today's Intake</Button>
                        </div>
                        
                        <div className="space-y-2">
                            {logs?.map(log => (
                                <div key={log.logId} className="flex justify-between text-sm bg-white dark:bg-slate-950 p-2 rounded border shadow-sm">
                                    <span>{log.medicineTaken}</span>
                                    <span className="text-muted-foreground">{log.takenAt ? formatDistanceToNow(log.takenAt.toDate(), {addSuffix: true}) : 'Just now'}</span>
                                </div>
                            ))}
                            {(!logs || logs.length === 0) && <div className="text-center text-xs text-muted-foreground py-2">No treatment logs yet.</div>}
                        </div>
                    </div>
                )}

                {/* General Case Info */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 border rounded">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-1">Diagnosis Date</h4>
                        <p>{caseData.diagnosisDate?.toDate().toLocaleDateString()}</p>
                     </div>
                     <div className="p-4 border rounded">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-1">Status</h4>
                        <Badge variant={caseData.status === 'Active' ? 'destructive' : 'default'}>{caseData.status}</Badge>
                     </div>
                </div>
            </CardContent>
        </>
    )
}
