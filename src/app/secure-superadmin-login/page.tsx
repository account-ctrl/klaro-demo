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
import { UserCog, Loader2 } from "lucide-react";
import { useAuth, initiateAnonymousSignIn, FirebaseClientProvider } from '@/firebase';

function SuperAdminLoginCard() {
    const router = useRouter();
    const auth = useAuth();
    const [isPending, startTransition] = React.useTransition();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleSuperAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!auth) return;
        
        // In a real app, you would validate credentials here or use a proper auth provider
        // For simulation, we just check if they are trying to access as superadmin
        startTransition(async () => {
             await initiateAnonymousSignIn(auth);
             router.push(`/dashboard?role=superadmin`);
        });
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background/60 p-4">
        <Card className="w-full max-w-md border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-lg">
            <CardHeader className="text-center">
                 <div className="flex justify-center mb-4">
                    <Logo />
                </div>
                <CardTitle className="text-2xl font-bold text-destructive">Super Admin Access</CardTitle>
                <CardDescription>Secure Restricted Area</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleSuperAdminLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Super Admin ID</Label>
                        <Input 
                            id="email" 
                            type="text" 
                            placeholder="Enter Super Admin ID" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Security Code</Label>
                        <Input 
                            id="password" 
                            type="password" 
                            placeholder="Enter Security Code"
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button type="submit" size="lg" variant="destructive" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 animate-spin" /> : <UserCog className="mr-2" />}
                        {isPending ? 'Verifying Access...' : 'Access Super Admin Console'}
                    </Button>
                </form>
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
