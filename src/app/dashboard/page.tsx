
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
import { Users, FileText, Landmark, AlertCircle, ListTodo, Activity, Siren, FolderKanban, Sparkles, Plus, Gavel, UserPlus, Clock, Calendar } from "lucide-react";
import { Project, Resident, CertificateRequest, FinancialTransaction, BlotterCase, ScheduleEvent } from "@/lib/types";
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

const BARANGAY_ID = 'barangay_san_isidro';


const KpiCard = ({ id, title, value, icon: Icon, note, isLoading }: { id: string, title: string, value: string, icon: React.ElementType, note: string, isLoading: boolean }) => {
  return (
    <Card id={id}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
            </>
        ) : (
            <>
                <div className="text-2xl font-bold">{value}</div>
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertCircle className="text-destructive h-5 w-5" /> Alerts & Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 {overdueProjects.length > 0 && (
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-destructive/10 mt-1">
                            <Siren className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">{overdueProjects.length} Overdue Project{overdueProjects.length > 1 ? 's' : ''}</p>
                            <p className="text-xs text-muted-foreground">"{overdueProjects[0].projectName}" and {overdueProjects.length > 1 ? `${overdueProjects.length - 1} others are` : 'is'} behind schedule.</p>
                            <Link href="/dashboard/projects" asChild>
                                <Button variant="link" size="sm" className="p-0 h-auto">View Projects</Button>
                            </Link>
                        </div>
                    </div>
                 )}
                {pendingHearings.length > 0 && (
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-amber-500/10 mt-1">
                            <Gavel className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                             <p className="font-medium text-sm">{pendingHearings.length} Pending Hearing{pendingHearings.length > 1 ? 's' : ''} This Week</p>
                            <p className="text-xs text-muted-foreground">
                                Case{pendingHearings.length > 1 ? 's' : ''} {pendingHearings.slice(0, 2).map(c => `#${c.caseId}`).join(', ')} {pendingHearings.length > 2 ? ` and ${pendingHearings.length - 2} others` : ''} need scheduling.
                            </p>
                             <Link href="/dashboard/blotter" asChild>
                                <Button variant="link" size="sm" className="p-0 h-auto">View Blotter</Button>
                             </Link>
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5"/> Today's Schedule</CardTitle>
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
                                <div className="text-center font-semibold text-sm w-16 shrink-0">
                                    {format(new Date(event.start), 'h:mm a')}
                                </div>
                                <div className="border-l-2 border-primary pl-4">
                                    <p className="font-medium text-sm">{event.title}</p>
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

  const recentProjects = useMemo(() => projects?.filter(p => p.status === 'Ongoing').slice(0, 5) ?? [], [projects]);

  const getStatusBadgeVariant = (status: Project['status']) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Ongoing': return 'secondary';
      case 'Planned': return 'outline';
      default: return 'default';
    }
  };

  const isLoading = isLoadingResidents || isLoadingDocs || isLoadingFins || isLoadingProjs || isLoadingBlotter || isLoadingSchedule;

  return (
    <div className="flex flex-col gap-6">
        {/* Hero Header */}
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Magandang Araw, Admin! 👋</h1>
                    <p className="text-muted-foreground">{currentDate} | Barangay San Isidro</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Link href="/dashboard/documents" asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> New Request</Button>
                    </Link>
                    <Link href="/dashboard/blotter" asChild>
                        <Button variant="destructive"><Gavel className="mr-2 h-4 w-4" /> File Blotter</Button>
                    </Link>
                    <Link href="/dashboard/residents" asChild>
                        <Button variant="secondary"><UserPlus className="mr-2 h-4 w-4" /> Add Resident</Button>
                    </Link>
                </div>
            </div>
        </div>

        {/* AI Insight Widget */}
        <div id="ai-chat-widget">
            <AIChatWidget 
              residents={residents ?? []}
              projects={projects ?? []}
              blotterCases={blotterCases ?? []}
              isLoading={isLoading}
            />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" id="kpi-cards">
            <KpiCard id="kpi-residents" title="Total Residents" value={totalResidents.toLocaleString()} icon={Users} note={`+${newResidentsThisMonth} this month`} isLoading={isLoadingResidents} />
            <KpiCard id="kpi-documents" title="Documents Issued (YTD)" value={totalDocsIssuedYTD.toLocaleString()} icon={FileText} note={`+${docsRequestedThisMonth} requests this month`} isLoading={isLoadingDocs} />
            <KpiCard id="kpi-blotter" title="Blotter Cases (YTD)" value={totalBlotterCasesYTD.toLocaleString()} icon={Gavel} note={`${pendingBlotterCases} cases pending`} isLoading={isLoadingBlotter} />
            <KpiCard id="kpi-funds" title="Funds Collected (YTD)" value={`₱${totalFundsCollectedYTD.toLocaleString()}`} icon={Landmark} note={`₱${fundsCollectedLast30Days.toLocaleString()} in last 30 days`} isLoading={isLoadingFins} />
        </div>

        {/* Main Content Grid */}
         <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
             <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Document Issuance Trend</CardTitle>
                        <CardDescription>Monthly documents issued for the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingDocs ? <Skeleton className="h-[250px]" /> : <DocumentIssuanceChart requests={documents ?? []} />}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Active Projects</CardTitle>
                        <CardDescription>A snapshot of ongoing public works in the barangay.</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                            <div className="font-medium">{project.projectName}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(project.status)} className="font-normal">{project.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                        ₱{(project.budget_amount ?? 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={project.percentComplete ?? 0} className="h-2" />
                                                <span className="text-xs text-muted-foreground">{project.percentComplete ?? 0}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No ongoing projects.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <TodaysScheduleWidget events={schedule ?? []} isLoading={isLoadingSchedule} />
                <AlertsPanel projects={projects ?? []} blotterCases={blotterCases ?? []} />
                 {isLoadingBlotter ? <Skeleton className="h-full w-full" /> : <BlotterAnalyticsChart blotterCases={blotterCases ?? []} />}
            </div>
        </div>
    </div>
  );
}
