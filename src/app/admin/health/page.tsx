'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle, Server, RefreshCw, AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system-health');
      if (res.ok) {
          const data = await res.json();
          setHealth(data);
          setLastUpdated(new Date());
      } else {
          setHealth({ status: 'error' });
      }
    } catch (e) {
      console.error(e);
      setHealth({ status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'healthy': return 'text-green-500';
          case 'degraded': return 'text-yellow-500';
          case 'critical': case 'error': return 'text-red-500';
          default: return 'text-slate-500';
      }
  };

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'healthy': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Operational</Badge>;
          case 'degraded': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">Degraded</Badge>;
          case 'critical': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">Critical</Badge>;
          default: return <Badge variant="outline">Unknown</Badge>;
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">System Health</h1>
                <p className="text-slate-500">Real-time monitoring of platform stability and performance.</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                    Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                </span>
                <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
        </div>

        {/* Top Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">API Latency</CardTitle>
                    <Activity className={`h-4 w-4 ${getStatusColor(health?.status || 'unknown')}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{health?.latency || '-'}</div>
                    <p className="text-xs text-muted-foreground">Target: &lt;200ms</p>
                </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                    <AlertTriangle className={`h-4 w-4 ${health?.errorCount > 0 ? 'text-yellow-500' : 'text-slate-400'}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{health?.errorCount || 0}</div>
                    <p className="text-xs text-muted-foreground">Errors in last hour</p>
                </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
                    {getStatusBadge(health?.status || 'unknown')}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold capitalize">{health?.status || 'Unknown'}</div>
                    <p className="text-xs text-muted-foreground">Global Availability</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            {/* Storage Quota */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-purple-500" />
                        <CardTitle>Storage Quota</CardTitle>
                    </div>
                    <CardDescription>Firestore & Storage Bucket Usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Firestore Reads (Daily)</span>
                            <span className="font-medium">45%</span>
                        </div>
                        <Progress value={45} className="h-2" />
                        <p className="text-xs text-slate-500 text-right">22.5k / 50k Reads</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Storage (GB)</span>
                            <span className="font-medium">12%</span>
                        </div>
                        <Progress value={12} className="h-2" />
                        <p className="text-xs text-slate-500 text-right">0.6 / 5 GB</p>
                    </div>
                </CardContent>
            </Card>

            {/* Service Status List */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-blue-500" />
                        <CardTitle>Service Components</CardTitle>
                    </div>
                    <CardDescription>Individual module health checks</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[
                            { name: 'Authentication', status: 'Operational' },
                            { name: 'Database (Firestore)', status: 'Operational' },
                            { name: 'Storage Buckets', status: 'Operational' },
                            { name: 'Cloud Functions', status: 'Degraded' },
                            { name: 'Hosting (CDN)', status: 'Operational' }
                        ].map((service) => (
                            <div key={service.name} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {service.status === 'Operational' ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                                    )}
                                    <span className="text-sm font-medium text-slate-700">{service.name}</span>
                                </div>
                                <span className={`text-xs font-medium ${service.status === 'Operational' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {service.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
