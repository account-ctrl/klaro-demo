'use client';

import { useMemo, useState, useEffect } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Landmark, AlertCircle, Siren, Gavel, Calendar, ArrowRight, FileClock, Move, Sparkles, LayoutGrid } from "lucide-react";
import { Project, Resident, CertificateRequest, FinancialTransaction, BlotterCase, ScheduleEvent, EmergencyAlert } from "@/lib/types";
import { DocumentIssuanceChart } from "./document-issuance-chart";
import { BlotterAnalyticsChart } from "./blotter-analytics-chart";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import GridLayout, { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import Image from 'next/image'; 

import { HeroBanner } from './hero-banner';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useTenant } from '@/providers/tenant-provider';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Shared card styles for the "floating panel" look
const cardStyle = "h-full w-full hover:shadow-lg transition-all duration-300 cursor-grab active:cursor-grabbing bg-white border-none shadow-sm rounded-xl overflow-hidden ring-1 ring-black/5";

const KpiCard = ({ id, title, value, icon: Icon, note, isLoading }: { id: string, title: string, value: string, icon: React.ElementType, note: string, isLoading: boolean }) => {
  return (
    <div id={id} className={cardStyle}>
      <div className="p-6 h-full flex flex-col justify-between relative group">
        <div className="absolute top-3 right-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity draggable-handle cursor-grab">
            <Move className="h-4 w-4" />
        </div>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <div className="p-2 rounded-full bg-orange-50">
                <Icon className="h-4 w-4 text-[#ff7a59]" />
            </div>
        </div>
        <div>
            {isLoading ? (
                <div className="space-y-2 mt-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-32" />
                </div>
            ) : (
                <>
                    <div className="text-2xl font-bold text-[#33475b]">{value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {note}
                    </p>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

const SosCard = ({ activeAlerts, isLoading }: { activeAlerts: number, isLoading: boolean }) => (
    <Link href="/dashboard/emergency" className="block h-full group">
        <div className={`h-full w-full hover:shadow-lg transition-all duration-300 cursor-pointer bg-white border-none shadow-sm rounded-xl overflow-hidden ring-1 ring-black/5 relative ${activeAlerts > 0 ? 'bg-red-50/30' : ''}`}>
            {activeAlerts > 0 && <div className="absolute top-0 left-0 w-1 h-full bg-[#f2545b] animate-pulse" />}
            <div className="p-6 flex flex-col justify-between h-full relative">
                 <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${activeAlerts > 0 ? 'bg-[#f2545b] text-white shadow-md shadow-red-200' : 'bg-slate-100 text-slate-500'}`}>
                        <Siren className="h-6 w-6" />
                    </div>
                    {activeAlerts > 0 && <Badge variant="destructive" className="bg-[#f2545b] hover:bg-[#d94c52] uppercase text-[10px] font-bold tracking-wider">Action Needed</Badge>}
                 </div>
                 <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground">Active SOS Alerts</p>
                    {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                        <div className="flex items-end justify-between">
                            <h3 className={`text-3xl font-bold tracking-tight ${activeAlerts > 0 ? 'text-[#f2545b]' : 'text-[#33475b]'}`}>{activeAlerts}</h3>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#ff7a59] transition-colors mb-1" />
                        </div>
                    )}
                 </div>
            </div>
        </div>
    </Link>
);

const PendingDocsCard = ({ pendingDocs, isLoading }: { pendingDocs: number, isLoading: boolean }) => (
    <Link href="/dashboard/documents" className="block h-full group">
        <div className="h-full w-full hover:shadow-lg transition-all duration-300 cursor-pointer bg-white border-none shadow-sm rounded-xl overflow-hidden ring-1 ring-black/5 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#29ABE2]" />
            <div className="p-6 flex flex-col justify-between h-full">
                 <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${pendingDocs > 0 ? 'bg-[#29ABE2] text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-500'}`}>
                        <FileClock className="h-6 w-6" />
                    </div>
                    {pendingDocs > 0 && <Badge className="bg-[#29ABE2]/10 text-[#29ABE2] hover:bg-[#29ABE2]/20 border-0 uppercase text-[10px] font-bold tracking-wider">To Process</Badge>}
                 </div>
                 <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                    {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                        <div className="flex items-end justify-between">
                            <h3 className="text-3xl font-bold tracking-tight text-[#33475b]">{pendingDocs}</h3>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#29ABE2] transition-colors mb-1" />
                        </div>
                    )}
                 </div>
            </div>
        </div>
    </Link>
);

const AlertsPanel = ({ projects, blotterCases }: { projects: Project[], blotterCases: BlotterCase[] }) => {
    const overdueProjects = useMemo(() => projects.filter(p => p.status === 'Ongoing' && p.target_end_date && new Date(p.target_end_date) < new Date()), [projects]);
    const pendingHearings = useMemo(() => blotterCases.filter(c => c.status === 'Open' || c.status === 'Under Mediation'), [blotterCases]);

    return (
        <div className={cardStyle}>
            <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="text-[#f2545b] h-5 w-5" /></div>
                    <h3 className="font-bold text-[#33475b]">Alerts & Notifications</h3>
                </div>
                <div className="space-y-3">
                     {overdueProjects.length > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#fff5f5] border border-[#fecaca]">
                            <Siren className="h-4 w-4 text-[#f2545b] mt-0.5" />
                            <div>
                                <p className="font-semibold text-sm text-[#33475b]">{overdueProjects.length} Overdue Project{overdueProjects.length > 1 ? 's' : ''}</p>
                                <Button variant="link" size="sm" className="p-0 h-auto text-[#f2545b] font-medium text-xs" asChild>
                                    <Link href="/dashboard/projects">View Projects</Link>
                                </Button>
                            </div>
                        </div>
                     )}
                    {pendingHearings.length > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                            <Gavel className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div>
                                 <p className="font-semibold text-sm text-[#33475b]">{pendingHearings.length} Pending Hearing{pendingHearings.length > 1 ? 's' : ''}</p>
                                 <Button variant="link" size="sm" className="p-0 h-auto text-amber-600 font-medium text-xs" asChild>
                                    <Link href="/dashboard/blotter">View Blotter</Link>
                                 </Button>
                            </div>
                        </div>
                     )}
                     {overdueProjects.length === 0 && pendingHearings.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Sparkles className="h-6 w-6 text-slate-300 mb-2" />
                            <p className="text-sm">All clear! No critical alerts.</p>
                        </div>
                     )}
                </div>
            </div>
        </div>
    )
}

function TodaysScheduleWidget({ events, isLoading }: { events: ScheduleEvent[], isLoading: boolean}) {
    return (
        <div className={cardStyle}>
            <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg"><Calendar className="h-5 w-5 text-[#29ABE2]" /></div>
                    <h3 className="font-bold text-[#33475b]">Today's Schedule</h3>
                </div>
                <div className="space-y-3 flex-1 overflow-auto custom-scrollbar pr-2">
                    {isLoading && [...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-12 w-14 rounded-lg" />
                            <div className="space-y-2 w-full">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                    {!isLoading && events.length > 0 ? (
                        events.map(event => (
                            <div key={event.eventId} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer">
                                <div className="flex flex-col items-center justify-center text-center font-bold text-sm w-14 shrink-0 bg-slate-100 text-[#516f90] rounded-lg py-2 h-12">
                                    <span>{format(new Date(event.start), 'h:mm')}</span>
                                    <span className="text-[10px] uppercase">{format(new Date(event.start), 'a')}</span>
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                    <p className="font-semibold text-sm text-[#33475b] truncate group-hover:text-[#29ABE2] transition-colors">{event.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground border-slate-200">{event.category}</Badge>
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(event.start), 'h:mm')} - {format(new Date(event.end), 'h:mm a')}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        !isLoading && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <Calendar className="h-10 w-10 text-slate-200 mb-2" />
                                <p className="text-sm">No events scheduled.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState('');
  const firestore = useFirestore();
  const { tenantPath } = useTenant();

  useEffect(() => {
    setCurrentDate(format(new Date(), 'eeee, MMM dd, yyyy'));
  }, []);

  // Data Fetching
  const residentsCollectionRef = useMemoFirebase(() => (firestore && tenantPath) ? collection(firestore, `${tenantPath}/residents`) : null, [firestore, tenantPath]);
  const documentsCollectionRef = useMemoFirebase(() => (firestore && tenantPath) ? collection(firestore, `${tenantPath}/certificate_requests`) : null, [firestore, tenantPath]);
  const financialsCollectionRef = useMemoFirebase(() => (firestore && tenantPath) ? collection(firestore, `${tenantPath}/financial_transactions`) : null, [firestore, tenantPath]);
  const projectsCollectionRef = useMemoFirebase(() => (firestore && tenantPath) ? collection(firestore, `${tenantPath}/projects`) : null, [firestore, tenantPath]);
  const blotterCollectionRef = useMemoFirebase(() => (firestore && tenantPath) ? collection(firestore, `${tenantPath}/blotter_cases`) : null, [firestore, tenantPath]);
  const emergencyCollectionRef = useMemoFirebase(() => (firestore && tenantPath) ? collection(firestore, `${tenantPath}/emergency_alerts`) : null, [firestore, tenantPath]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const scheduleQuery = useMemoFirebase(() => {
    if (!firestore || !tenantPath) return null;
    return query(
      collection(firestore, `${tenantPath}/schedule_events`),
      where('start', '>=', Timestamp.fromDate(todayStart)),
      where('start', '<=', Timestamp.fromDate(todayEnd)),
      orderBy('start', 'asc'),
      limit(5)
    );
  }, [firestore, tenantPath]);


  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);
  const { data: documents, isLoading: isLoadingDocs } = useCollection<CertificateRequest>(documentsCollectionRef);
  const { data: financials, isLoading: isLoadingFins } = useCollection<FinancialTransaction>(financialsCollectionRef);
  const { data: projects, isLoading: isLoadingProjs } = useCollection<Project>(projectsCollectionRef);
  const { data: blotterCases, isLoading: isLoadingBlotter } = useCollection<BlotterCase>(blotterCollectionRef);
  const { data: schedule, isLoading: isLoadingSchedule } = useCollection<ScheduleEvent>(scheduleQuery);
  const { data: alerts, isLoading: isLoadingAlerts } = useCollection<EmergencyAlert>(emergencyCollectionRef);


  // Memoized calculations
  const totalResidents = useMemo(() => residents?.length ?? 0, [residents]);
  const newResidentsThisMonth = useMemo(() => {
    const start = startOfMonth(new Date());
    return residents?.filter(r => (r as any).createdAt && (r as any).createdAt.toDate() >= start).length ?? 0;
  }, [residents]);

  const totalDocsIssuedYTD = useMemo(() => documents?.filter(d => d.status === 'Claimed').length ?? 0, [documents]);
  const docsRequestedThisMonth = useMemo(() => {
    const start = startOfMonth(new Date());
    return documents?.filter(d => d.dateRequested && d.dateRequested.toDate() >= start).length ?? 0;
  }, [documents]);
  const pendingDocsCount = useMemo(() => documents?.filter(d => d.status === 'Pending').length ?? 0, [documents]);

  const totalBlotterCasesYTD = useMemo(() => blotterCases?.length ?? 0, [blotterCases]);
  const pendingBlotterCases = useMemo(() => blotterCases?.filter(c => ['Open', 'Under Mediation'].includes(c.status)).length ?? 0, [blotterCases]);
  
  const totalFundsCollectedYTD = useMemo(() => 
    financials
        ?.filter(f => f.transactionType === 'Income' && f.status === 'Posted')
        .reduce((acc, curr) => acc + curr.amount, 0) ?? 0, 
  [financials]);
  const fundsCollectedLast30Days = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return financials
        ?.filter(f => f.transactionType === 'Income' && f.status === 'Posted' && new Date(f.transaction_date) >= thirtyDaysAgo)
        .reduce((acc, curr) => acc + curr.amount, 0) ?? 0;
  }, [financials]);
  
  const activeAlertsCount = useMemo(() => alerts?.filter(a => ['New', 'Acknowledged', 'Dispatched'].includes(a.status)).length ?? 0, [alerts]);

  const recentProjects = useMemo(() => projects?.filter(p => p.status === 'Ongoing').slice(0, 5) ?? [], [projects]);

  const getStatusBadgeVariant = (status: Project['status']) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Ongoing': return 'secondary';
      case 'Planned': return 'outline';
      default: return 'default';
    }
  };

  const isLoading = isLoadingResidents || isLoadingDocs || isLoadingFins || isLoadingProjs || isLoadingBlotter || isLoadingSchedule || isLoadingAlerts;

  // Updated Layout to include broken out cards
  const initialLayout = {
    lg: [
      { i: 'card-sos', x: 0, y: 0, w: 2, h: 4 },
      { i: 'card-pending', x: 2, y: 0, w: 2, h: 4 },
      { i: 'kpi-residents', x: 4, y: 0, w: 2, h: 4 },
      { i: 'kpi-documents', x: 6, y: 0, w: 2, h: 4 },
      { i: 'kpi-blotter', x: 8, y: 0, w: 2, h: 4 },
      { i: 'kpi-funds', x: 10, y: 0, w: 2, h: 4 },
      // Removed 'ai-chat' key
      { i: 'chart-docs', x: 0, y: 4, w: 8, h: 8 },
      { i: 'schedule', x: 8, y: 4, w: 4, h: 6 },
      { i: 'table-projects', x: 0, y: 12, w: 8, h: 8 },
      { i: 'alerts', x: 8, y: 10, w: 4, h: 6 },
      { i: 'chart-blotter', x: 8, y: 16, w: 4, h: 6 },
    ],
    md: [
        { i: 'card-sos', x: 0, y: 0, w: 5, h: 4 },
        { i: 'card-pending', x: 5, y: 0, w: 5, h: 4 },
        { i: 'kpi-residents', x: 0, y: 4, w: 5, h: 4 },
        { i: 'kpi-documents', x: 5, y: 4, w: 5, h: 4 },
        { i: 'kpi-blotter', x: 0, y: 8, w: 5, h: 4 },
        { i: 'kpi-funds', x: 5, y: 8, w: 5, h: 4 },
        // Removed 'ai-chat'
        { i: 'chart-docs', x: 0, y: 12, w: 10, h: 8 },
        { i: 'schedule', x: 0, y: 20, w: 5, h: 6 },
        { i: 'alerts', x: 5, y: 20, w: 5, h: 6 },
        { i: 'table-projects', x: 0, y: 26, w: 10, h: 8 },
        { i: 'chart-blotter', x: 0, y: 34, w: 10, h: 6 },
    ],
    sm: [
        { i: 'card-sos', x: 0, y: 0, w: 6, h: 4 },
        { i: 'card-pending', x: 0, y: 4, w: 6, h: 4 },
        { i: 'kpi-residents', x: 0, y: 8, w: 6, h: 4 },
        { i: 'kpi-documents', x: 0, y: 12, w: 6, h: 4 },
        { i: 'kpi-blotter', x: 0, y: 16, w: 6, h: 4 },
        { i: 'kpi-funds', x: 0, y: 20, w: 6, h: 4 },
        // Removed 'ai-chat'
        { i: 'chart-docs', x: 0, y: 24, w: 6, h: 8 },
        { i: 'schedule', x: 0, y: 32, w: 6, h: 6 },
        { i: 'alerts', x: 0, y: 38, w: 6, h: 6 },
        { i: 'table-projects', x: 0, y: 44, w: 6, h: 8 },
        { i: 'chart-blotter', x: 0, y: 52, w: 6, h: 6 },
    ]
  };

  const [layouts, setLayouts] = useState(initialLayout);

  const onLayoutChange = (layout: any, layouts: any) => {
    setLayouts(layouts);
  };

  return (
    <div className="flex flex-col gap-6">
        <HeroBanner 
            residents={residents ?? []}
            projects={projects ?? []}
            blotterCases={blotterCases ?? []}
            currentDate={currentDate}
            heroImageUrl={PlaceHolderImages[0]?.imageUrl}
        />

        <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={30}
            onLayoutChange={onLayoutChange}
            isDraggable
            isResizable
            draggableHandle=".card-header, .card-title, .cursor-grab, .draggable-handle"
            margin={[16, 16]}
        >
            <div key="card-sos">
                <SosCard activeAlerts={activeAlertsCount} isLoading={isLoading} />
            </div>
            <div key="card-pending">
                <PendingDocsCard pendingDocs={pendingDocsCount} isLoading={isLoading} />
            </div>

            <div key="kpi-residents">
                 <KpiCard id="kpi-residents" title="Total Residents" value={totalResidents.toLocaleString()} icon={Users} note={`+${newResidentsThisMonth} this month`} isLoading={isLoadingResidents} />
            </div>
            <div key="kpi-documents">
                <KpiCard id="kpi-documents" title="Documents Issued (YTD)" value={totalDocsIssuedYTD.toLocaleString()} icon={FileText} note={`+${docsRequestedThisMonth} requests this month`} isLoading={isLoadingDocs} />
            </div>
            <div key="kpi-blotter">
                <KpiCard id="kpi-blotter" title="Blotter Cases (YTD)" value={totalBlotterCasesYTD.toLocaleString()} icon={Gavel} note={`${pendingBlotterCases} cases pending`} isLoading={isLoadingBlotter} />
            </div>
            <div key="kpi-funds">
                <KpiCard id="kpi-funds" title="Funds Collected (YTD)" value={`₱${totalFundsCollectedYTD.toLocaleString()}`} icon={Landmark} note={`₱${fundsCollectedLast30Days.toLocaleString()} last 30d`} isLoading={isLoadingFins} />
            </div>
            
            <div key="chart-docs">
                <Card className={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-[#33475b]">Document Issuance Trend</CardTitle>
                        <CardDescription>Monthly documents issued for the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-5rem)]">
                        {isLoadingDocs ? <Skeleton className="h-full w-full" /> : <DocumentIssuanceChart requests={documents ?? []} />}
                    </CardContent>
                </Card>
            </div>

            <div key="table-projects">
                <Card className={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-[#33475b]">Active Projects</CardTitle>
                        <CardDescription>A snapshot of ongoing public works in the barangay.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-auto h-[calc(100%-5rem)]">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-[#516f90]">Project</TableHead>
                                    <TableHead className="text-[#516f90]">Status</TableHead>
                                    <TableHead className="text-right text-[#516f90]">Budget</TableHead>
                                    <TableHead className="w-[200px] text-[#516f90]">Progress</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingProjs ? [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                                    </TableRow>
                                )) : recentProjects.length > 0 ? recentProjects.map((project) => (
                                    <TableRow key={project.projectId} className="hover:bg-slate-50">
                                        <TableCell>
                                            <div className="font-medium text-[#33475b]">{project.projectName}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(project.status)} className="font-normal shadow-none">{project.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                        ₱{(project.budget_amount ?? 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={project.percentComplete ?? 0} className="h-2 bg-slate-100 [&>div]:bg-[#ff7a59]" />
                                                <span className="text-xs text-muted-foreground">{project.percentComplete ?? 0}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No ongoing projects.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div key="schedule">
                <TodaysScheduleWidget events={schedule ?? []} isLoading={isLoadingSchedule} />
            </div>

            <div key="alerts">
                 <AlertsPanel projects={projects ?? []} blotterCases={blotterCases ?? []} />
            </div>

            <div key="chart-blotter">
                 {isLoadingBlotter ? <Skeleton className="h-full w-full" /> : <div className={cardStyle}><BlotterAnalyticsChart blotterCases={blotterCases ?? []} /></div>}
            </div>

        </ResponsiveGridLayout>
    </div>
  );
}
