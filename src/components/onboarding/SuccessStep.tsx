
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import QRCode from 'react-qr-code';
import { 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Share2,
  Award,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/firebase';

interface SuccessStepProps {
  tenantData: {
    barangayName: string;
    city: string;
    province: string;
    adminName: string;
    adminEmail: string;
    tenantId: string;
  };
  onComplete: () => void;
}

export default function SuccessStep({ tenantData, onComplete }: SuccessStepProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [serialKey, setSerialKey] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const auth = useAuth(); // Access auth state to ensure cleanup

  useEffect(() => {
    // Generate a random serial key on mount
    const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp = Date.now().toString().substring(9);
    setSerialKey(`KGOV-${randomString}-${timestamp}`);
  }, []);

  const handleDownload = async () => {
    if (certificateRef.current === null) {
      return;
    }

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(certificateRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `Certificate-Commissioning-${tenantData.tenantId}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Certificate Downloaded", description: "The digital copy has been saved to your device." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Download Failed", description: "Could not generate image. Please try again." });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEnterCommandCenter = async () => {
      // CRITICAL SAFETY STEP:
      // Since "Onboarding" might have been run in simulation mode or by a different user session,
      // we must ensure any lingering auth state is cleared before redirecting to login.
      // This forces the user to log in with the *newly created* credentials (or simulation credentials)
      // cleanly, preventing the "Unknown Tenant" error caused by stale session data.
      if (auth && auth.currentUser) {
          await auth.signOut();
      }
      onComplete(); // Triggers the redirect to /login
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-[80vh] w-full animate-in fade-in zoom-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="text-center space-y-4 mb-8 max-w-2xl">
        <div className="mx-auto bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 ring-4 ring-yellow-500/20">
            <Award className="h-8 w-8 text-yellow-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-serif">
          Mabuhay, {tenantData.barangayName}!
        </h1>
        <p className="text-lg text-zinc-400">
          Your digital fortress is commissioned. A new era of transparent and efficient governance begins today.
        </p>
      </div>

      {/* CERTIFICATE DISPLAY */}
      <div className="relative group perspective-1000 mb-10 w-full max-w-3xl">
        <div 
            ref={certificateRef}
            className="bg-[#fdfbf7] text-slate-900 p-8 md:p-12 rounded-lg shadow-2xl border-[16px] border-double border-[#1e293b] relative overflow-hidden"
            style={{ 
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
        >
            {/* Watermark / Background Seal */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <ShieldCheck className="w-96 h-96 text-slate-900" />
            </div>

            {/* Corner Ornaments */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-yellow-600 rounded-tl-3xl opacity-50"></div>
            <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-yellow-600 rounded-tr-3xl opacity-50"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-yellow-600 rounded-bl-3xl opacity-50"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-yellow-600 rounded-br-3xl opacity-50"></div>

            {/* Certificate Content */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="uppercase tracking-[0.3em] text-xs font-semibold text-slate-500">Official Document</div>
                
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1e293b] border-b-2 border-yellow-500 pb-4 px-8">
                    Certificate of Digital Commissioning
                </h2>

                <p className="text-sm md:text-base text-slate-600 italic max-w-lg leading-relaxed font-serif">
                    This document certifies that the local government unit identified below has successfully established its secure digital infrastructure within the KlaroGov National Network.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-lg py-6">
                    <div className="text-left space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Jurisdiction</p>
                        <p className="font-bold text-lg text-[#1e293b]">{tenantData.barangayName}</p>
                        <p className="text-sm text-slate-600">{tenantData.city}, {tenantData.province}</p>
                    </div>
                    <div className="text-left space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Authorized Custodian</p>
                        <p className="font-bold text-lg text-[#1e293b]">{tenantData.adminName}</p>
                        <p className="text-sm text-slate-600">{tenantData.adminEmail}</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between w-full border-t border-slate-200 pt-6 mt-4">
                    <div className="text-left space-y-2 mb-4 md:mb-0">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-yellow-600 text-yellow-700 bg-yellow-50 font-mono text-xs">
                                OFFICIAL
                            </Badge>
                            <span className="text-xs text-slate-400 font-mono">ID: {tenantData.tenantId}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Commissioned on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Digital Verification</p>
                            <p className="text-xs font-mono text-slate-600 tracking-widest">{serialKey}</p>
                        </div>
                        <div className="bg-white p-2 rounded shadow-sm border border-slate-100">
                            {serialKey && (
                                <QRCode 
                                    value={JSON.stringify({
                                        key: serialKey,
                                        tenant: tenantData.tenantId,
                                        verifier: "https://klarogov.ph/verify"
                                    })} 
                                    size={64} 
                                    level="M"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Hover Effect Hint */}
        <div className="absolute -bottom-8 w-full text-center text-xs text-zinc-500 animate-pulse">
            This certificate is a valid proof of system ownership.
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-md">
        <Button 
            variant="outline" 
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white h-12"
            onClick={handleDownload}
            disabled={isDownloading}
        >
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Save Copy
        </Button>
        <Button 
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-12 shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all hover:shadow-[0_0_25px_rgba(234,179,8,0.7)]"
            onClick={handleEnterCommandCenter}
        >
            Enter Command Center <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

    </div>
  );
}
