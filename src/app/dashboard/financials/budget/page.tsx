
'use client';

import React, { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useTenant } from '@/providers/tenant-provider';
import { FiscalYear, Appropriation, Allotment } from '@/lib/financials/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Wallet, PieChart, ArrowUpRight, AlertCircle, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);
}

export default function BudgetOverview() {
    const { tenantPath } = useTenant();
    const firestore = useFirestore();
    
    // Fetch Active Fiscal Year
    // In a real app, you might have a selector. For now, we assume "2024" or fetch the active one.
    // Simplifying to fetch all appropriations for demo.
    
    const appropriationsRef = useMemoFirebase(
        () => tenantPath && firestore ? collection(firestore, `${tenantPath}/appropriations`) : null,
        [tenantPath, firestore]
    );
    const { data: appropriations, isLoading: isLoadingApprop } = useCollection<Appropriation>(appropriationsRef);

    const allotmentsRef = useMemoFirebase(
        () => tenantPath && firestore ? collection(firestore, `${tenantPath}/allotments`) : null,
        [tenantPath, firestore]
    );
    const { data: allotments, isLoading: isLoadingAllot } = useCollection<Allotment>(allotmentsRef);

    if (isLoadingApprop || isLoadingAllot) {
        return <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>;
    }

    const totalBudget = appropriations?.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) || 0;
    const totalAllocated = allotments?.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) || 0;
    const totalRemainingBalance = allotments?.reduce((acc, curr) => acc + (curr.currentBalance || 0), 0) || 0;
    const totalObligated = totalAllocated - totalRemainingBalance;
    
    const utilizationRate = totalAllocated > 0 ? (totalObligated / totalAllocated) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Budget Utilization</h2>
                    <p className="text-muted-foreground">Fiscal Year 2024 - Real-time Monitoring</p>
                </div>
                <div className="flex gap-2">
                     {/* Placeholder for "New Appropriation" or "Re-align" actions */}
                     <Button variant="outline" size="sm">
                        <Wallet className="mr-2 h-4 w-4" />
                        Adjust Budget
                     </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Appropriations</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
                        <p className="text-xs text-muted-foreground">Approved Sources</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Allocated for Expense</CardTitle>
                        <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalAllocated)}</div>
                        <p className="text-xs text-muted-foreground">Distributed to Classes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Obligated Funds</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalObligated)}</div>
                        <p className="text-xs text-muted-foreground">Reserved for Payment</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                        <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{utilizationRate.toFixed(1)}%</div>
                        <Progress value={utilizationRate} className="h-2 mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Allotment Breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-2">
                     <CardHeader>
                        <CardTitle>Expense Class Breakdown</CardTitle>
                        <CardDescription>Real-time status of allotment buckets.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {allotments?.sort((a,b) => b.totalAmount - a.totalAmount).map((allotment) => {
                                const obligated = allotment.totalAmount - allotment.currentBalance;
                                const percent = (obligated / allotment.totalAmount) * 100;
                                
                                return (
                                    <div key={allotment.id} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">{allotment.description}</span>
                                                    <Badge variant="secondary" className="text-[10px]">{allotment.class}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Source: {appropriations?.find(a => a.id === allotment.appropriationId)?.sourceName || 'Unknown'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-sm">{formatCurrency(allotment.currentBalance)}</div>
                                                <div className="text-xs text-muted-foreground">Remaining</div>
                                            </div>
                                        </div>
                                        <div className="relative pt-1">
                                            <div className="flex mb-2 items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-semibold inline-block text-amber-600">
                                                        Obligated: {formatCurrency(obligated)}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-semibold inline-block">
                                                        Total: {formatCurrency(allotment.totalAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                            <Progress value={percent} className={`h-2 ${percent > 90 ? 'bg-red-100' : 'bg-secondary'}`} indicatorClassName={percent > 90 ? 'bg-red-600' : percent > 70 ? 'bg-amber-500' : 'bg-emerald-600'} />
                                        </div>
                                        <Separator />
                                    </div>
                                );
                            })}
                            {(!allotments || allotments.length === 0) && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>No Allotments Found</AlertTitle>
                                    <AlertDescription>
                                        The budget has not been set up for this fiscal year. Please configure Appropriations and Allotments.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
