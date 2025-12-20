'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, Upload, CheckCircle2, MapPin, User, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getProvinces, getCities, getBarangays } from '@/lib/data/psgc';

// Steps
const STEPS = [
    { id: 1, title: "Location", icon: MapPin },
    { id: 2, title: "Profile", icon: User },
    { id: 3, title: "Identity", icon: ShieldCheck },
    { id: 4, title: "Review", icon: FileText },
];

export default function VerifyIdentityPage() {
    const router = useRouter();
    const auth = useAuth();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedBarangay, setSelectedBarangay] = useState('');
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');
    const [mothersMaidenName, setMothersMaidenName] = useState('');

    const [idFile, setIdFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [idPreview, setIdPreview] = useState<string | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Data Loaders
    const provinces = getProvinces(); 
    const cities = selectedProvince ? getCities(selectedProvince) : [];
    const barangays = selectedCity ? getBarangays(selectedCity) : [];

    // --- HANDLERS ---

    const handleNext = () => {
        if (currentStep === 1) {
            if (!selectedProvince || !selectedCity || !selectedBarangay) {
                toast({ variant: "destructive", title: "Incomplete Address", description: "Please select your full address." });
                return;
            }
        }
        if (currentStep === 2) {
            if (!firstName || !lastName || !dob || !mothersMaidenName) {
                toast({ variant: "destructive", title: "Incomplete Profile", description: "All fields are required for verification." });
                return;
            }
        }
        if (currentStep === 3) {
            if (!idFile || !selfieFile) {
                toast({ variant: "destructive", title: "Missing Documents", description: "Please provide both ID and Selfie." });
                return;
            }
        }
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => setCurrentStep(prev => prev - 1);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'selfie') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'id') {
                    setIdFile(file);
                    setIdPreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error", err);
            toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera." });
            setIsCameraOpen(false);
        }
    };

    const captureSelfie = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, 640, 480);
                canvasRef.current.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                        setSelfieFile(file);
                        setSelfiePreview(URL.createObjectURL(blob));
                        
                        // Stop Stream
                        const stream = videoRef.current?.srcObject as MediaStream;
                        stream?.getTracks().forEach(track => track.stop());
                        setIsCameraOpen(false);
                    }
                }, 'image/jpeg');
            }
        }
    };

    const handleSubmit = async () => {
        if (!auth?.currentUser || !firestore || !storage) return;
        setIsSubmitting(true);

        try {
            const userId = auth.currentUser.uid;
            
            // 1. Upload Images
            const idRef = ref(storage, `verification/${userId}/id_card_${Date.now()}.jpg`);
            const selfieRef = ref(storage, `verification/${userId}/selfie_${Date.now()}.jpg`);
            
            await uploadBytes(idRef, idFile!);
            await uploadBytes(selfieRef, selfieFile!);
            
            const idUrl = await getDownloadURL(idRef);
            const selfieUrl = await getDownloadURL(selfieRef);

            // 2. Create User Profile & Verification Request
            // We construct the Tenant ID usually as `province-city-barangay` (slugified)
            const tenantId = `${selectedProvince}-${selectedCity}-${selectedBarangay}`.toLowerCase().replace(/ /g, '-'); 

            await updateDoc(doc(firestore, 'users', userId), {
                firstName,
                lastName,
                dob,
                mothersMaidenName,
                
                // Location Data (Critical for Routing)
                tenantId, 
                province: selectedProvince,
                city: selectedCity,
                barangay: selectedBarangay,

                kycStatus: 'pending', // Triggers "Verification in Progress" UI
                verificationData: {
                    idUrl,
                    selfieUrl,
                    submittedAt: new Date()
                }
            });

            toast({
                title: "Submission Received",
                description: "Your verification is being processed.",
            });
            
            router.push('/resident/dashboard');

        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error.message
            });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 font-sans">
            
            {/* Step Indicator */}
            <div className="w-full max-w-3xl mb-8">
                 <div className="flex justify-between items-center relative">
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/10 -z-10" />
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = step.id === currentStep;
                        const isCompleted = step.id < currentStep;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-[#0a0a0a] px-2">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                                    isActive ? "border-orange-500 bg-orange-500/10 text-orange-500" : 
                                    isCompleted ? "border-green-500 bg-green-500 text-black" : "border-white/20 text-white/30"
                                )}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <span className={cn("text-xs font-medium uppercase tracking-wider", isActive ? "text-orange-500" : "text-white/30")}>
                                    {step.title}
                                </span>
                            </div>
                        )
                    })}
                 </div>
            </div>

            <Card className="w-full max-w-xl bg-black/40 border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Identity Verification</CardTitle>
                    <CardDescription className="text-white/40">
                        To access Barangay services, we need to verify you are a resident.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* STEP 1: LOCATION */}
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <Label>Province</Label>
                                <Select onValueChange={setSelectedProvince} value={selectedProvince}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Select Province" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {provinces.map(p => <SelectItem key={p.code} value={p.name}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>City / Municipality</Label>
                                <Select onValueChange={setSelectedCity} value={selectedCity} disabled={!selectedProvince}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Barangay</Label>
                                <Select onValueChange={setSelectedBarangay} value={selectedBarangay} disabled={!selectedCity}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Select Barangay" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {barangays.map(b => <SelectItem key={b.code} value={b.name}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PROFILE */}
                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-white/5 border-white/10" placeholder="Juan" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input value={lastName} onChange={e => setLastName(e.target.value)} className="bg-white/5 border-white/10" placeholder="Dela Cruz" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                <Input type="date" value={dob} onChange={e => setDob(e.target.value)} className="bg-white/5 border-white/10 block w-full" />
                            </div>
                            <div className="space-y-2">
                                <Label>Mother's Maiden Name</Label>
                                <Input value={mothersMaidenName} onChange={e => setMothersMaidenName(e.target.value)} className="bg-white/5 border-white/10" placeholder="For security matching" />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: IDENTITY */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            
                            {/* ID Upload */}
                            <div className="space-y-2">
                                <Label>Government ID</Label>
                                <div className="border-2 border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden">
                                    {idPreview ? (
                                        <Image src={idPreview} alt="ID Preview" fill className="object-cover" />
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-white/30 mb-2" />
                                            <span className="text-xs text-white/40">Click to upload valid ID</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'id')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>

                            {/* Liveness / Selfie */}
                            <div className="space-y-2">
                                <Label>Live Selfie</Label>
                                <div className="border border-white/10 rounded-lg h-64 bg-black overflow-hidden relative flex items-center justify-center">
                                    {selfiePreview ? (
                                        <Image src={selfiePreview} alt="Selfie" fill className="object-cover" />
                                    ) : isCameraOpen ? (
                                        <>
                                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                            <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                                            <Button onClick={captureSelfie} size="icon" className="absolute bottom-4 rounded-full w-12 h-12 bg-white text-black hover:bg-white/90">
                                                <Camera className="w-5 h-5" />
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <Button onClick={startCamera} variant="outline" className="border-white/20 hover:bg-white/10">
                                                <Camera className="mr-2 w-4 h-4" /> Take Selfie
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-white/30">Ensure your face is well-lit and clearly visible.</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: REVIEW */}
                    {currentStep === 4 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 text-sm">
                            <div className="bg-white/5 p-4 rounded-lg space-y-3 border border-white/10">
                                <div className="flex justify-between">
                                    <span className="text-white/40">Location:</span>
                                    <span className="text-right">{selectedBarangay}, {selectedCity}, {selectedProvince}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/40">Name:</span>
                                    <span>{firstName} {lastName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/40">DOB:</span>
                                    <span>{dob}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/40">Documents:</span>
                                    <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Attached</span>
                                </div>
                            </div>
                            <p className="text-xs text-white/30 text-center">
                                By clicking submit, you consent to the processing of your personal data for Barangay verification purposes in accordance with the Data Privacy Act.
                            </p>
                        </div>
                    )}

                </CardContent>
                <CardFooter className="flex justify-between">
                    {currentStep > 1 ? (
                        <Button onClick={handleBack} variant="ghost" className="hover:bg-white/10 hover:text-white text-white/50">Back</Button>
                    ) : <div></div>}
                    
                    {currentStep < 4 ? (
                        <Button onClick={handleNext} className="bg-orange-600 hover:bg-orange-500 text-white">
                            Next Step <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-500 text-white w-full ml-4">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Verification"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
