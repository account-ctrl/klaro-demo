'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TestTube, Wand2, PlayCircle } from "lucide-react";
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function SimulateProvisioningDialog({ className }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [createdTenantData, setCreatedTenantData] = useState<{
        province: string;
        city: string;
        barangayName: string;
    } | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();

    const [formData, setFormData] = useState({
        barangayName: '',
        city: '',
        province: '',
        captainName: ''
    });

    const generateRandomData = () => {
        const adjectives = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Neon', 'Cyber'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNum = Math.floor(Math.random() * 1000);
        
        setFormData({
            barangayName: `Brgy. Test-${randomAdj}-${randomNum}`,
            city: 'Sandbox City',
            province: 'Test Province',
            captainName: `Capt. John Doe ${randomNum}`
        });
    };

    const handleSimulate = async () => {
        // Just prepare data, no DB writes needed for simulation link
        setIsLoading(true);
        try {
            // Store data for next step
            setCreatedTenantData({
                province: formData.province,
                city: formData.city,
                barangayName: formData.barangayName
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLaunchJourney = () => {
        if (!createdTenantData) return;
        
        const url = `/onboarding?province=${encodeURIComponent(createdTenantData.province)}&city=${encodeURIComponent(createdTenantData.city)}&barangay=${encodeURIComponent(createdTenantData.barangayName)}&simulationMode=true`;
        
        setOpen(false);
        // Force refresh or just standard push?
        window.location.href = url; // Standard redirect to leave the admin shell context
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                // Reset on close
                setCreatedTenantData(null); 
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className={cn("border-dashed border-amber-500 text-amber-600 hover:bg-amber-50", className)}>
                    <TestTube className="mr-2 h-4 w-4" /> Simulate Test Tenant
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TestTube className="h-5 w-5 text-amber-500" /> 
                        Mock Onboarding Simulation
                    </DialogTitle>
                    <DialogDescription>
                        This will generate a pre-filled link to test the Captain's onboarding journey.
                    </DialogDescription>
                </DialogHeader>
                
                {!createdTenantData ? (
                    <>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Barangay Name</Label>
                                <Input value={formData.barangayName} onChange={e => setFormData({...formData, barangayName: e.target.value})} placeholder="e.g. Brgy. Test-Alpha" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>City</Label>
                                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Province</Label>
                                    <Input value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="secondary" onClick={generateRandomData}>
                                <Wand2 className="mr-2 h-4 w-4" /> Generate Random
                            </Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSimulate} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Prepare Link
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <PlayCircle className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Simulation Ready</h3>
                            <p className="text-slate-500 text-sm">
                                Click below to launch the onboarding wizard as a new Captain.
                            </p>
                        </div>
                        <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={handleLaunchJourney}>
                            Launch Simulator
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
