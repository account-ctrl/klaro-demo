'use client';

import React, { useEffect, Suspense } from 'react';
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
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, User, Loader2 } from "lucide-react";
import { useAuth, initiateAnonymousSignIn, initiateEmailSignIn } from '@/firebase';

function LoginCard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const auth = useAuth();
    const [isPending, startTransition] = React.useTransition();
    const [email, setEmail] = React.useState('admin@demo.com');
    const [password, setPassword] = React.useState('password');
    const isTour = searchParams.get('tour') === 'true';

    const handleRoleSimulation = (role: 'superadmin' | 'user' | 'admin', tour: boolean) => {
        if (!auth) return;

        startTransition(async () => {
            if (role === 'user') {
                // Use a predefined email/password for the resident user to have a stable UID
                await initiateEmailSignIn(auth, 'resident@demo.com', 'password');
                router.push('/resident/dashboard');
            } else {
                 await initiateAnonymousSignIn(auth);
                 const destination = tour ? `/dashboard?role=${role}&tour=true` : `/dashboard?role=${role}`;
                 router.push(destination);
            }
        });
    };
    
    useEffect(() => {
        if (isTour) {
            handleRoleSimulation('admin', true);
        }
    }, [isTour, auth]);

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        handleRoleSimulation('admin', false);
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background/60 p-4">
        <Card className="w-full max-w-md border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-lg">
            <CardHeader className="text-center">
                 <div className="flex justify-center mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl font-bold">Sign in to your Account</CardTitle>
                <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="admin@brgy.gov.ph" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            suppressHydrationWarning
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
                            suppressHydrationWarning
                        />
                    </div>
                    <Button type="submit" size="lg" className="w-full" disabled={isPending} suppressHydrationWarning>
                        {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Shield className="mr-2" />}
                        {isPending ? 'Signing in...' : 'Login as Barangay Admin'}
                    </Button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                        Or for simulation
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Button onClick={() => handleRoleSimulation('user', false)} variant="outline" className="w-full" disabled={isPending} suppressHydrationWarning>
                        {isPending ? <Loader2 className="mr-2 animate-spin" /> : <User className="mr-2" />}
                        Resident Login
                    </Button>
                </div>

            </CardContent>
            <CardFooter>
                <p className="text-xs text-center text-muted-foreground w-full">
                    Admin login uses anonymous sign-in. Resident login uses a predefined account for profile simulation.
                </p>
            </CardFooter>
        </Card>
    </div>
  );
}

export default function HomePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
            <LoginCard />
        </Suspense>
    )
}
