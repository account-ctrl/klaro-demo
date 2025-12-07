'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Users, Clock, CheckCircle2, XCircle, Search, FileText, Eye, Loader2, ShieldCheck, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';

// Define the shape of our Firestore Barangay Document
type OnboardingRequest = {
    id: string; 
    name: string;
    city: string;
    province: string;
    status: 'Live' | 'Onboarding' | 'Untapped' | 'Rejected';
    createdAt: any; 
    // We might store custodian info in subcollection 'users' or denormalized here.
    // For this implementation, we assume we can fetch associated users or they are denormalized.
};

export default function ProvisioningPage() {
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  
  const firestore = useFirestore();
  const auth = useAuth();

  // 1. Fetch Requests from 'barangays' where status is 'Onboarding'
  // These are the "Pending" requests in our current data model
  const requestsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(
          collection(firestore, 'barangays'),
          where('status', '==', 'Onboarding'),
          // orderBy('createdAt', 'desc'), // Requires index
          limit(50)
      );
  }, [firestore]);

  const { data: requests, isLoading } = useCollection<OnboardingRequest>(requestsQuery);

  // 2. The Action Handler
  const handleDecision = async (action: 'approve' | 'reject') => {
    if (!selectedRequest || !auth?.currentUser) return;
    
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
          requestId: selectedRequest.id,
          action,
          rejectionReason: action === 'reject' ? rejectReason : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Operation failed');

      toast({ title: action === 'approve' ? 'Vault Provisioned Successfully!' : 'Request Rejected.' });
      
      setSelectedRequest(null);
      setIsRejectOpen(false);

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

      {/* KPI Summary (Mocked logic for demo as we only query pending) */}
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
          {/* Other KPIs can be wired up with separate queries if needed */}
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
                        {/* <TableHead>Custodian / Applicant</TableHead> */}
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
                                <TableCell className="font-mono text-xs text-slate-500">{req.id}</TableCell>
                                <TableCell className="font-medium text-slate-900">
                                    {req.name}
                                    <div className="text-xs text-slate-500">{req.city}, {req.province}</div>
                                </TableCell>
                                {/* <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">Custodian Info</span>
                                    </div>
                                </TableCell> */}
                                <TableCell className="text-slate-500 text-sm">
                                    {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                </TableCell>
                                <TableCell>
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">
                                        {req.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
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

      {/* INSPECTION DIALOG */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Commissioning Request</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-md border text-sm space-y-2">
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
                  Confirm & Provision
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
