'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Activity, Database, Users, Server, ArrowUpRight, ShieldCheck, AlertCircle, Clock, Map as MapIcon, BarChart3, PieChart, Layers, Search, Eye } from "lucide-react";
import Link from 'next/link';
import { Progress } from "@/components/ui/progress";

// Mock Data - Owner/Big Data View
const kpiData = [
    { title: "Total Population Digitized", value: "8,245,102", trend: "+12.5k today", subtext: "Live global aggregate", icon: Users, color: "text-blue-500" },
    { title: "Households Mapped", value: "2,100,500", trend: "+540 today", subtext: "GIS validated points", icon: MapIcon, color: "text-emerald-500" },
    { title: "Active Barangays", value: "12,405", trend: "+45 this month", subtext: "SaaS Tenants", icon: ShieldCheck, color: "text-amber-500" },
    { title: "Data Completeness", value: "85%", trend: "+2%", subtext: "High Quality Records", icon: Database, color: "text-purple-500" },
];

const tenants = [
    { id: "cebu-luz", name: "Brgy. Luz", province: "Cebu", residents: "12,500", households: "3,200", lastActivity: "10 mins ago", status: "Live", quality: 92 },
    { id: "ncr-pob", name: "Poblacion", province: "Makati", residents: "45,000", households: "11,500", lastActivity: "1 hour ago", status: "Live", quality: 88 },
    { id: "dvo-mat", name: "Matina", province: "Davao", residents: "200", households: "50", lastActivity: "30 days ago", status: "Stale", quality: 45 },
    { id: "ilo-lap", name: "Lapuz", province: "Iloilo", residents: "8,400", households: "2,100", lastActivity: "2 hours ago", status: "Live", quality: 78 },
    { id: "cav-bac", name: "Bacoor West", province: "Cavite", residents: "15,200", households: "3,800", lastActivity: "5 mins ago", status: "Live", quality: 95 },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Pulse Row (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
            <Card key={index} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <span className="text-sm font-medium text-slate-500">{kpi.title}</span>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <div className="flex flex-col mt-2">
                        <span className="text-2xl font-bold text-slate-800">{kpi.value}</span>
                        <div className="flex items-center text-xs mt-1">
                            <span className={`${kpi.trend.includes('+') ? 'text-green-600' : 'text-slate-500'} font-medium mr-2`}>{kpi.trend}</span>
                            <span className="text-slate-400 truncate">{kpi.subtext}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        
        {/* 2. Population Heatmap (Main Visual) */}
        <Card className="col-span-7 lg:col-span-5 shadow-sm border-slate-200 bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-80 z-0"></div>
            <CardHeader className="relative z-10 border-b border-slate-800">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                             <Layers className="h-5 w-5 text-amber-500" /> Population Density Heatmap
                        </CardTitle>
                        <CardDescription className="text-slate-400">Real-time aggregation of 2.1M GIS household points.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="border-slate-700 text-slate-300">Cluster View</Badge>
                        <Badge variant="outline" className="border-slate-700 text-slate-300">Satellite</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-[400px] flex flex-col items-center justify-center relative z-10">
                 {/* Visual Placeholder for the Map */}
                 <div className="w-full h-full relative opacity-50">
                    {/* Abstract Map Dots */}
                    <div className="absolute top-[20%] left-[30%] h-32 w-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute top-[40%] right-[30%] h-48 w-48 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
                    <div className="absolute bottom-[20%] left-[40%] h-24 w-24 bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="text-center space-y-2">
                            <MapIcon className="h-16 w-16 text-slate-600 mx-auto" />
                            <p className="text-slate-500 text-sm">Interactive WebGL Map Component</p>
                            <p className="text-xs text-slate-600 font-mono">Rendering 2.1M Points...</p>
                         </div>
                    </div>
                 </div>
                 
                 {/* Map Legend Overlay */}
                 <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur border border-slate-800 p-3 rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                        <span className="text-slate-300">High Density (&gt;5k/sq km)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-slate-300">Medium Density</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                        <span className="text-slate-500">No Coverage (Sales Target)</span>
                    </div>
                 </div>
            </CardContent>
        </Card>

        {/* 3. Global Stats / Demographics (Side Panel) */}
        <Card className="col-span-7 lg:col-span-2 shadow-sm border-slate-200 flex flex-col">
             <CardHeader>
                <CardTitle className="text-lg text-slate-800">Demographics</CardTitle>
                <CardDescription>Aggregate Analysis</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Voter Registration</span>
                        <span className="font-bold text-slate-800">68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                </div>
                
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Vulnerable Sectors</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                             <p className="text-xs text-slate-500">Senior Citizens</p>
                             <p className="text-lg font-bold text-slate-700">1.2M</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                             <p className="text-xs text-slate-500">PWDs</p>
                             <p className="text-lg font-bold text-slate-700">450k</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                             <p className="text-xs text-slate-500">Indigent Families</p>
                             <p className="text-lg font-bold text-slate-700">2.8M</p>
                        </div>
                         <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                             <p className="text-xs text-slate-500">Solo Parents</p>
                             <p className="text-lg font-bold text-slate-700">320k</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                     <Button variant="outline" className="w-full text-slate-600 hover:text-amber-600">
                        <BarChart3 className="mr-2 h-4 w-4" /> Generate National Report
                     </Button>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* 4. Tenant Health List (Revised Table) */}
      <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-lg text-slate-800">Tenant Health & Activity</CardTitle>
                <CardDescription>Monitoring data ingestion rates and platform engagement.</CardDescription>
            </div>
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search Tenant Vault..." 
                    className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Vault ID</TableHead>
                        <TableHead>Barangay</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead>Residents</TableHead>
                        <TableHead>Households</TableHead>
                        <TableHead>Data Quality</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tenants.map((tenant) => (
                        <TableRow key={tenant.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-xs text-slate-500">{tenant.id}</TableCell>
                            <TableCell className="font-medium text-slate-900">{tenant.name}</TableCell>
                            <TableCell className="text-slate-600">{tenant.province}</TableCell>
                            <TableCell className="font-medium">{tenant.residents}</TableCell>
                            <TableCell className="text-slate-600">{tenant.households}</TableCell>
                             <TableCell>
                                <div className="flex items-center gap-2">
                                    <Progress value={tenant.quality} className={`h-1.5 w-16 ${tenant.quality > 80 ? '[&>div]:bg-green-500' : tenant.quality > 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`} />
                                    <span className="text-xs text-slate-500">{tenant.quality}%</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">{tenant.lastActivity}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`border-0 ${
                                    tenant.status === 'Live' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                    <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                        tenant.status === 'Live' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                    }`} />
                                    {tenant.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50 group">
                                    <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
      </Card>
    </div>
  );
}
