'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Users, Clock, CheckCircle2, XCircle, Search, FileText, Eye, Loader2, ShieldCheck, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { SimulateProvisioningDialog } from '@/components/admin/SimulateProvisioningDialog';
import { OnboardingSimulator } from '@/components/admin/OnboardingSimulator';

// Define the shape of our Firestore Barangay Document
type OnboardingRequest = {
    id: string; 
    name: string;
    city: string;
    province: string;
    status: 'Live' | 'Onboarding' | 'Untapped' | 'Rejected';
    createdAt: any; 
    isTest?: boolean;
};

export default function ProvisioningPage() {
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  
  const firestore = useFirestore();
  const auth = useAuth();

  // 1. Fetch Requests from 'barangays' where status is 'Onboarding'
  const requestsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(
          collection(firestore, 'barangays'),
          where('status', '==', 'Onboarding'),
          limit(50)
      );
  }, [firestore]);

  const { data: requests, isLoading } = useCollection<OnboardingRequest>(requestsQuery);

  // 2. The Action Handler (Refactored to accept optional request param)
  const handleDecision = async (action: 'approve' | 'reject' | 'delete', request?: OnboardingRequest) => {
    const target = request || selectedRequest;
    if (!target || !auth?.currentUser) return;
    
    // Safety check for delete
    if (action === 'delete' && !confirm(`Are you sure you want to permanently delete the request for ${target.name}?`)) {
        return;
    }

    setProcessing(true);
    const token = await auth.currentUser.getIdToken();

    try {
      const res = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: target.id,
          action,
          rejectionReason: action === 'reject' ? rejectReason : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Operation failed');

      toast({ 
          title: action === 'approve' ? 'Vault Provisioned Successfully!' : 
                 action === 'delete' ? 'Request Deleted.' : 'Request Rejected.' 
      });
      
      // Cleanup UI
      if (selectedRequest?.id === target.id) {
          setSelectedRequest(null);
          setIsRejectOpen(false);
      }

    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Provisioning Queue</h1>
            <p className="text-slate-500">Review and approve new tenant vault commissioning requests.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">Export Log</Button>
        </div>
      </div>

      {/* Tools Row */}
      <div className="flex gap-6 items-start">
          <div className="flex-1 space-y-6">
               {/* KPI Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                  <Card className="shadow-sm border-slate-200">
                      <CardContent className="p-6 flex items-center justify-between">
                          <div>
                              <p className="text-sm font-medium text-slate-500">Pending Review</p>
                              <h3 className="text-2xl font-bold text-slate-800">{requests?.length || 0}</h3>
                          </div>
                          <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                              <Clock className="h-5 w-5" />
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
                                <TableHead>Date Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Loading requests...</TableCell>
                                </TableRow>
                            ) : requests && requests.length > 0 ? (
                                requests.map((req) => (
                                    <TableRow key={req.id} className="hover:bg-slate-50">
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {req.id}
                                            {req.isTest && <Badge variant="secondary" className="ml-2 text-[10px] bg-amber-100 text-amber-800">TEST</Badge>}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-900">
                                            {req.name}
                                            <div className="text-xs text-slate-500">{req.city}, {req.province}</div>
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                            {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {/* Add Quick Delete for Test Requests */}
                                            {req.isTest && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Call delete directly
                                                        handleDecision('delete', req);
                                                    }}
                                                    disabled={processing}
                                                >
                                                    {processing && selectedRequest?.id === req.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700" onClick={() => setSelectedRequest(req)}>
                                                <Eye className="w-4 h-4 mr-1" /> Review
                                            </Button>
                                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setSelectedRequest(req)}>
                                                Process
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No pending requests found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                  </CardContent>
              </Card>
          </div>

          <div className="w-80 space-y-6">
              <SimulateProvisioningDialog />
              <OnboardingSimulator />
          </div>
      </div>

      {/* INSPECTION DIALOG */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Commissioning Request</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-md border text-sm space-y-2">
                {selectedRequest.isTest && (
                    <div className="flex items-center gap-2 text-amber-600 font-bold border-b border-amber-200 pb-2 mb-2">
                        <Loader2 className="h-4 w-4" /> SIMULATION DATA
                    </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Jurisdiction:</span>
                  <span className="font-bold">{selectedRequest.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span>{selectedRequest.city}, {selectedRequest.province}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Request ID:</span>
                  <span className="font-mono">{selectedRequest.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-blue-600 font-medium">{selectedRequest.status}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDecision('delete')} // Uses selectedRequest from state
                  disabled={processing}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => setIsRejectOpen(true)}
                  disabled={processing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleDecision('approve')}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* REJECTION REASON DIALOG */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason for Rejection</DialogTitle>
          </DialogHeader>
          <Textarea 
            placeholder="e.g., Jurisdiction ID conflict..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDecision('reject')} disabled={processing}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
