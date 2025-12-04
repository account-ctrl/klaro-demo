'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  AlertTriangle, 
  QrCode, 
  Megaphone, 
  ArrowRight,
  Siren,
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  ScrollText
} from "lucide-react";
import { useUser, useCollection } from '@/firebase';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResidentActions } from '@/hooks/use-resident-actions';
import { useToast } from "@/hooks/use-toast";
import { CertificateRequest } from '@/lib/types';
import { format } from 'date-fns';

// 1. Action Card Component
interface ActionCardProps {
  icon: React.ElementType;
  label: string;
  colorClass: string;
  bgClass: string;
  onClick: () => void;
}

const ActionCard = ({ icon: Icon, label, colorClass, bgClass, onClick }: ActionCardProps) => {
  return (
    <div 
        onClick={onClick}
        className="group relative w-full h-40 md:h-56 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-8 hover:-translate-y-1 active:scale-95 hover:shadow-md hover:border-blue-100 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center select-none"
    >
        <div className={cn("p-3 md:p-4 rounded-full transition-colors duration-300 mb-3 md:mb-4", bgClass)}>
            <Icon className={cn("h-8 w-8 md:h-12 md:w-12", colorClass)} strokeWidth={1.5} />
        </div>
        <h3 className="text-slate-800 font-bold text-base md:text-xl tracking-tight group-hover:text-blue-600 transition-colors text-center">
            {label}
        </h3>
    </div>
  );
};

export default function ResidentDashboardPage() {
  const { user } = useUser();
  const firstName = user?.displayName?.split(' ')[0] || 'Resident';
  const { 
      createAlert, 
      fileComplaint, 
      requestDocument, 
      getMyRequestsQuery, 
      getOrdinancesQuery, 
      getHealthSchedulesQuery,
      loading 
  } = useResidentActions();
  const { toast } = useToast();

  // Dialog States
  const [activeModal, setActiveModal] = useState<'sos' | 'blotter' | 'request' | null>(null);

  // Form States
  const [sosCategory, setSosCategory] = useState('Medical');
  const [sosMessage, setSosMessage] = useState('');
  
  const [blotterType, setBlotterType] = useState('Noise Complaint');
  const [blotterDesc, setBlotterDesc] = useState('');
  
  const [docType, setDocType] = useState('Barangay Clearance');
  const [docPurpose, setDocPurpose] = useState('');

  // --- DATA FETCHING ---

  // 1. My Requests
  const requestsQuery = useMemo(() => {
    const q = getMyRequestsQuery();
    if (q) {
        // @ts-ignore
        q.__memo = true;
    }
    return q;
  }, [getMyRequestsQuery]);
  const { data: myRequests } = useCollection<CertificateRequest>(requestsQuery);

  // 2. Ordinances (Legislative)
  const ordinancesQuery = useMemo(() => {
      const q = getOrdinancesQuery();
      if(q) { 
          // @ts-ignore
          q.__memo = true; 
      }
      return q;
  }, [getOrdinancesQuery]);
  const { data: ordinances } = useCollection(ordinancesQuery);

  // 3. Health Schedules
  const healthQuery = useMemo(() => {
      const q = getHealthSchedulesQuery();
      if(q) {
          // @ts-ignore
          q.__memo = true;
      }
      return q;
  }, [getHealthSchedulesQuery]);
  const { data: healthSchedules } = useCollection(healthQuery);


  // HANDLERS

  const handleSOS = async () => {
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: "Geolocation Error", description: "Location not supported." });
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const result = await createAlert(latitude, longitude, sosCategory, sosMessage);
        if (result) setActiveModal(null);
    }, (err) => {
        toast({ variant: 'destructive', title: "Location Error", description: err.message });
    });
  };

  const handleBlotter = async () => {
    const success = await fileComplaint(blotterType, blotterDesc);
    if (success) {
        setActiveModal(null);
        setBlotterDesc('');
    }
  };

  const handleRequest = async () => {
    const success = await requestDocument(docType, docPurpose);
    if (success) {
        setActiveModal(null);
        setDocPurpose('');
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-12 max-w-6xl mx-auto pt-2 md:pt-10 pb-20">
      
      {/* Header Section */}
      <div className="text-center space-y-2 md:space-y-3 px-4">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-[#1E293B] tracking-tight">
          Magandang Araw, {firstName}!
        </h1>
        <p className="text-base md:text-xl text-[#64748B] font-medium">
          What would you like to do today?
        </p>
      </div>

      {/* The Grid (Launcher) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-2 md:px-0">
        <ActionCard 
            label="Request Document" 
            icon={FileText} 
            colorClass="text-cyan-500" 
            bgClass="bg-cyan-50 group-hover:bg-cyan-100" 
            onClick={() => setActiveModal('request')}
        />
        <ActionCard 
            label="Report Incident" 
            icon={AlertTriangle} 
            colorClass="text-rose-500" 
            bgClass="bg-rose-50 group-hover:bg-rose-100" 
            onClick={() => setActiveModal('blotter')}
        />
        <ActionCard 
            label="My Digital ID" 
            icon={QrCode} 
            colorClass="text-slate-700" 
            bgClass="bg-slate-100 group-hover:bg-slate-200" 
            onClick={() => window.location.href = '/resident/profile'} // Simple redirect
        />
         <ActionCard 
            label="Emergency SOS" 
            icon={Siren} 
            colorClass="text-red-600 animate-pulse" 
            bgClass="bg-red-50 group-hover:bg-red-100" 
            onClick={() => setActiveModal('sos')}
        />
      </div>

      {/* --- INFO SECTIONS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2 md:px-0">
          
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" /> Recent Requests
                    </h2>
                    <Link href="/resident/my-requests" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All</Link>
                </div>
                <div className="flex-1">
                    {myRequests && myRequests.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {myRequests.slice(0, 3).map((req) => (
                                <div key={req.requestId} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${req.status === 'Ready for Pickup' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{req.certificateName}</p>
                                            <p className="text-xs text-slate-500">{req.dateRequested ? format(req.dateRequested.toDate(), 'MMM dd, yyyy') : 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                        req.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        req.status === 'Ready for Pickup' ? 'bg-green-50 text-green-700 border-green-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                        {req.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            <p className="text-sm">No recent requests.</p>
                        </div>
                    )}
                </div>
          </div>

          {/* Legislative & Health (Tabbed or Stacked) */}
          <div className="space-y-6">
              
              {/* Legislative Corner */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <h2 className="font-bold text-slate-800 flex items-center gap-2">
                          <ScrollText className="h-4 w-4 text-purple-500" /> Legislative Corner
                      </h2>
                  </div>
                  <div className="p-4">
                      {ordinances && ordinances.length > 0 ? (
                          <ul className="space-y-3">
                              {ordinances.slice(0, 3).map((ord: any) => (
                                  <li key={ord.id} className="text-sm">
                                      <span className="font-semibold text-slate-700 block">{ord.title || 'Barangay Ordinance'}</span>
                                      <span className="text-slate-500 text-xs line-clamp-1">{ord.description || 'No description provided.'}</span>
                                  </li>
                              ))}
                          </ul>
                      ) : (
                          // Dummy Data for Demo
                          <ul className="space-y-3">
                              <li className="text-sm border-l-2 border-purple-200 pl-3">
                                  <span className="font-semibold text-slate-700 block">Ordinance No. 2024-001</span>
                                  <span className="text-slate-500 text-xs">Curfew for minors set to 10:00 PM.</span>
                              </li>
                              <li className="text-sm border-l-2 border-purple-200 pl-3">
                                  <span className="font-semibold text-slate-700 block">Resolution 05-2024</span>
                                  <span className="text-slate-500 text-xs">Approval of new waste management schedule.</span>
                              </li>
                          </ul>
                      )}
                  </div>
              </div>

              {/* Health Schedule */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <h2 className="font-bold text-slate-800 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-emerald-500" /> Health Center
                      </h2>
                  </div>
                  <div className="p-4">
                      {healthSchedules && healthSchedules.length > 0 ? (
                          <div className="space-y-3">
                              {healthSchedules.slice(0, 2).map((sched: any) => (
                                  <div key={sched.id} className="flex gap-3 text-sm">
                                      <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-center min-w-[50px]">
                                          <div className="font-bold">{sched.date ? format(sched.date.toDate(), 'dd') : '01'}</div>
                                          <div className="text-[10px] uppercase">{sched.date ? format(sched.date.toDate(), 'MMM') : 'JAN'}</div>
                                      </div>
                                      <div>
                                          <div className="font-semibold text-slate-700">{sched.activity || 'Health Activity'}</div>
                                          <div className="text-slate-500 text-xs">{sched.time || '8:00 AM'}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          // Dummy Data for Demo
                          <div className="space-y-3">
                              <div className="flex gap-3 text-sm border-b border-dashed border-slate-100 pb-2">
                                  <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-center min-w-[50px] flex flex-col justify-center">
                                      <div className="font-bold text-lg leading-none">15</div>
                                      <div className="text-[10px] uppercase font-bold">DEC</div>
                                  </div>
                                  <div>
                                      <div className="font-semibold text-slate-700">Free Vaccination Drive</div>
                                      <div className="text-slate-500 text-xs">8:00 AM - 12:00 PM • Brgy. Hall</div>
                                  </div>
                              </div>
                              <div className="flex gap-3 text-sm">
                                  <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-center min-w-[50px] flex flex-col justify-center">
                                      <div className="font-bold text-lg leading-none">20</div>
                                      <div className="text-[10px] uppercase font-bold">DEC</div>
                                  </div>
                                  <div>
                                      <div className="font-semibold text-slate-700">Maternal Health Checkup</div>
                                      <div className="text-slate-500 text-xs">1:00 PM - 4:00 PM • Health Center</div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>

          </div>
      </div>

      {/* --- MODALS --- */}

      {/* SOS MODAL */}
      <Dialog open={activeModal === 'sos'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[425px] border-red-200 bg-red-50">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700"><Siren className="h-5 w-5"/> CONFIRM SOS</DialogTitle>
            <DialogDescription className="text-red-600/80">
                This will send your location to the Command Center.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="sos-cat">Emergency Type</Label>
                    <Select onValueChange={setSosCategory} defaultValue={sosCategory}>
                        <SelectTrigger className="bg-white border-red-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Medical">Medical</SelectItem>
                            <SelectItem value="Fire">Fire</SelectItem>
                            <SelectItem value="Crime">Crime</SelectItem>
                            <SelectItem value="Accident">Accident</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="sos-msg">Details (Optional)</Label>
                    <Textarea 
                        id="sos-msg" 
                        className="bg-white border-red-200" 
                        placeholder="Describe the situation..."
                        value={sosMessage}
                        onChange={(e) => setSosMessage(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setActiveModal(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleSOS} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} SEND ALERT
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BLOTTER MODAL */}
      <Dialog open={activeModal === 'blotter'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-rose-500"/> Report Incident</DialogTitle>
            <DialogDescription>
                File a confidential report to the Peace & Order committee.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Incident Type</Label>
                    <Select onValueChange={setBlotterType} defaultValue={blotterType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Noise Complaint">Noise Complaint</SelectItem>
                            <SelectItem value="Theft">Theft / Robbery</SelectItem>
                            <SelectItem value="Vandalism">Vandalism</SelectItem>
                            <SelectItem value="Harassment">Harassment</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Narrative</Label>
                    <Textarea 
                        className="min-h-[100px]" 
                        placeholder="Please describe what happened..."
                        value={blotterDesc}
                        onChange={(e) => setBlotterDesc(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
                <Button onClick={handleBlotter} disabled={loading || !blotterDesc} className="bg-rose-600 hover:bg-rose-700">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Report
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REQUEST MODAL */}
      <Dialog open={activeModal === 'request'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-cyan-500"/> Request Document</DialogTitle>
            <DialogDescription>
                Select a document type to request from the barangay hall.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Document Type</Label>
                    <Select onValueChange={setDocType} defaultValue={docType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Barangay Clearance">Barangay Clearance</SelectItem>
                            <SelectItem value="Certificate of Indigency">Certificate of Indigency</SelectItem>
                            <SelectItem value="Business Permit">Business Permit</SelectItem>
                            <SelectItem value="Certificate of Residency">Certificate of Residency</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Purpose</Label>
                    <Input 
                        placeholder="e.g., Employment, Scholarship"
                        value={docPurpose}
                        onChange={(e) => setDocPurpose(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
                <Button onClick={handleRequest} disabled={loading || !docPurpose} className="bg-cyan-600 hover:bg-cyan-700">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Request
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
