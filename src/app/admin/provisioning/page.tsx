'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Users, Clock, CheckCircle2, XCircle, Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

// Mock Data for Provisioning Queue
// In a real app, this would be fetched from a Firestore collection 'onboarding_requests'
const provisioningQueue = [
    { 
        id: "req-103", 
        jurisdiction: "Brgy. San Jose, Pasig", 
        custodian: "Capt. Roberto Diaz", 
        email: "roberto.diaz@pasig.gov.ph",
        status: "Pending Seal", 
        submittedAt: "2023-12-05 09:30 AM",
        notes: "Seal image resolution is too low."
    },
    { 
        id: "req-102", 
        jurisdiction: "Brgy. Poblacion, Makati", 
        custodian: "Juan Cruz", 
        email: "juan.cruz@makati.gov.ph",
        status: "Pending Review", 
        submittedAt: "2023-12-05 08:15 AM",
        notes: "Waiting for appointment paper verification."
    },
    { 
        id: "req-101", 
        jurisdiction: "Brgy. Labangon, Cebu", 
        custodian: "Maria Lim", 
        email: "maria.lim@cebucity.gov.ph",
        status: "Identity Reject", 
        submittedAt: "2023-12-04 04:45 PM",
        notes: "ID provided does not match the official name."
    },
    { 
        id: "req-100", 
        jurisdiction: "Brgy. San Antonio, Davao", 
        custodian: "Pedro Santos", 
        email: "pedro.santos@davaocity.gov.ph",
        status: "Approved", 
        submittedAt: "2023-12-04 02:00 PM",
        notes: "All documents valid. Tenant provisioned."
    },
    { 
        id: "req-099", 
        jurisdiction: "Brgy. Holy Spirit, QC", 
        custodian: "Ana Reyes", 
        email: "ana.reyes@quezoncity.gov.ph",
        status: "Approved", 
        submittedAt: "2023-12-04 10:00 AM",
        notes: "Auto-approved via DILG Integration."
    },
];

export default function ProvisioningPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Provisioning Queue</h1>
            <p className="text-slate-500">Review and approve new tenant vault commissioning requests.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">Export Log</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">Manual Provision</Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-slate-500">Pending Review</p>
                      <h3 className="text-2xl font-bold text-slate-800">12</h3>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                      <Clock className="h-5 w-5" />
                  </div>
              </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-slate-500">Approved Today</p>
                      <h3 className="text-2xl font-bold text-slate-800">8</h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                  </div>
              </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-slate-500">Rejected</p>
                      <h3 className="text-2xl font-bold text-slate-800">3</h3>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full text-red-600">
                      <XCircle className="h-5 w-5" />
                  </div>
              </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-slate-500">Avg Approval Time</p>
                      <h3 className="text-2xl font-bold text-slate-800">4h 15m</h3>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                      <FileText className="h-5 w-5" />
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* Main Queue Table */}
      <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Commissioning Requests</CardTitle>
                <CardDescription>Recent onboarding submissions requiring action.</CardDescription>
            </div>
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search requests..." 
                    className="pl-8" 
                />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Jurisdiction</TableHead>
                        <TableHead>Custodian / Applicant</TableHead>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {provisioningQueue.map((req) => (
                        <TableRow key={req.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-xs text-slate-500">{req.id}</TableCell>
                            <TableCell className="font-medium text-slate-900">{req.jurisdiction}</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-900">{req.custodian}</span>
                                    <span className="text-xs text-slate-500">{req.email}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">{req.submittedAt}</TableCell>
                            <TableCell>
                                <Badge className={`
                                    ${req.status === 'Pending Seal' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : ''}
                                    ${req.status === 'Pending Review' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''}
                                    ${req.status === 'Identity Reject' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                                    ${req.status === 'Approved' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                                    border-0
                                `}>
                                    {req.status}
                                </Badge>
                                {req.notes && req.status !== 'Approved' && (
                                    <p className="text-[10px] text-slate-400 mt-1 max-w-[150px] truncate">{req.notes}</p>
                                )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                {req.status === 'Approved' ? (
                                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" disabled>
                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Provisioned
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">Review</Button>
                                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Approve</Button>
                                    </>
                                )}
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
