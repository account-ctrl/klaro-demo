'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TestTube, Wand2 } from "lucide-react";
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function SimulateProvisioningDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
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
                title: "Simulation Started",
                description: `Created test request for ${tenantId}. Go to Queue to approve.`
            });
            setOpen(false);
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-dashed border-amber-500 text-amber-600 hover:bg-amber-50">
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
            </DialogContent>
        </Dialog>
    );
}
