
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateSystemConfig } from '@/actions/super-admin';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Activity } from "lucide-react";

export default function AdminSettingsPage() {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Config State
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [allowSignups, setAllowSignups] = useState(true);
    const [bannerMessage, setBannerMessage] = useState('');
    const [bannerActive, setBannerActive] = useState(false);

    const { data: config, isLoading } = useDoc(firestore ? doc(firestore, 'system/config') : null);

    useEffect(() => {
        if (config) {
            setMaintenanceMode(config.maintenanceMode || false);
            setAllowSignups(config.allowSignups !== false);
            setBannerMessage(config.globalBanner?.message || '');
            setBannerActive(config.globalBanner?.active || false);
        }
    }, [config]);

    const handleSave = async () => {
        if (!auth?.currentUser) return;
        setIsSaving(true);

        try {
            const token = await auth.currentUser.getIdToken();
            const payload = {
                maintenanceMode,
                allowSignups,
                globalBanner: {
                    active: bannerActive,
                    message: bannerMessage,
                    type: 'info'
                }
            };

            const result = await updateSystemConfig(token, payload);

            if (result.success) {
                toast({ title: "Configuration Saved", description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Configuration</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-amber-600" /> 
                        Operational Status
                    </CardTitle>
                    <CardDescription>Control global system availability and alerts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                        <div className="space-y-0.5">
                            <Label className="text-base">Maintenance Mode</Label>
                            <p className="text-sm text-muted-foreground">
                                Lock the system for all non-admin users.
                            </p>
                        </div>
                        <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                        <div className="space-y-0.5">
                            <Label className="text-base">Public Signups</Label>
                            <p className="text-sm text-muted-foreground">
                                Allow new tenant onboarding requests.
                            </p>
                        </div>
                        <Switch checked={allowSignups} onCheckedChange={setAllowSignups} />
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-base">Global Announcement Banner</Label>
                            <Switch checked={bannerActive} onCheckedChange={setBannerActive} />
                        </div>
                        <Textarea 
                            placeholder="Enter system-wide message (e.g., Scheduled maintenance at 2:00 AM)"
                            value={bannerMessage}
                            onChange={(e) => setBannerMessage(e.target.value)}
                            disabled={!bannerActive}
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Apply Configuration
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
