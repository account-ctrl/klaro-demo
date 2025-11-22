
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function ResidentSettingsPage() {
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const [settings, setSettings] = React.useState({
        emailNotifications: true,
        smsNotifications: false,
    });

    const handleSave = () => {
        startTransition(() => {
             setTimeout(() => {
                toast({ title: 'Settings Saved', description: 'Your notification preferences have been updated.' });
             }, 500);
        });
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and notification preferences.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to receive updates from the barangay.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications" className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about document requests and announcements via email.
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="smsNotifications" className="text-base">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified via text for urgent alerts like "SOS" and document pickup.
              </p>
            </div>
             <Switch
              id="smsNotifications"
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsNotifications: checked }))}
            />
          </div>
          <Separator />
           <Button onClick={handleSave} disabled={isPending}>
             {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             Save Preferences
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
