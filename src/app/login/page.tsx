'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Logo } from "@/components/logo";
import { useRouter } from "next/navigation";
import { Shield, User, Loader2, AlertTriangle } from "lucide-react";
import { useAuth, initiateEmailSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
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

                    // STRICT BARRIER: Super Admins are forbidden here
                    if (role === 'super_admin') {
                        await auth.signOut();
                        toast({
                            variant: "destructive",
                            title: "Security Alert",
                            description: "Super Admins are forbidden on this public node. Use the secure channel."
                        });
                        return;
                    }

                    // STRICT BARRIER: Must have 'captain' or 'admin' role
                    if (role !== 'captain' && role !== 'admin') {
                         await auth.signOut();
                         toast({
                             variant: "destructive",
                             title: "Access Denied",
                             description: "This account is not authorized to access the Admin Dashboard. Please contact your administrator."
                         });
                         return;
                    }

                    // Success Redirect
                    router.push('/dashboard');
                }
            } catch (error: any) {
                console.error(error);
                toast({
                    variant: "destructive",
                    title: "Authentication Failed",
                    description: error.message
                });
            }
        });
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        {/* Background Pattern */}
        <div className="fixed inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <Card className="w-full max-w-md border border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl z-10">
            <CardHeader className="text-center pb-2">
                 <div className="flex justify-center mb-6">
                    <Logo className="scale-125" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">Tenant Access Portal</CardTitle>
                <CardDescription>Authorized Barangay Personnel Only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Official Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="captain@barangay.gov.ph" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                            id="password" 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <Button type="submit" size="lg" className="w-full bg-blue-700 hover:bg-blue-800 text-white" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                        {isPending ? 'Verifying Credentials...' : 'Access Dashboard'}
                    </Button>
                </form>

                <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Assistance</span>
                    <div className="h-px bg-slate-200 flex-1" />
                </div>

                <div className="text-center text-xs text-slate-500 space-y-2">
                    <p>Forgot your credentials? Contact your City DILG Officer.</p>
                    <p>By logging in, you agree to the <a href="#" className="underline hover:text-blue-700">Data Privacy Act of 2012</a>.</p>
                </div>

            </CardContent>
        </Card>
    </div>
  );
}
