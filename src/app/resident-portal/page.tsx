'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2, ArrowRight, Smartphone, ShieldCheck, Phone, CheckCircle2, Lock, Eye, EyeOff, User, Mail, QrCode, Home } from "lucide-react";
import { useAuth, initiateEmailSignIn, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

export default function ResidentLoginPage() {
    const router = useRouter();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // Auth Mode State
    const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
    const [isPending, startTransition] = React.useTransition();

    // Phone Auth States
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Email Auth States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // Sign Up States
    const [fullName, setFullName] = useState('');

    // Initialize Recaptcha
    useEffect(() => {
        if (!auth || authMethod !== 'phone') return;
        
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {},
                'expired-callback': () => {
                     toast({ variant: "destructive", title: "Session Expired", description: "Please refresh and try again." });
                }
            });
        }
    }, [auth, authMethod, toast]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !phoneNumber) return;
        
        startTransition(async () => {
            try {
                let formattedPhone = phoneNumber;
                if (formattedPhone.startsWith('09')) {
                    formattedPhone = '+63' + formattedPhone.substring(1);
                } else if (formattedPhone.startsWith('9')) {
                    formattedPhone = '+63' + formattedPhone;
                }

                const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
                setConfirmationResult(confirmation);
                setStep('otp');
                toast({ title: "OTP Sent", description: "Check your mobile for the verification code." });
            } catch (error: any) {
                console.error(error);
                toast({ 
                    variant: "destructive", 
                    title: "Failed to send OTP", 
                    description: error.code === 'auth/invalid-phone-number' ? "Invalid phone number format." : error.message 
                });
                if (window.recaptchaVerifier) {
                    window.recaptchaVerifier.render().then(widgetId => {
                        window.recaptchaVerifier.reset(widgetId);
                    });
                }
            }
        });
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmationResult || !auth || !firestore) return;

        startTransition(async () => {
            try {
                const result = await confirmationResult.confirm(otp);
                await checkUserAndRedirect(result.user);
            } catch (error: any) {
                console.error(error);
                toast({ 
                    variant: "destructive", 
                    title: "Invalid Code", 
                    description: "The verification code is incorrect or expired." 
                });
            }
        });
    };

    const handleEmailLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;

        startTransition(async () => {
            try {
                await initiateEmailSignIn(auth, email, password);
                if (auth.currentUser) {
                    await checkUserAndRedirect(auth.currentUser);
                }
            } catch (error: any) {
                console.error(error);
                let message = error.message;
                if (error.code === 'auth/user-disabled') message = "Account deactivated.";
                if (error.code === 'auth/invalid-credential') message = "Incorrect email or password.";
                
                toast({
                    variant: "destructive",
                    title: "Login Failed",
                    description: message
                });
            }
        });
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !firestore) return;

        startTransition(async () => {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await updateProfile(user, { displayName: fullName });

                // Create minimal user doc
                await setDoc(doc(firestore, 'users', user.uid), {
                    email: user.email,
                    displayName: fullName,
                    kycStatus: 'unverified',
                    createdAt: new Date(),
                    role: 'resident'
                });

                // Redirect to Onboarding
                router.push('/verify-identity');

            } catch (error: any) {
                console.error(error);
                toast({
                    variant: "destructive",
                    title: "Registration Failed",
                    description: error.message
                });
            }
        });
    };

    const checkUserAndRedirect = async (user: any) => {
        if (!firestore) return;
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.kycStatus === 'verified' || userData.kycStatus === 'pending') {
                router.push('/resident/dashboard');
            } else {
                router.push('/verify-identity');
            }
        } else {
            // If logged in via phone but no doc exists yet
            router.push('/verify-identity');
        }
    };

    return (
        <div className="flex min-h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
            {/* LEFT COLUMN: VISUALS */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-black">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.03),_transparent_40%)]" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[128px] -translate-y-1/2 translate-x-1/2 opacity-50" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[128px] translate-y-1/3 -translate-x-1/4 opacity-40" />

                <div className="relative z-10 space-y-6 mt-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-white/70">
                        <Smartphone className="w-3 h-3 text-orange-400" />
                        <span>KlaroGov Mobile Connect</span>
                    </div>
                    
                    <h1 className="text-6xl font-bold tracking-tight leading-tight">
                        Your Barangay <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Digital Portal</span>
                    </h1>
                    
                    <p className="text-white/50 max-w-md text-lg leading-relaxed">
                        Skip the lines. Request certificates, report incidents, and stay updated with your local community—all from your device.
                    </p>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-6 mt-12 mb-12">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                        <QrCode className="w-8 h-8 text-orange-500 mb-4" />
                        <div className="text-2xl font-bold mb-1">Instant</div>
                        <div className="text-sm text-white/40">Digital ID Verification</div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                        <Home className="w-8 h-8 text-blue-500 mb-4" />
                        <div className="text-2xl font-bold mb-1">24/7</div>
                        <div className="text-sm text-white/40">Remote Assistance</div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-white/30 flex justify-between items-end">
                    <div>
                        <p>© 2024 KlaroGov Systems.</p>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: FORM */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative bg-[#0f0f0f]">
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
                            <CardTitle className="text-2xl font-bold tracking-tight">Resident Access</CardTitle>
                            <CardDescription className="text-white/40 mt-1">
                                Secure login for Barangay Residents.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2">
                        
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-transparent mb-6 h-10 border-b border-white/10">
                                <TabsTrigger 
                                    value="login" 
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none pb-2 text-white/50"
                                >
                                    Log In
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="signup" 
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none pb-2 text-white/50"
                                >
                                    Sign Up
                                </TabsTrigger>
                            </TabsList>

                            {/* LOGIN TAB */}
                            <TabsContent value="login">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => setAuthMethod('phone')}
                                            className={`border-white/10 hover:bg-white/5 ${authMethod === 'phone' ? 'bg-white/10 border-orange-500/50 text-orange-500' : 'text-white/50'}`}
                                        >
                                            <Phone className="w-4 h-4 mr-2" />
                                            Mobile
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => setAuthMethod('email')}
                                            className={`border-white/10 hover:bg-white/5 ${authMethod === 'email' ? 'bg-white/10 border-orange-500/50 text-orange-500' : 'text-white/50'}`}
                                        >
                                            <Mail className="w-4 h-4 mr-2" />
                                            Email
                                        </Button>
                                    </div>

                                    {authMethod === 'phone' ? (
                                        // PHONE AUTH FORM
                                        step === 'phone' ? (
                                            <form onSubmit={handleSendOtp} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="phone" className="text-xs font-medium text-white/60 uppercase tracking-wider">Mobile Number</Label>
                                                    <div className="relative group">
                                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                                        <Input 
                                                            id="phone" 
                                                            type="tel" 
                                                            placeholder="+63 917 123 4567" 
                                                            required 
                                                            value={phoneNumber}
                                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-11 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div id="recaptcha-container"></div>
                                                <Button 
                                                    type="submit" 
                                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold h-11 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0" 
                                                    disabled={isPending}
                                                >
                                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Code"}
                                                </Button>
                                            </form>
                                        ) : (
                                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="otp" className="text-xs font-medium text-white/60 uppercase tracking-wider">Verification Code</Label>
                                                    <div className="relative group">
                                                        <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                                        <Input 
                                                            id="otp" 
                                                            type="text" 
                                                            placeholder="123456" 
                                                            required 
                                                            value={otp}
                                                            onChange={(e) => setOtp(e.target.value)}
                                                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-11 transition-all tracking-widest text-lg"
                                                        />
                                                    </div>
                                                </div>
                                                <Button 
                                                    type="submit" 
                                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold h-11 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] border-0" 
                                                    disabled={isPending}
                                                >
                                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Login"}
                                                </Button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setStep('phone')} 
                                                    className="w-full text-center text-xs text-white/40 hover:text-white mt-2"
                                                >
                                                    Change Number
                                                </button>
                                            </form>
                                        )
                                    ) : (
                                        // EMAIL LOGIN FORM
                                        <form onSubmit={handleEmailLogin} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-xs font-medium text-white/60 uppercase tracking-wider">Email Address</Label>
                                                <div className="relative group">
                                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                                    <Input 
                                                        id="email" 
                                                        type="email" 
                                                        placeholder="juan@example.com" 
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
                                                    <button type="button" className="text-xs text-orange-500 hover:text-orange-400 hover:underline">Forgot?</button>
                                                </div>
                                                <div className="relative group">
                                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                                    <Input 
                                                        id="password" 
                                                        type={showPassword ? "text" : "password"} 
                                                        required 
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-11 transition-all"
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
                                                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold h-11 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0" 
                                                disabled={isPending}
                                            >
                                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Access Portal"}
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            </TabsContent>

                            {/* SIGNUP TAB */}
                            <TabsContent value="signup">
                                <form onSubmit={handleSignUp} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullname" className="text-xs font-medium text-white/60 uppercase tracking-wider">Full Name</Label>
                                        <div className="relative group">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                            <Input 
                                                id="fullname" 
                                                placeholder="Juan Dela Cruz" 
                                                required 
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-11 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="su-email" className="text-xs font-medium text-white/60 uppercase tracking-wider">Email Address</Label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                            <Input 
                                                id="su-email" 
                                                type="email" 
                                                placeholder="juan@example.com" 
                                                required 
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-11 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="su-pass" className="text-xs font-medium text-white/60 uppercase tracking-wider">Create Password</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/30 group-focus-within:text-orange-500 transition-colors" />
                                            <Input 
                                                id="su-pass" 
                                                type="password" 
                                                required 
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 h-11 transition-all"
                                            />
                                        </div>
                                        <p className="text-[10px] text-white/30 mt-1">Must be at least 6 characters long.</p>
                                    </div>

                                    <Button 
                                        type="submit" 
                                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold h-11 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0" 
                                        disabled={isPending}
                                    >
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>

                        <div className="relative py-4 mt-2">
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
                            Are you a Barangay Official? <a href="/login" className="underline hover:text-white/60">Log in here</a>.
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
