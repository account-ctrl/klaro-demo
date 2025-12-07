'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useRouter } from "next/navigation";
import { Lock, User, Key, Loader2, AlertOctagon, Terminal } from "lucide-react";
import { useAuth, initiateEmailSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Logo } from "@/components/logo";

export default function SecureAdminLoginPage() {
    const router = useRouter();
    const auth = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;

        startTransition(async () => {
            try {
                // 1. Authenticate
                await initiateEmailSignIn(auth, email, password);
                
                // 2. Security Check (Role Enforcement)
                const user = auth.currentUser;
                if (user) {
                    const tokenResult = await user.getIdTokenResult(true);
                    const role = tokenResult.claims.role;

                    // STRICT BARRIER: Only Super Admins Allowed
                    if (role !== 'super_admin') {
                        await auth.signOut();
                        toast({
                            variant: "destructive",
                            title: "ACCESS DENIED",
                            description: "Credentials verified but insufficient clearance. Incident logged."
                        });
                        return;
                    }

                    // Success Redirect
                    router.push('/admin');
                }
            } catch (error: any) {
                console.error(error);
                toast({
                    variant: "destructive",
                    title: "Authentication Protocol Failed",
                    description: "Invalid credentials."
                });
            }
        });
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050A18] p-4 font-mono">
        {/* Subtle radial gradient for depth */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#0A1229] via-[#050A18] to-black z-0 pointer-events-none" />
        
        <Card className="w-full max-w-sm border-[#1F2937] bg-[#0A1124] text-slate-200 shadow-2xl z-10 rounded-lg">
            <CardHeader className="text-center pt-8 pb-4">
                 <div className="flex justify-center mb-4">
                    <div className="bg-orange-500 rounded p-1">
                        {/* KlaroGov Logo Placeholder - White Icon */}
                        <div className="grid grid-cols-2 gap-0.5 w-6 h-6">
                            <div className="bg-white rounded-[1px]"></div>
                            <div className="bg-white rounded-[1px] opacity-70"></div>
                            <div className="bg-white rounded-[1px] opacity-70"></div>
                            <div className="bg-white rounded-[1px]"></div>
                        </div>
                    </div>
                    <span className="ml-2 font-bold text-lg text-white tracking-tight flex items-center">KlaroGov</span>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-white">System Authority</CardTitle>
                <CardDescription className="text-slate-500 text-xs mt-1">
                    Restricted Access Level 5
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8 px-8">
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-400 text-xs font-medium">Identity Token</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="sys_admin_root" 
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 bg-[#0F172A] border-[#1E293B] text-slate-200 placeholder:text-slate-600 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-10 text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-400 text-xs font-medium">Security Key</Label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <Input 
                                id="password" 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="pl-10 bg-[#0F172A] border-[#1E293B] text-slate-200 placeholder:text-slate-600 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-10 text-sm font-sans tracking-widest"
                            />
                        </div>
                    </div>
                    <Button 
                        type="submit" 
                        className="w-full bg-[#EA780E] hover:bg-[#D66A05] text-white font-semibold text-sm h-10 mt-2 transition-all shadow-[0_0_15px_rgba(234,120,14,0.3)] hover:shadow-[0_0_20px_rgba(234,120,14,0.5)] border-0" 
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Initialize Command Center"}
                    </Button>
                </form>

                <div className="text-center text-[10px] text-slate-600 leading-tight pt-4 border-t border-[#1E293B]">
                    Unauthorized access attempts are logged and reported to the National Bureau of Investigation (NBI) Cybercrime Division.
                </div>

            </CardContent>
        </Card>
    </div>
  );
}
