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
import { Loader2, ArrowRight, Smartphone, ShieldCheck, Phone, CheckCircle2 } from "lucide-react";
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'; 
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';

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
    
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Initialize Recaptcha
    useEffect(() => {
        if (!auth) return;
        
        // Ensure we don't re-init
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
                'expired-callback': () => {
                     toast({ variant: "destructive", title: "Session Expired", description: "Please refresh and try again." });
                }
            });
        }
    }, [auth, toast]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !phoneNumber) return;
        
        setIsPending(true);
        try {
            // Format phone number if needed (assuming PH +63 for this context or simplified)
            // For now, assume user types full international or we prepend +63 if starts with 9
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
            // Reset recaptcha on error
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().then(widgetId => {
                    window.recaptchaVerifier.reset(widgetId);
                });
            }
        } finally {
            setIsPending(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmationResult || !auth || !firestore) return;

        setIsPending(true);
        try {
            const result = await confirmationResult.confirm(otp);
            const user = result.user;

            // Check if user exists in Firestore and has a tenant
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.kycStatus === 'verified' || userData.kycStatus === 'pending') {
                    // Existing user
                    router.push('/resident/dashboard');
                } else {
                    // User exists but stuck in onboarding
                    router.push('/verify-identity');
                }
            } else {
                // New User -> Onboarding Wizard
                router.push('/verify-identity');
            }

        } catch (error: any) {
            console.error(error);
            toast({ 
                variant: "destructive", 
                title: "Invalid Code", 
                description: "The verification code is incorrect or expired." 
            });
        } finally {
            setIsPending(false);
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
                        <span>Mobile-First Access</span>
                    </div>
                    
                    <h1 className="text-6xl font-bold tracking-tight leading-tight">
                        Connect with <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Your Barangay</span>
                    </h1>
                    
                    <p className="text-white/50 max-w-md text-lg leading-relaxed">
                        Secure, instant access to local services using just your mobile number. No passwords to remember.
                    </p>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-6 mt-12 mb-12">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                        <ShieldCheck className="w-8 h-8 text-orange-500 mb-4" />
                        <div className="text-2xl font-bold mb-1">Secure</div>
                        <div className="text-sm text-white/40">Bank-Grade OTP Auth</div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                        <CheckCircle2 className="w-8 h-8 text-blue-500 mb-4" />
                        <div className="text-2xl font-bold mb-1">Easy</div>
                        <div className="text-sm text-white/40">Instant Verification</div>
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
                            <CardTitle className="text-2xl font-bold tracking-tight">Resident Portal</CardTitle>
                            <CardDescription className="text-white/40 mt-1">
                                {step === 'phone' ? 'Enter your mobile number to begin.' : 'Enter the code sent to your phone.'}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2">
                        
                        {step === 'phone' ? (
                            <form onSubmit={handleSendOtp} className="space-y-5">
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
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold h-11 mt-4 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0" 
                                    disabled={isPending}
                                >
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Verification Code"}
                                    {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-5">
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
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold h-11 mt-4 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] border-0" 
                                    disabled={isPending}
                                >
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Sign In"}
                                </Button>
                                <button 
                                    type="button" 
                                    onClick={() => setStep('phone')} 
                                    className="w-full text-center text-xs text-white/40 hover:text-white mt-2"
                                >
                                    Change Phone Number
                                </button>
                            </form>
                        )}

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
