'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CreditCard, CheckCircle2, AlertCircle, Download, ArrowUpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { upgradeTenantPlan } from '@/actions/billing';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import PlanManagement from './PlanManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define Tenant Type matching our Firestore 'barangays' + billing extensions
type Tenant = {
    id: string;
    name: string;
    billing?: {
        plan: string;
        status: string;
        cycle: string;
        nextBill: any;
        amount: string;
    };
};

export default function BillingPage() {
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  // Fetch Live Tenants from 'barangays'
  const tenantsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(
          collection(firestore, 'barangays'),
          orderBy('createdAt', 'desc'),
          limit(20)
      );
  }, [firestore]);

  const { data: tenants, isLoading } = useCollection<Tenant>(tenantsQuery);

  const handleUpgrade = async (tenantId: string) => {
      setIsUpgrading(tenantId);
      try {
          await upgradeTenantPlan(tenantId, 'premium');
          
          toast({
              title: "Plan Upgraded",
              description: "Tenant has been upgraded to Premium tier successfully."
          });
      } catch (error) {
          console.error(error);
          toast({
              variant: "destructive",
              title: "Upgrade Failed",
              description: "Could not apply plan changes. Check server logs."
          });
      } finally {
          setIsUpgrading(null);
      }
  };

  const getPlanBadge = (plan: string) => {
      const p = plan?.toLowerCase() || 'free';
      if (p === 'premium') return 'border-purple-200 bg-purple-50 text-purple-700';
      if (p === 'standard') return 'border-blue-200 bg-blue-50 text-blue-700';
      return 'border-slate-200 bg-slate-100 text-slate-600';
  };

  // Calculate live revenue based on tenants' plans
  const totalRevenue = tenants?.reduce((acc, tenant) => {
      const plan = tenant.billing?.plan?.toLowerCase();
      if (plan === 'premium') return acc + 15000;
      if (plan === 'standard') return acc + 1500;
      return acc;
  }, 0) || 0;

  const activeSubscriptions = tenants?.filter(t => t.billing?.status === 'active' || t.billing?.plan).length || 0;
  const premiumCount = tenants?.filter(t => t.billing?.plan?.toLowerCase() === 'premium').length || 0;
  const standardCount = tenants?.filter(t => t.billing?.plan?.toLowerCase() === 'standard').length || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Billing & Plans</h1>
                <p className="text-slate-500">Manage subscriptions, invoices, and revenue.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
            </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="plans">Plan Management</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
                {/* Revenue KPI */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Monthly Recurring Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{totalRevenue.toLocaleString()}</div>
                            <p className="text-xs text-green-600 font-medium">+Live Calculation</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Active Subscriptions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeSubscriptions}</div>
                            <div className="flex gap-2 text-xs mt-1">
                                <span className="text-slate-500">{premiumCount} Premium</span>
                                <span className="text-slate-500">{standardCount} Standard</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Past Due Accounts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {tenants?.filter(t => t.billing?.status === 'past_due').length || 0}
                            </div>
                            <p className="text-xs text-slate-500">Action required</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tenant Billing Table */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Tenant Subscriptions</CardTitle>
                            <CardDescription>Overview of plan distribution and payment status.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search tenants..." className="pl-8" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tenant ID</TableHead>
                                    <TableHead>Barangay</TableHead>
                                    <TableHead>Current Plan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Cycle</TableHead>
                                    <TableHead>Next Bill</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">Loading billing data...</TableCell>
                                    </TableRow>
                                ) : tenants && tenants.length > 0 ? (
                                    tenants.map((tenant) => (
                                        <TableRow key={tenant.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs text-slate-500">{tenant.id}</TableCell>
                                            <TableCell className="font-medium text-slate-900">{tenant.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getPlanBadge(tenant.billing?.plan || 'Free')}>
                                                    {tenant.billing?.plan || 'Free'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {tenant.billing?.status === 'active' ? (
                                                    <div className="flex items-center text-green-600 text-xs font-medium">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-slate-500 text-xs font-medium">
                                                        <AlertCircle className="h-3 w-3 mr-1" /> {tenant.billing?.status || 'No Bill'}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm">{tenant.billing?.cycle || '-'}</TableCell>
                                            <TableCell className="text-slate-600 text-sm">
                                                {tenant.billing?.nextBill?.toDate ? tenant.billing.nextBill.toDate().toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-900">{tenant.billing?.amount || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                {(tenant.billing?.plan !== 'premium' && tenant.billing?.plan !== 'Premium') && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        onClick={() => handleUpgrade(tenant.id)}
                                                        disabled={isUpgrading === tenant.id}
                                                    >
                                                        <ArrowUpCircle className="h-4 w-4 mr-1" />
                                                        {isUpgrading === tenant.id ? 'Upgrading...' : 'Upgrade'}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">No tenants found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="plans">
                <PlanManagement />
            </TabsContent>
        </Tabs>
    </div>
  );
}
