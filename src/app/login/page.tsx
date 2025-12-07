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
import { Shield, User, Loader2, Lock, ArrowRight, Activity, MapPin, Eye, EyeOff } from "lucide-react";
import { useAuth, initiateEmailSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth'; // Import Reset Function
import Image from 'next/image';

export default function LoginPage() {
    const router = useRouter();
    const auth = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false); // Toggle State

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;

        startTransition(async () => {
            try {
                await initiateEmailSignIn(auth, email, password);
                
                const user = auth.currentUser;
                if (user) {
                    const tokenResult = await user.getIdTokenResult(true);
                    const role = tokenResult.claims.role;

                    if (role === 'super_admin') {
                        await auth.signOut();
                        toast({
                            variant: "destructive",
                            title: "Security Alert",
                            description: "Super Admins are forbidden on this public node. Use the secure channel."
                        });
                        return;
                    }

                    const ALLOWED_ROLES = ['captain', 'admin', 'official', 'staff'];
                    if (!ALLOWED_ROLES.includes(role as string)) {
                         await auth.signOut();
                         toast({
                             variant: "destructive",
                             title: "Access Denied",
                             description: "This portal is for Barangay Officials only. Residents should use the Resident App."
                         });
                         return;
                    }

                    router.push('/dashboard');
                }
            } catch (error: any) {
                console.error(error);
                let message = error.message;
                
                if (error.code === 'auth/user-disabled') {
                    message = "This account has been deactivated. Please contact your administrator.";
                } else if (error.code === 'auth/invalid-credential') {
                    message = "Incorrect email or password. Please try again.";
                }

                toast({
                    variant: "destructive",
                    title: "Authentication Failed",
                    description: message
                });
            }
        });
    };

    // Forgot Password Logic
    const handleForgotPassword = async () => {
        if (!auth) return;
        if (!email) {
            toast({
                variant: "destructive",
                title: "Email Required",
                description: "Please enter your official email address first so we can send the reset link."
            });
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            toast({
                title: "Reset Link Sent",
                description: `A password reset link has been sent to ${email}. Check your inbox (and spam folder).`
            });
        } catch (error: any) {
            console.error(error);
            let msg = "Failed to send reset email.";
            if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
            toast({
                variant: "destructive",
                title: "Request Failed",
                description: msg
            });
        }
    };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
        {/* LEFT COLUMN: VISUALS */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-black">
             {/* Background Effects */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.03),_transparent_40%)]" />
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[128px] -translate-y-1/2 translate-x-1/2 opacity-50" />
             <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[128px] translate-y-1/3 -translate-x-1/4 opacity-40" />

             {/* Content */}
             <div className="relative z-10 space-y-6 mt-20">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-white/70">
                    <Activity className="w-3 h-3 text-green-400" />
                    <span>System Status: Operational</span>
                 </div>
                 
                 <h1 className="text-6xl font-bold tracking-tight leading-tight">
                    Secure <br /> 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Governance</span> <br />
                    Platform
                 </h1>
                 
                 <p className="text-white/50 max-w-md text-lg leading-relaxed">
                    The next-generation operating system for Local Government Units. Monitor demographics, manage assets, and respond to emergencies in real-time.
                 </p>
             </div>

             <div className="relative z-10 grid grid-cols-2 gap-6 mt-12 mb-12">
                 <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <MapPin className="w-8 h-8 text-orange-500 mb-4" />
                    <div className="text-2xl font-bold mb-1">42k+</div>
                    <div className="text-sm text-white/40">Households Mapped</div>
                 </div>
                 <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <Shield className="w-8 h-8 text-blue-500 mb-4" />
                    <div className="text-2xl font-bold mb-1">99.9%</div>
                    <div className="text-sm text-white/40">Uptime & Security</div>
                 </div>
             </div>

             <div className="relative z-10 text-xs text-white/30 flex justify-between items-end">
                 <div>
                    <p>© 2024 KlaroGov Systems.</p>
                    <p>Powered by Lithium Tech.</p>
                 </div>
                 <div className="opacity-50">
                    v2.4.0-stable
                 </div>
             </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative bg-[#0f0f0f]">
             {/* Mobile/Tablet Background Gradient */}
             <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent lg:hidden pointer-events-none" />

             <Card className="w-full max-w-[420px] bg-black/40 border-white/10 backdrop-blur-md shadow-2xl text-white">
                <CardHeader className="space-y-4 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 relative">
                             <Image 
                                src="/KlaroGov Logo.png" 
                                alt="Logo" 
                                fill 
                                className="object-contain"
                            />
                        </div>
                        <span className="font-bold text-xl tracking-tight">KlaroGov</span>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Official Access</CardTitle>
                        <CardDescription className="text-white/40 mt-1">
                            Enter your credentials to access the command center.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-medium text-white/60 uppercase tracking-wider">Official Email</Label>
                            <div className="relative group">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="captain@barangay.gov.ph" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-11 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="password" className="text-xs font-medium text-white/60 uppercase tracking-wider">Password</Label>
                                <button 
                                    type="button" 
                                    onClick={handleForgotPassword}
                                    className="text-xs text-orange-500 hover:text-orange-400 hover:underline focus:outline-none"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    required 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-11 transition-all font-sans tracking-widest"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-white/30 hover:text-white/70 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        
                        <Button 
                            type="submit" 
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold h-11 mt-4 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_25px_rgba(234,88,12,0.5)] border-0" 
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Access Dashboard"}
                            {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0f0f0f] px-2 text-white/30">
                                Protected System
                            </span>
                        </div>
                    </div>

                    <div className="text-center text-[10px] text-white/30 leading-relaxed px-4">
                        Unauthorized access is monitored and logged. By logging in, you agree to the <a href="#" className="underline hover:text-white/60">Acceptable Use Policy</a>.
                    </div>

                </CardContent>
             </Card>
        </div>
    </div>
  );
}
