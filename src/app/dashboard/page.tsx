'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
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
import { Users, FileText, Landmark, AlertCircle, ListTodo, Activity, Siren, FolderKanban, Sparkles, Plus, Gavel, UserPlus, Clock, Calendar, ArrowRight, FileClock } from "lucide-react";
import { Project, Resident, CertificateRequest, FinancialTransaction, BlotterCase, ScheduleEvent, EmergencyAlert } from "@/lib/types";
import { DocumentIssuanceChart } from "./document-issuance-chart";
import { BlotterAnalyticsChart } from "./blotter-analytics-chart";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AIChatWidget } from './ai-chat-widget';
import GridLayout, { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const BARANGAY_ID = 'barangay_san_isidro';

const KpiCard = ({ id, title, value, icon: Icon, note, isLoading }: { id: string, title: string, value: string, icon: React.ElementType, note: string, isLoading: boolean }) => {
  return (
    <Card id={id} className="h-full w-full hover:shadow-md transition-shadow duration-200 cursor-grab active:cursor-grabbing">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 rounded-full bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
            </>
        ) : (
            <>
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <p className="text-xs text-muted-foreground">
                    {note}
                </p>
            </>
        )}
      </CardContent>
    </Card>
  );
};

const AlertsPanel = ({ projects, blotterCases }: { projects: Project[], blotterCases: BlotterCase[] }) => {
    const overdueProjects = useMemo(() => projects.filter(p => p.status === 'Ongoing' && p.target_end_date && new Date(p.target_end_date) < new Date()), [projects]);
    const pendingHearings = useMemo(() => blotterCases.filter(c => c.status === 'Open' || c.status === 'Under Mediation'), [blotterCases]);

    return (
        <Card className="h-full w-full cursor-grab active:cursor-grabbing">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground"><AlertCircle className="text-destructive h-5 w-5" /> Alerts & Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 {overdueProjects.length > 0 && (
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-destructive/10 mt-1">
                            <Siren className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                            <p className="font-medium text-sm text-foreground">{overdueProjects.length} Overdue Project{overdueProjects.length > 1 ? 's' : ''}</p>
                            <p className="text-xs text-muted-foreground">"{overdueProjects[0].projectName}" and {overdueProjects.length > 1 ? `${overdueProjects.length - 1} others are` : 'is'} behind schedule.</p>
                            <Button variant="link" size="sm" className="p-0 h-auto text-primary" asChild>
                                <Link href="/dashboard/projects">View Projects</Link>
                            </Button>
                        </div>
                    </div>
                 )}
                {pendingHearings.length > 0 && (
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-amber-500/10 mt-1">
                            <Gavel className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                             <p className="font-medium text-sm text-foreground">{pendingHearings.length} Pending Hearing{pendingHearings.length > 1 ? 's' : ''} This Week</p>
                            <p className="text-xs text-muted-foreground">
                                Case{pendingHearings.length > 1 ? 's' : ''} {pendingHearings.slice(0, 2).map(c => `#${c.caseId}`).join(', ')} {pendingHearings.length > 2 ? ` and ${pendingHearings.length - 2} others` : ''} need scheduling.
                            </p>
                             <Button variant="link" size="sm" className="p-0 h-auto text-primary" asChild>
                                <Link href="/dashboard/blotter">View Blotter</Link>
                             </Button>
                        </div>
                    </div>
                 )}
                 {overdueProjects.length === 0 && pendingHearings.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                        <p>No critical alerts right now.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
    )
}

function TodaysScheduleWidget({ events, isLoading }: { events: ScheduleEvent[], isLoading: boolean}) {
    return (
        <Card className="h-full w-full cursor-grab active:cursor-grabbing">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground"><Calendar className="h-5 w-5 text-primary"/> Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading && [...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="h-10 w-16" />
                            <div className="space-y-1 w-full">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                    {!isLoading && events.length > 0 ? (
                        events.map(event => (
                            <div key={event.eventId} className="flex items-center gap-4">
                                <div className="text-center font-semibold text-sm w-16 shrink-0 text-foreground">
                                    {format(new Date(event.start), 'h:mm a')}
                                </div>
                                <div className="border-l-2 border-primary pl-4">
                                    <p className="font-medium text-sm text-foreground">{event.title}</p>
                                    <p className="text-xs text-muted-foreground">{event.category}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        !isLoading && (
                            <div className="text-center text-muted-foreground py-4">
                                No events scheduled for today.
                            </div>
                        )
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function ActionWidgets({ activeAlerts, pendingDocs, isLoading }: { activeAlerts: number, pendingDocs: number, isLoading: boolean }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <Link href="/dashboard/emergency" className="block group h-full cursor-pointer">
                <Card className={`border-l-4 border-l-destructive/80 transition-all hover:shadow-md h-full ${activeAlerts > 0 ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                    <CardContent className="p-4 flex items-center justify-between h-full">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${activeAlerts > 0 ? 'bg-destructive/20 text-destructive animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                                <Siren className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active SOS Alerts</p>
                                {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                                    <h3 className={`text-2xl font-bold ${activeAlerts > 0 ? 'text-destructive' : 'text-foreground'}`}>{activeAlerts}</h3>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            {activeAlerts > 0 && <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Action Needed</span>}
                            <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto mt-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </CardContent>
                </Card>
            </Link>

             <Link href="/dashboard/documents" className="block group h-full cursor-pointer">
                <Card className="border-l-4 border-l-primary/80 transition-all hover:shadow-md h-full">
                    <CardContent className="p-4 flex items-center justify-between h-full">
                         <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${pendingDocs > 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                <FileClock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                                {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                                     <h3 className={`text-2xl font-bold ${pendingDocs > 0 ? 'text-primary' : 'text-foreground'}`}>{pendingDocs}</h3>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                             {pendingDocs > 0 && <span className="text-xs font-semibold text-primary uppercase tracking-wider">To Process</span>}
                             <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto mt-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </div>
    )
}

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState('');
  const firestore = useFirestore();

  useEffect(() => {
    setCurrentDate(format(new Date(), 'eeee, MMM dd, yyyy'));
  }, []);

  // Data Fetching
  const residentsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/barangays/${BARANGAY_ID}/residents`) : null, [firestore]);
  const documentsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/barangays/${BARANGAY_ID}/certificate_requests`) : null, [firestore]);
  const financialsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/barangays/${BARANGAY_ID}/financial_transactions`) : null, [firestore]);
  const projectsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/barangays/${BARANGAY_ID}/projects`) : null, [firestore]);
  const blotterCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/barangays/${BARANGAY_ID}/blotter_cases`) : null, [firestore]);
  const emergencyCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts`) : null, [firestore]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const scheduleQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `/barangays/${BARANGAY_ID}/schedule_events`),
      where('start', '>=', Timestamp.fromDate(todayStart)),
      where('start', '<=', Timestamp.fromDate(todayEnd)),
      orderBy('start', 'asc'),
      limit(5)
    );
  }, [firestore]);


  const { data: residents, isLoading: isLoadingResidents } = useCollection<Resident>(residentsCollectionRef);
  const { data: documents, isLoading: isLoadingDocs } = useCollection<CertificateRequest>(documentsCollectionRef);
  const { data: financials, isLoading: isLoadingFins } = useCollection<FinancialTransaction>(financialsCollectionRef);
  const { data: projects, isLoading: isLoadingProjs } = useCollection<Project>(projectsCollectionRef);
  const { data: blotterCases, isLoading: isLoadingBlotter } = useCollection<BlotterCase>(blotterCollectionRef);
  const { data: schedule, isLoading: isLoadingSchedule } = useCollection<ScheduleEvent>(scheduleQuery);
  const { data: alerts, isLoading: isLoadingAlerts } = useCollection<EmergencyAlert>(emergencyCollectionRef);


  // Memoized calculations for KPI cards
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

  const initialLayout = {
    lg: [
      { i: 'action-widgets', x: 0, y: 0, w: 12, h: 4 },
      { i: 'ai-chat', x: 0, y: 4, w: 12, h: 4 },
      { i: 'kpi-residents', x: 0, y: 8, w: 3, h: 4 },
      { i: 'kpi-documents', x: 3, y: 8, w: 3, h: 4 },
      { i: 'kpi-blotter', x: 6, y: 8, w: 3, h: 4 },
      { i: 'kpi-funds', x: 9, y: 8, w: 3, h: 4 },
      { i: 'chart-docs', x: 0, y: 12, w: 8, h: 8 },
      { i: 'schedule', x: 8, y: 12, w: 4, h: 6 },
      { i: 'table-projects', x: 0, y: 20, w: 8, h: 8 },
      { i: 'alerts', x: 8, y: 18, w: 4, h: 6 },
      { i: 'chart-blotter', x: 8, y: 24, w: 4, h: 6 },
    ],
    md: [
        { i: 'action-widgets', x: 0, y: 0, w: 10, h: 4 },
        { i: 'ai-chat', x: 0, y: 4, w: 10, h: 4 },
        { i: 'kpi-residents', x: 0, y: 8, w: 5, h: 4 },
        { i: 'kpi-documents', x: 5, y: 8, w: 5, h: 4 },
        { i: 'kpi-blotter', x: 0, y: 12, w: 5, h: 4 },
        { i: 'kpi-funds', x: 5, y: 12, w: 5, h: 4 },
        { i: 'chart-docs', x: 0, y: 16, w: 10, h: 8 },
        { i: 'schedule', x: 0, y: 24, w: 5, h: 6 },
        { i: 'alerts', x: 5, y: 24, w: 5, h: 6 },
        { i: 'table-projects', x: 0, y: 30, w: 10, h: 8 },
        { i: 'chart-blotter', x: 0, y: 38, w: 10, h: 6 },
    ],
    sm: [
        { i: 'action-widgets', x: 0, y: 0, w: 6, h: 6 },
        { i: 'ai-chat', x: 0, y: 6, w: 6, h: 6 },
        { i: 'kpi-residents', x: 0, y: 12, w: 6, h: 4 },
        { i: 'kpi-documents', x: 0, y: 16, w: 6, h: 4 },
        { i: 'kpi-blotter', x: 0, y: 20, w: 6, h: 4 },
        { i: 'kpi-funds', x: 0, y: 24, w: 6, h: 4 },
        { i: 'chart-docs', x: 0, y: 28, w: 6, h: 8 },
        { i: 'schedule', x: 0, y: 36, w: 6, h: 6 },
        { i: 'alerts', x: 0, y: 42, w: 6, h: 6 },
        { i: 'table-projects', x: 0, y: 48, w: 6, h: 8 },
        { i: 'chart-blotter', x: 0, y: 56, w: 6, h: 6 },
    ]
  };

  const [layouts, setLayouts] = useState(initialLayout);

  const onLayoutChange = (layout: any, layouts: any) => {
    setLayouts(layouts);
  };

  return (
    <div className="flex flex-col gap-6">
        {/* Hero Header */}
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Magandang Araw, Admin! 👋</h1>
                    <p className="text-muted-foreground">{currentDate} | Barangay San Isidro</p>
                </div>
            </div>
        </div>

        <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={30}
            onLayoutChange={onLayoutChange}
            isDraggable
            isResizable
            draggableHandle=".card-header, .card-title, .cursor-grab"
        >
            <div key="action-widgets">
                <ActionWidgets 
                    activeAlerts={activeAlertsCount} 
                    pendingDocs={pendingDocsCount} 
                    isLoading={isLoading} 
                />
            </div>
            
            <div key="ai-chat">
                <div id="ai-chat-widget" className="h-full cursor-grab active:cursor-grabbing">
                    <AIChatWidget 
                    residents={residents ?? []}
                    projects={projects ?? []}
                    blotterCases={blotterCases ?? []}
                    isLoading={isLoading}
                    />
                </div>
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
                <KpiCard id="kpi-funds" title="Funds Collected (YTD)" value={`₱${totalFundsCollectedYTD.toLocaleString()}`} icon={Landmark} note={`₱${fundsCollectedLast30Days.toLocaleString()} in last 30 days`} isLoading={isLoadingFins} />
            </div>

            <div key="chart-docs">
                <Card className="h-full w-full cursor-grab active:cursor-grabbing">
                    <CardHeader>
                        <CardTitle>Document Issuance Trend</CardTitle>
                        <CardDescription>Monthly documents issued for the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-5rem)]">
                        {isLoadingDocs ? <Skeleton className="h-full w-full" /> : <DocumentIssuanceChart requests={documents ?? []} />}
                    </CardContent>
                </Card>
            </div>

            <div key="table-projects">
                <Card className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing">
                    <CardHeader>
                        <CardTitle>Active Projects</CardTitle>
                        <CardDescription>A snapshot of ongoing public works in the barangay.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-auto h-[calc(100%-5rem)]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Budget</TableHead>
                                    <TableHead className="w-[200px]">Progress</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingProjs ? [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                                    </TableRow>
                                )) : recentProjects.length > 0 ? recentProjects.map((project) => (
                                    <TableRow key={project.projectId}>
                                        <TableCell>
                                            <div className="font-medium text-foreground">{project.projectName}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(project.status)} className="font-normal">{project.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                        ₱{(project.budget_amount ?? 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={project.percentComplete ?? 0} className="h-2 bg-muted [&>div]:bg-primary" />
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
                 {isLoadingBlotter ? <Skeleton className="h-full w-full" /> : <div className="h-full w-full cursor-grab active:cursor-grabbing"><BlotterAnalyticsChart blotterCases={blotterCases ?? []} /></div>}
            </div>

        </ResponsiveGridLayout>
    </div>
  );
}
