'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, Moon, Shield, LogOut, Smartphone, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await auth.signOut();
            router.push('/resident-portal');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
                <p className="text-muted-foreground">Manage your app preferences and account security.</p>
            </div>

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        <CardTitle>Notifications</CardTitle>
                    </div>
                    <CardDescription>Control how you receive updates from the barangay.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Push Notifications</Label>
                            <p className="text-xs text-muted-foreground">Receive alerts on your device.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">SMS Alerts</Label>
                            <p className="text-xs text-muted-foreground">Receive critical alerts via text.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Email Updates</Label>
                            <p className="text-xs text-muted-foreground">Receive newsletters and announcements.</p>
                        </div>
                        <Switch />
                    </div>
                </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Moon className="h-5 w-5 text-primary" />
                        <CardTitle>Appearance</CardTitle>
                    </div>
                    <CardDescription>Customize the look and feel of the app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Dark Mode</Label>
                            <p className="text-xs text-muted-foreground">Switch between light and dark themes.</p>
                        </div>
                        <Switch />
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle>Security</CardTitle>
                    </div>
                    <CardDescription>Manage your login methods and security settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <Smartphone className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Mobile Number</p>
                                <p className="text-xs text-muted-foreground">Used for OTP login</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm">Update</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Email Address</p>
                                <p className="text-xs text-muted-foreground">Linked to account</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm">Update</Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                                <Lock className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Change Password</p>
                                <p className="text-xs text-muted-foreground">Update your login password</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm">Change</Button>
                    </div>
                </CardContent>
                <CardFooter>
                     <Button variant="destructive" className="w-full" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Log Out
                    </Button>
                </CardFooter>
            </Card>
            
            <div className="text-center text-xs text-muted-foreground pt-4">
                <p>App Version 2.5.0 (Build 20241025)</p>
                <p>© 2024 KlaroGov Systems</p>
            </div>
        </div>
    );
}
