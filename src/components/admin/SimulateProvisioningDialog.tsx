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
        if (!firestore) return;
        setIsLoading(true);

        try {
            // Force test prefix for ID
            const tenantId = `test-${formData.province}-${formData.city}-${formData.barangayName}`
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-');

            // 1. Create Test Tenant Request
            await setDoc(doc(firestore, 'barangays', tenantId), {
                name: formData.barangayName,
                city: formData.city,
                province: formData.province,
                region: 'TEST-REGION',
                status: 'Onboarding', // Put it in queue
                isTest: true,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                population: Math.floor(Math.random() * 5000),
                households: Math.floor(Math.random() * 1000),
                quality: Math.floor(Math.random() * 100),
                createdAt: serverTimestamp(),
                lastActivity: serverTimestamp()
            });

            // 2. Create Mock Captain
            const userId = `user-test-${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(firestore, 'users', userId), {
                userId,
                fullName: formData.captainName,
                position: 'Captain',
                barangayId: tenantId,
                systemRole: 'Admin',
                email: `admin.${tenantId}@test.klaro.gov`,
                status: 'Active',
                isTest: true,
                createdAt: serverTimestamp()
            });

            toast({
                title: "Simulation Request Created",
                description: `Created test request for ${tenantId}. You can now launch the user journey.`
            });
            
            // Store data for next step
            setCreatedTenantData({
                province: formData.province,
                city: formData.city,
                barangayName: formData.barangayName
            });

            // Don't close immediately, show the launch button
            // setOpen(false); 
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Simulation Failed",
                description: "Could not create test data."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLaunchJourney = () => {
        if (!createdTenantData) return;
        
        const url = `/onboarding?province=${encodeURIComponent(createdTenantData.province)}&city=${encodeURIComponent(createdTenantData.city)}&barangay=${encodeURIComponent(createdTenantData.barangayName)}&simulationMode=true`;
        
        setOpen(false);
        router.push(url);
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
                        This will create a temporary tenant tagged as <span className="font-mono text-xs bg-slate-100 p-1 rounded">isTest: true</span>. 
                        It will not affect production metrics.
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
                            <div className="grid gap-2">
                                <Label>Captain Name</Label>
                                <Input value={formData.captainName} onChange={e => setFormData({...formData, captainName: e.target.value})} />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="secondary" onClick={generateRandomData}>
                                <Wand2 className="mr-2 h-4 w-4" /> Generate Random
                            </Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSimulate} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Request
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <TestTube className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Test Request Created!</h3>
                            <p className="text-slate-500 text-sm">
                                You can now approve it in the queue OR simulate the Captain's onboarding journey using these details.
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded text-sm text-left border">
                            <div className="grid grid-cols-2 gap-2">
                                <span className="text-slate-500">Barangay:</span>
                                <span className="font-medium">{createdTenantData.barangayName}</span>
                                <span className="text-slate-500">Location:</span>
                                <span className="font-medium">{createdTenantData.city}, {createdTenantData.province}</span>
                            </div>
                        </div>
                        <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={handleLaunchJourney}>
                            <PlayCircle className="mr-2 h-4 w-4" /> Launch Journey Simulator
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
