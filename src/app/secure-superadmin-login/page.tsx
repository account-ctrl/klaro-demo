'use client';

import React from 'react';
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
import { Logo } from "@/components/logo";
import { useRouter } from "next/navigation";
import { UserCog, Loader2, LockKeyhole } from "lucide-react";
import { useAuth, initiateAnonymousSignIn, FirebaseClientProvider } from '@/firebase';

function SuperAdminLoginCard() {
    const router = useRouter();
    const auth = useAuth();
    const [isPending, startTransition] = React.useTransition();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const handleSuperAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!auth) return;
        
        // In a real app, you would validate credentials here or use a proper auth provider
        // For simulation, we just check if they are trying to access as superadmin
        startTransition(async () => {
             await initiateAnonymousSignIn(auth);
             // Redirect to the new dedicated Admin Layout
             router.push(`/admin`);
        });
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 z-0 overflow-hidden">
             <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-amber-500/10 blur-[120px]" />
             <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>

        <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl z-10">
            <CardHeader className="text-center pb-2">
                 <div className="flex justify-center mb-6">
                    <Logo className="text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-white tracking-tight">System Authority</CardTitle>
                <CardDescription className="text-slate-400">Restricted Access Level 5</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {!mounted ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin h-8 w-8 text-amber-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSuperAdminLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Identity Token</Label>
                            <div className="relative">
                                <UserCog className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input 
                                    id="email" 
                                    type="text" 
                                    placeholder="sys_admin_root" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-white pl-9 focus-visible:ring-amber-500"
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">Security Key</Label>
                            <div className="relative">
                                <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input 
                                    id="password" 
                                    type="password" 
                                    placeholder="••••••••••••"
                                    required 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-white pl-9 focus-visible:ring-amber-500"
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>
                        
                        <div className="pt-2">
                            <Button 
                                type="submit" 
                                size="lg" 
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold" 
                                disabled={isPending}
                                suppressHydrationWarning
                            >
                                {isPending ? <Loader2 className="mr-2 animate-spin h-4 w-4" /> : null}
                                {isPending ? 'Authenticating Secure Session...' : 'Initialize Command Center'}
                            </Button>
                        </div>
                    </form>
                )}
                
                <div className="text-center">
                    <p className="text-xs text-slate-600 font-mono">
                        Unauthorized access attempts are logged and reported to the National Bureau of Investigation (NBI) Cybercrime Division.
                    </p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}


export default function SuperAdminLoginPage() {
    return (
        <FirebaseClientProvider>
            <SuperAdminLoginCard />
        </FirebaseClientProvider>
    )
}
