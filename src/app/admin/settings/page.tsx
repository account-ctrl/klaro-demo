'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, AlertTriangle, UserPlus, Shield, Globe, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export default function GlobalSettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  // Real Firestore Data Fetching for System Config
  const configDocRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'system', 'config');
  }, [firestore]);

  const { data: remoteSettings, isLoading } = useDoc(configDocRef);

  // Local state for optimistic updates and form handling
  const [settings, setSettings] = useState({
      maintenanceMode: false,
      allowSignups: true,
      aiChatEnabled: true,
      whatsappEnabled: false,
      globalBanner: {
          active: false,
          type: 'info',
          message: ''
      }
  });

  // Sync remote data to local state when loaded
  useEffect(() => {
      if (remoteSettings) {
          setSettings({
              maintenanceMode: remoteSettings.maintenanceMode ?? false,
              allowSignups: remoteSettings.allowSignups ?? true,
              aiChatEnabled: remoteSettings.aiChatEnabled ?? true,
              whatsappEnabled: remoteSettings.whatsappEnabled ?? false,
              globalBanner: {
                  active: remoteSettings.globalBanner?.active ?? false,
                  type: remoteSettings.globalBanner?.type ?? 'info',
                  message: remoteSettings.globalBanner?.message ?? ''
              }
          });
      }
  }, [remoteSettings]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('support');
  const [isInviting, setIsInviting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: string) => {
      setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleBannerChange = (field: string, value: any) => {
      setSettings(prev => ({
          ...prev,
          globalBanner: { ...prev.globalBanner, [field]: value }
      }));
  };

  const saveSettings = async () => {
      if (!firestore || !configDocRef) return;
      setIsSaving(true);
      try {
          // Write to system/config doc in Firestore
          await setDoc(configDocRef, settings, { merge: true });
          
          toast({
              title: "Settings Saved",
              description: "Global configuration has been updated successfully."
          });
      } catch (error) {
          console.error(error);
          toast({
              variant: "destructive",
              title: "Save Failed",
              description: "Could not update system configuration."
          });
      } finally {
          setIsSaving(false);
      }
  };

  const handleInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsInviting(true);
      try {
          const res = await fetch('/api/admin/invite-team', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: inviteEmail, role: inviteRole })
          });
          
          if (res.ok) {
              toast({
                  title: "Invitation Sent",
                  description: `Invite link generated for ${inviteEmail}`
              });
              setInviteEmail('');
          } else {
              throw new Error('Failed to invite');
          }
      } catch (error) {
          toast({
              variant: "destructive",
              title: "Error",
              description: "Could not send invitation."
          });
      } finally {
          setIsInviting(false);
      }
  };

  if (isLoading) {
      return <div className="flex items-center justify-center h-96">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Global Settings</h1>
                <p className="text-slate-500">Configure platform-wide behavior and manage access.</p>
            </div>
            <Button onClick={saveSettings} disabled={isSaving} className="bg-slate-900 text-white hover:bg-slate-800">
                <Save className={`mr-2 h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} /> 
                {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            
            {/* Feature Flags */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-500" />
                        <CardTitle>Platform Control</CardTitle>
                    </div>
                    <CardDescription>Manage availability and core features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Maintenance Mode</Label>
                            <p className="text-sm text-slate-500">Disable access for all non-admin users.</p>
                        </div>
                        <Switch 
                            checked={settings.maintenanceMode} 
                            onCheckedChange={() => handleToggle('maintenanceMode')} 
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Allow New Signups</Label>
                            <p className="text-sm text-slate-500">Enable public registration for onboarding.</p>
                        </div>
                        <Switch 
                            checked={settings.allowSignups} 
                            onCheckedChange={() => handleToggle('allowSignups')} 
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">AI Chat (GenKit)</Label>
                            <p className="text-sm text-slate-500">Enable RAG-powered assistant globally.</p>
                        </div>
                        <Switch 
                            checked={settings.aiChatEnabled} 
                            onCheckedChange={() => handleToggle('aiChatEnabled')} 
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Global Announcement */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-amber-500" />
                        <CardTitle>Global Broadcast</CardTitle>
                    </div>
                    <CardDescription>Display a banner on all tenant dashboards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <Label>Banner Active</Label>
                        <Switch 
                            checked={settings.globalBanner.active} 
                            onCheckedChange={(checked) => handleBannerChange('active', checked)} 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Banner Type</Label>
                        <Select 
                            value={settings.globalBanner.type} 
                            onValueChange={(val) => handleBannerChange('type', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Information (Blue)</SelectItem>
                                <SelectItem value="warning">Warning (Yellow)</SelectItem>
                                <SelectItem value="destructive">Critical (Red)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Message Content</Label>
                        <Textarea 
                            placeholder="e.g., Scheduled maintenance on Sunday..." 
                            value={settings.globalBanner.message}
                            onChange={(e) => handleBannerChange('message', e.target.value)}
                            className="resize-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Team Management */}
            <Card className="md:col-span-2 shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        <CardTitle>Admin Team Access</CardTitle>
                    </div>
                    <CardDescription>Invite new Super Admins or Support Agents.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="email">Email Address</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="colleague@klaro.gov.ph" 
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid w-full md:w-1/3 gap-1.5">
                            <Label htmlFor="role">Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="super_admin">Super Admin (Full)</SelectItem>
                                    <SelectItem value="support">Support Agent (Read-Only)</SelectItem>
                                    <SelectItem value="billing">Billing Manager</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button 
                            className="bg-amber-600 hover:bg-amber-700 text-white w-full md:w-auto" 
                            onClick={handleInvite}
                            disabled={isInviting || !inviteEmail}
                        >
                            <UserPlus className="mr-2 h-4 w-4" /> Send Invite
                        </Button>
                    </div>

                    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-slate-600">
                            <p className="font-semibold text-slate-800">Security Note:</p>
                            <p>Invited users will receive a password reset link. Ensure they enable 2FA upon first login. All actions by Super Admins are logged in the audit trail.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
