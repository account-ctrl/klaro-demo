
'use client';

import { useState, useMemo } from 'react';
import { useResidents, usePuroks, useHouseholds, BARANGAY_ID } from '@/hooks/use-barangay-data';
import { useEpidemiologyCases, useTreatmentLogs, useEHealthAdvancedRef } from '@/hooks/use-ehealth-advanced';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { serverTimestamp, doc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Microscope, AlertCircle, MapPin, CheckCircle, Plus, CalendarDays, Users, Activity, AlertTriangle, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { WithId } from '@/firebase/firestore/use-collection';
import { EpidemiologyCase } from '@/lib/ehealth-types';
import { useTenantProfile } from '@/hooks/use-tenant-profile';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';

const DiseaseMap = dynamic(() => import('@/components/maps/DiseaseMap'), { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-100 text-muted-foreground">Loading Map...</div>
});

function EpidemiologyPage() {
    const { data: cases } = useEpidemiologyCases();
    const { data: residents } = useResidents();
    const { data: puroks } = usePuroks();
    const { data: households } = useHouseholds();
    const { profile } = useTenantProfile();
    const casesRef = useEHealthAdvancedRef('epidemiology_cases');
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCase, setNewCase] = useState({ residentId: '', diseaseName: '', purok: '', status: 'Active', symptoms: '', dateOfOnset: '' });
    const [viewMode, setViewMode] = useState<'dashboard' | 'map'>('dashboard');

    const activeCases = useMemo(() => cases?.filter(c => c.status === 'Active' || c.status === 'Suspected') || [], [cases]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    
    // Use .id here
    const selectedCase = useMemo(() => cases?.find(c => c.id === selectedCaseId), [cases, selectedCaseId]);
    const selectedResident = useMemo(() => residents?.find(r => r.residentId === selectedCase?.residentId), [residents, selectedCase]);

    // Derived Data for Map
    const casesWithLocation = useMemo(() => {
        if (!activeCases || !residents || !households) return [];
        return activeCases.map(c => {
            const r = residents.find(res => res.residentId === c.residentId);
            const h = households.find(hh => hh.householdId === r?.householdId);
            
            if (h?.latitude && h?.longitude) {
                return {
                    ...c,
                    latitude: h.latitude,
                    longitude: h.longitude,
                    residentName: r ? `${r.firstName} ${r.lastName}` : 'Unknown'
                };
            }
            return null;
        }).filter(item => item !== null) as (EpidemiologyCase & { latitude: number; longitude: number; residentName: string })[];
    }, [activeCases, residents, households]);

    // Derived Data for Heatmap & Alerts
    const purokStats = useMemo(() => {
        const stats: Record<string, { count: number, diseases: Set<string> }> = {};
        puroks?.forEach(p => {
            stats[p.name] = { count: 0, diseases: new Set() };
        });
        
        activeCases.forEach(c => {
            const pName = c.purok || 'Unknown';
            if (!stats[pName]) stats[pName] = { count: 0, diseases: new Set() };
            stats[pName].count++;
            stats[pName].diseases.add(c.diseaseName);
        });
        return stats;
    }, [activeCases, puroks]);

    const outbreaks = useMemo(() => {
        return Object.entries(purokStats)
            .filter(([_, data]) => data.count >= 3) // Threshold > 3 active cases
            .map(([purok, data]) => ({ purok, count: data.count, diseases: Array.from(data.diseases) }));
    }, [purokStats]);

    const handleReportCase = () => {
        if (!casesRef || !newCase.residentId) return;
        
        addDocumentNonBlocking(casesRef, {
            residentId: newCase.residentId,
            diseaseName: newCase.diseaseName,
            status: newCase.status,
            purok: newCase.purok, 
            symptoms: newCase.symptoms.split(',').map(s => s.trim()),
            dateOfOnset: newCase.dateOfOnset ? new Date(newCase.dateOfOnset) : null,
            diagnosisDate: serverTimestamp()
        });
        setIsAddOpen(false);
        setNewCase({ residentId: '', diseaseName: '', purok: '', status: 'Active', symptoms: '', dateOfOnset: '' });
    };

    return (
        <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-red-700 flex items-center gap-2">
                        <Activity className="h-6 w-6"/> Disease Surveillance
                    </h1>
                    <p className="text-muted-foreground">Real-time outbreak monitoring and response.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center bg-muted p-1 rounded-lg">
                        <Button 
                            variant={viewMode === 'dashboard' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('dashboard')}
                            className="h-8"
                        >
                            <LayoutGrid className="mr-2 h-4 w-4" /> Dashboard
                        </Button>
                        <Button 
                            variant={viewMode === 'map' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('map')}
                            className="h-8"
                        >
                            <MapIcon className="mr-2 h-4 w-4" /> Map View
                        </Button>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive"><AlertCircle className="mr-2 h-4 w-4"/> Report Case</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Report Epidemiology Case</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Affected Resident</Label>
                                    <Select onValueChange={(val) => {
                                        const r = residents?.find(res => res.residentId === val);
                                        const pName = puroks?.find(p => p.purokId === r?.purokId)?.name || 'Unknown';
                                        setNewCase({...newCase, residentId: val, purok: pName})
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="Select resident..." /></SelectTrigger>
                                        <SelectContent>
                                            {residents?.map(r => (
                                                <SelectItem key={r.residentId} value={r.residentId}>{r.firstName} {r.lastName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Disease</Label>
                                        <Select onValueChange={(val) => setNewCase({...newCase, diseaseName: val})}>
                                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Dengue">Dengue</SelectItem>
                                                <SelectItem value="Tuberculosis">TB (Tuberculosis)</SelectItem>
                                                <SelectItem value="Measles">Measles</SelectItem>
                                                <SelectItem value="COVID-19">COVID-19</SelectItem>
                                                <SelectItem value="Cholera">Cholera</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select onValueChange={(val) => setNewCase({...newCase, status: val})} defaultValue="Active">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Suspected">Suspected</SelectItem>
                                                <SelectItem value="Confirmed">Confirmed</SelectItem>
                                                <SelectItem value="Active">Active</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date of Onset</Label>
                                    <Input type="date" value={newCase.dateOfOnset} onChange={e => setNewCase({...newCase, dateOfOnset: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Symptoms (comma separated)</Label>
                                    <Textarea value={newCase.symptoms} onChange={e => setNewCase({...newCase, symptoms: e.target.value})} placeholder="Fever, Rash, Cough..." />
                                </div>
                            </div>
                            <DialogFooter><Button variant="destructive" onClick={handleReportCase}>Submit Report</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {viewMode === 'map' ? (
                <div className="flex-grow border rounded-lg overflow-hidden relative">
                    <ErrorBoundary name="Disease Map">
                        <DiseaseMap cases={casesWithLocation} settings={profile} />
                    </ErrorBoundary>
                </div>
            ) : (
                <>
                    {/* ALERT BANNER */}
                    {outbreaks.length > 0 && (
                        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r shadow-sm animate-pulse">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-700" />
                                <h3 className="font-bold text-red-800">Outbreak Alert Detected</h3>
                            </div>
                            <p className="text-sm text-red-700 mt-1">
                                High activity detected in: {outbreaks.map(o => `${o.purok} (${o.diseases.join(', ')})`).join('; ')}
                            </p>
                        </div>
                    )}

                    {/* HEATMAP / STATS GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Object.entries(purokStats).map(([pName, data]) => {
                            let bgClass = "bg-slate-100 border-slate-200";
                            let textClass = "text-slate-600";
                            if (data.count > 0) {
                                bgClass = "bg-yellow-100 border-yellow-300";
                                textClass = "text-yellow-800";
                            }
                            if (data.count >= 3) {
                                bgClass = "bg-red-100 border-red-300";
                                textClass = "text-red-800";
                            }

                            return (
                                <div key={pName} className={`border rounded-lg p-3 text-center ${bgClass}`}>
                                    <div className={`text-2xl font-bold ${textClass}`}>{data.count}</div>
                                    <div className="text-xs font-medium text-muted-foreground truncate" title={pName}>{pName}</div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                        {/* Active Cases List */}
                        <Card className="h-full flex flex-col shadow-md border-t-4 border-t-red-600">
                            <CardHeader className="py-4">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>Case List</span>
                                    <Badge variant="outline">{activeCases.length}</Badge>
                                </CardTitle>
                                <CardDescription>Click to manage case</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-grow overflow-y-auto">
                                {activeCases.map(c => {
                                    const r = residents?.find(res => res.residentId === c.residentId);
                                    const caseId = c.id;
                                    return (
                                        <div 
                                            key={caseId} 
                                            className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${selectedCaseId === caseId ? 'bg-red-50 border-l-4 border-l-red-500' : ''}`}
                                            onClick={() => setSelectedCaseId(caseId)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-semibold block">{r ? `${r.firstName} ${r.lastName}` : 'Unknown'}</span>
                                                    <Badge variant={c.diseaseName === 'Dengue' ? 'destructive' : 'secondary'} className="mt-1 text-[10px]">
                                                        {c.diseaseName}
                                                    </Badge>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-muted-foreground block">{c.diagnosisDate ? formatDistanceToNow(c.diagnosisDate.toDate(), {addSuffix: true}) : ''}</span>
                                                    <span className="text-[10px] font-bold text-slate-500">{c.status.toUpperCase()}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                                                <MapPin className="h-3 w-3"/> {c.purok}
                                            </div>
                                        </div>
                                    )
                                })}
                                {activeCases.length === 0 && <div className="p-8 text-center text-muted-foreground">No active cases reported.</div>}
                            </CardContent>
                        </Card>

                        {/* Case Management / DOTS Panel */}
                        <Card className="lg:col-span-2 h-full flex flex-col shadow-md">
                            {selectedCase && selectedResident ? (
                                <CaseDetailView caseData={selectedCase} resident={selectedResident} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-2">
                                    <div className="bg-slate-100 p-4 rounded-full">
                                        <Microscope className="h-10 w-10 text-slate-400" />
                                    </div>
                                    <p>Select a case to launch response protocol.</p>
                                </div>
                            )}
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

function CaseDetailView({ caseData, resident }: { caseData: WithId<EpidemiologyCase>, resident: any }) {
    // Use .id
    const { data: logs } = useTreatmentLogs(caseData.id);
    const { data: allResidents } = useResidents();
    const firestore = useFirestore();
    
    // Clustering Logic: Find household members
    const householdContacts = useMemo(() => {
        if (!allResidents || !resident.householdId) return [];
        return allResidents.filter(r => r.householdId === resident.householdId && r.residentId !== resident.residentId);
    }, [allResidents, resident]);

    const handleLogTreatment = () => {
        if (!firestore) return;
        // Use .id
        const colRef = collection(firestore, `barangays/${BARANGAY_ID}/epidemiology_cases/${caseData.id}/dots_treatment_logs`);
        addDocumentNonBlocking(colRef, {
            medicineTaken: 'Standard DOTS Regimen',
            takenAt: serverTimestamp(),
            observedBy: 'admin', 
            notes: 'Daily intake observed.'
        });
    };

    const handleResolveCase = () => {
        if (!firestore) return;
        // Use .id
        const docRef = doc(firestore, `barangays/${BARANGAY_ID}/epidemiology_cases/${caseData.id}`);
        updateDocumentNonBlocking(docRef, { status: 'Recovered' });
    };

    return (
        <>
            <CardHeader className="border-b bg-muted/20 pb-4">
                 <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <span className="text-red-700 font-bold tracking-tight">{caseData.diseaseName} CASE</span>
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{resident.firstName} {resident.lastName}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{resident.gender}, {new Date().getFullYear() - new Date(resident.dateOfBirth).getFullYear()}y</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4"/> {caseData.purok}
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleResolveCase} className="border-green-600 text-green-700 hover:bg-green-50">
                        <CheckCircle className="mr-2 h-4 w-4"/> Declare Recovered
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-6 flex-grow overflow-y-auto space-y-6">
                
                {/* Cluster / Contact Tracing Analysis */}
                <div className="border rounded-lg p-4 bg-orange-50 border-orange-100">
                    <h3 className="font-semibold text-orange-800 flex items-center gap-2 mb-2"><Users className="h-4 w-4"/> Household Cluster Analysis</h3>
                    {householdContacts.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-xs text-orange-700 mb-2">High-risk contacts detected in the same household:</p>
                            <div className="flex flex-wrap gap-2">
                                {householdContacts.map(c => (
                                    <Badge key={c.residentId} variant="outline" className="bg-white border-orange-200 text-orange-800">
                                        {c.firstName} {c.lastName}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No immediate household contacts registered.</p>
                    )}
                </div>

                {/* TB Specific DOTS Panel */}
                {caseData.diseaseName === 'Tuberculosis' && (
                    <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-100">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-semibold text-blue-700 flex items-center gap-2"><CalendarDays className="h-5 w-5"/> DOTS Treatment Log</h3>
                                <p className="text-xs text-blue-600/80">Directly Observed Treatment, Short-course</p>
                            </div>
                            <Button size="sm" onClick={handleLogTreatment}>Log Intake</Button>
                        </div>
                        
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {logs?.map(log => (
                                <div key={log.logId} className="flex justify-between text-sm bg-white p-2 rounded border shadow-sm">
                                    <span className="font-medium text-slate-700">✅ {log.medicineTaken}</span>
                                    <span className="text-xs text-muted-foreground">{log.takenAt ? formatDistanceToNow(log.takenAt.toDate(), {addSuffix: true}) : 'Just now'}</span>
                                </div>
                            ))}
                            {(!logs || logs.length === 0) && <div className="text-center text-xs text-muted-foreground py-2">No treatment logs yet.</div>}
                        </div>
                    </div>
                )}

                {/* General Case Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-4 border rounded bg-slate-50">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Clinical Data</h4>
                        <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Onset:</span> {caseData.dateOfOnset ? new Date(caseData.dateOfOnset.toDate()).toLocaleDateString() : 'N/A'}</p>
                            <p><span className="text-muted-foreground">Diagnosis:</span> {caseData.diagnosisDate?.toDate().toLocaleDateString()}</p>
                            <div className="mt-2">
                                <span className="text-muted-foreground block mb-1">Symptoms:</span>
                                <div className="flex flex-wrap gap-1">
                                    {caseData.symptoms?.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>) || '-'}
                                </div>
                            </div>
                        </div>
                     </div>
                     <div className="p-4 border rounded bg-slate-50">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Case Status</h4>
                        <div className="flex items-center gap-2">
                            <Badge className={`text-base px-3 py-1 ${caseData.status === 'Active' ? 'bg-red-600' : 'bg-green-600'}`}>
                                {caseData.status}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {caseData.status === 'Active' ? 'Patient requires monitoring and isolation if applicable.' : 'Patient has been cleared.'}
                        </p>
                     </div>
                </div>
            </CardContent>
        </>
    )
}

export default withRoleGuard(EpidemiologyPage, [PERMISSIONS.VIEW_HEALTH]);
