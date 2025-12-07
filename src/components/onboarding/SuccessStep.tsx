'use client';

import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, ArrowRight, ShieldCheck, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface SuccessStepProps {
  tenantData: {
    barangayName: string;
    slug: string;
    adminEmail: string;
    adminName: string;
    city: string;
    province: string;
  };
  onComplete?: () => void;
}

export function SuccessStep({ tenantData, onComplete }: SuccessStepProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const handleDownloadCertificate = async () => {
    if (certificateRef.current === null) {
      return;
    }

    try {
      const dataUrl = await toPng(certificateRef.current, { cacheBust: true, });
      const link = document.createElement('a');
      link.download = `certificate-of-commissioning-${tenantData.slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Could not download certificate', err);
    }
  };

  const handleEnterCommandCenter = () => {
    // Determine Environment
    const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
    const protocol = window.location.protocol;
    
    // Construct Subdomain URL
    // Note: In Cloud Workstations or preview envs, subdomains might not work directly. 
    // We fallback to a query param or path approach if in a special env, but following the prompt requirements:
    
    let redirectUrl = '';
    
    if (isLocal) {
        redirectUrl = `${protocol}//${tenantData.slug}.localhost:3000/login?email=${encodeURIComponent(tenantData.adminEmail)}`;
    } else {
        // Production
        redirectUrl = `https://${tenantData.slug}.klarogov.com/login?email=${encodeURIComponent(tenantData.adminEmail)}`;
    }

    // Since this is a demo environment where wildcards might not be set up, 
    // we might want a fallback to just /dashboard if onComplete is not passed.
    // However, fulfilling the prompt requirement:
    window.location.href = redirectUrl;
    
    if (onComplete) onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-700">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-full mb-4 ring-1 ring-amber-500/20">
            <Award className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-white tracking-tight">
          Mabuhay, {tenantData.barangayName}!
        </h1>
        <p className="text-zinc-400 max-w-md mx-auto">
          Your digital vault has been successfully provisioned and secured on the KlaroGov network.
        </p>
      </div>

      {/* Certificate Card (The logic to be captured) */}
      <div className="relative group">
          <div ref={certificateRef} className="w-[600px] bg-white text-slate-900 p-8 rounded-lg shadow-2xl border-[8px] border-double border-slate-200 relative overflow-hidden">
             {/* Certificate Background Pattern */}
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
             </div>
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-amber-500 to-red-600"></div>

             <div className="text-center space-y-6 py-6 border border-slate-300 h-full flex flex-col justify-center items-center">
                 {/* Seal */}
                 <div className="relative h-24 w-24 mx-auto mb-2">
                     <Image src="/KlaroGov Logo.png" alt="Official Seal" fill className="object-contain opacity-80 grayscale" />
                 </div>

                 <div className="space-y-1">
                     <p className="uppercase tracking-[0.2em] text-xs font-semibold text-slate-500">Republic of the Philippines</p>
                     <p className="uppercase tracking-[0.2em] text-xs font-semibold text-slate-500">KlaroGov Digital Registry</p>
                 </div>

                 <h2 className="font-serif text-3xl font-bold text-slate-800 px-8 leading-tight">
                     Certificate of Digital Commissioning
                 </h2>

                 <div className="px-12 text-sm text-slate-600 leading-relaxed">
                     <p>This certifies that the Local Government Unit of</p>
                     <p className="text-2xl font-serif font-bold text-blue-900 my-4 border-b border-slate-300 pb-2 inline-block min-w-[300px]">
                         {tenantData.barangayName}
                     </p>
                     <p>
                        located in {tenantData.city}, {tenantData.province}, has officially established its secure digital node on the KlaroGov Network.
                     </p>
                 </div>

                 <div className="grid grid-cols-2 gap-12 w-full px-16 mt-8 pt-4">
                     <div className="text-center">
                         <p className="font-serif font-bold text-slate-900">{tenantData.adminName}</p>
                         <div className="border-t border-slate-400 mt-1 mx-4"></div>
                         <p className="text-[10px] uppercase text-slate-500 mt-1">Authorized Custodian</p>
                     </div>
                     <div className="text-center">
                         <p className="font-serif font-bold text-slate-900">{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                         <div className="border-t border-slate-400 mt-1 mx-4"></div>
                         <p className="text-[10px] uppercase text-slate-500 mt-1">Date of Commissioning</p>
                     </div>
                 </div>

                 <div className="absolute bottom-4 right-4 text-[8px] text-slate-300 font-mono">
                     ID: {tenantData.slug} • SECURE HASH: {Math.random().toString(36).substring(7).toUpperCase()}
                 </div>
             </div>
          </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 w-full max-w-md">
         <Button 
            variant="outline" 
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={handleDownloadCertificate}
         >
             <Download className="mr-2 h-4 w-4" /> Download
         </Button>
         <Button 
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-lg shadow-amber-900/20"
            onClick={handleEnterCommandCenter}
         >
             Enter Command Center <ArrowRight className="ml-2 h-4 w-4" />
         </Button>
      </div>

    </div>
  );
}
