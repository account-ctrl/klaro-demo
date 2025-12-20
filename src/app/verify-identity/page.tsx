'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useFirebaseApp } from '@/firebase'; 
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import Webcam from 'react-webcam';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, CheckCircle, MapPin, Upload, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";

// Import Geo Data
import provincesData from '@/lib/data/provinces.json';
import citiesData from '@/lib/data/cities-municipalities.json';

// --- STEPS ---
// 1. Tenant Selection (Province -> City -> Barangay)
// 2. Personal Info (DOB, MMN)
// 3. Geolocation
// 4. ID Upload
// 5. Selfie (Liveness)

export default function VerificationWizard() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore(); // Use hook
  const firebaseApp = useFirebaseApp(); // Use hook
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Location Data State
  const [tenants, setTenants] = useState<{id: string, name: string, province: string, city: string, center: {lat: number, lng: number}}[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedCityCode, setSelectedCityCode] = useState('');
  
  const [filteredCities, setFilteredCities] = useState<any[]>([]);
  const [filteredBarangays, setFilteredBarangays] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    tenantId: '',
    birthDate: '',
    mothersMaidenName: '',
    latitude: null as number | null,
    longitude: null as number | null,
    distanceKm: 0,
    idImage: null as string | null, // base64
    selfieImage: null as string | null // base64
  });

  const webcamRef = useRef<Webcam>(null);

  // Load Tenants on Mount
  useEffect(() => {
    if (!firestore) return;

    const fetchTenants = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'tenants'));
        const list = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                name: data.name || "Unknown Barangay",
                province: data.province || "", 
                city: data.city || "",
                center: data.centerCoordinates || { lat: 14.5995, lng: 120.9842 }
            };
        });
        setTenants(list);
      } catch (err) {
        console.error("Error fetching tenants:", err);
      }
    };
    fetchTenants();
  }, [firestore]);

  // Handle Province Change
  const handleProvinceChange = (code: string) => {
    setSelectedProvinceCode(code);
    setSelectedCityCode(''); // Reset city
    setFormData(prev => ({ ...prev, tenantId: '' })); // Reset barangay
    
    // Filter Cities
    const cities = citiesData.filter(c => c.provinceCode === code);
    setFilteredCities(cities.sort((a, b) => a.name.localeCompare(b.name)));
    setFilteredBarangays([]);
  };

  // Handle City Change
  const handleCityChange = (code: string) => {
    setSelectedCityCode(code);
    setFormData(prev => ({ ...prev, tenantId: '' })); // Reset barangay

    // Find City Name & Province Name to match with Tenant Data
    const cityObj = citiesData.find(c => c.code === code);
    const provObj = provincesData.find(p => p.code === selectedProvinceCode);

    if (cityObj && provObj) {
        // Filter Tenants (Barangays)
        // We match loosely on name because tenant data might be slightly different string format
        // Ideally tenant data should store codes, but for now we fallback to name matching or list all if fuzzy
        const matches = tenants.filter(t => 
            (t.city.toLowerCase() === cityObj.name.toLowerCase() || t.city.includes(cityObj.name) || cityObj.name.includes(t.city)) &&
            (t.province.toLowerCase() === provObj.name.toLowerCase() || t.province.includes(provObj.name))
        );
        setFilteredBarangays(matches);
    } else {
        setFilteredBarangays([]);
    }
  };

  const handleTenantSelect = (val: string) => {
    setFormData(prev => ({ ...prev, tenantId: val }));
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  // --- STEP 3: Geolocation ---
  const handleGeolocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
        toast({ variant: "destructive", title: "Error", description: "Geolocation not supported." });
        setLoading(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Calculate Distance (Haversine)
            const selectedTenant = tenants.find(t => t.id === formData.tenantId);
            let dist = 0;
            if (selectedTenant) {
                dist = calculateDistance(lat, lng, selectedTenant.center.lat, selectedTenant.center.lng);
            }

            setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                distanceKm: dist
            }));
            setLoading(false);
            toast({ title: "Location Captured", description: `You are ${dist.toFixed(2)}km from the Barangay Hall.` });
        },
        (err) => {
            setLoading(false);
            toast({ variant: "destructive", title: "Location Error", description: err.message });
        }
    );
  };

  // --- STEP 4: ID Upload ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, idImage: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  // --- STEP 5: Selfie ---
  const captureSelfie = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
        setFormData(prev => ({ ...prev, selfieImage: imageSrc }));
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (!user || !firebaseApp) return;
    setLoading(true);

    try {
        const functions = getFunctions(firebaseApp);
        const verifyFn = httpsCallable(functions, 'verifyResidentIdentity');
        
        const result = await verifyFn({
            uid: user.uid,
            tenantId: formData.tenantId,
            birthDate: formData.birthDate,
            mothersMaidenName: formData.mothersMaidenName,
            location: {
                lat: formData.latitude,
                lng: formData.longitude,
                distance: formData.distanceKm
            },
            idImage: formData.idImage, // Base64
            selfieImage: formData.selfieImage // Base64
        });

        const data = result.data as any;

        if (data.status === 'verified') {
            toast({ title: "Success!", description: "Identity Verified. Redirecting..." });
            router.push('/resident/dashboard');
        } else {
            toast({ variant: "destructive", title: "Verification Pending", description: "Manual review required." });
        }

    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
        setLoading(false);
    }
  };

  // --- HELPER: Haversine ---
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="bg-slate-900 text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-green-400" />
            <CardTitle>Identity Verification</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Step {step} of 5: {
                step === 1 ? "Select Barangay" :
                step === 2 ? "Security Questions" :
                step === 3 ? "Location Check" :
                step === 4 ? "Upload ID" : "Live Selfie"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 min-h-[400px]">
            
            {/* STEP 1: TENANT */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Province</Label>
                        <Select onValueChange={handleProvinceChange} value={selectedProvinceCode}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Province" />
                            </SelectTrigger>
                            <SelectContent>
                                {provincesData.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                                    <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>City / Municipality</Label>
                        <Select onValueChange={handleCityChange} value={selectedCityCode} disabled={!selectedProvinceCode}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select City/Municipality" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCities.map(c => (
                                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Barangay</Label>
                        <Select onValueChange={handleTenantSelect} value={formData.tenantId} disabled={!selectedCityCode}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Barangay" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredBarangays.length > 0 ? (
                                    filteredBarangays.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-slate-500 text-center">
                                        No registered barangays found in this area.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                        We will cross-reference your data with this Barangay's Master List.
                    </div>
                </div>
            )}

            {/* STEP 2: BIO DATA */}
            {step === 2 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Mother's Maiden Name</Label>
                        <Input 
                            placeholder="Full Maiden Name" 
                            value={formData.mothersMaidenName} 
                            onChange={e => setFormData({...formData, mothersMaidenName: e.target.value})} 
                        />
                        <p className="text-xs text-slate-500">Used for deep verification against civil records.</p>
                    </div>
                </div>
            )}

            {/* STEP 3: GEOLOCATION */}
            {step === 3 && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 pt-10">
                    <div className="p-4 bg-blue-50 rounded-full">
                        <MapPin className="h-12 w-12 text-blue-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-lg">Verify Location</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            We need to check if you are physically present within or near the Barangay vicinity.
                        </p>
                    </div>
                    
                    {formData.latitude ? (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                            <CheckCircle size={20} />
                            <span>Location Captured ({formData.distanceKm.toFixed(2)}km away)</span>
                        </div>
                    ) : (
                        <Button onClick={handleGeolocation} disabled={loading} variant="outline" className="gap-2">
                            {loading && <Loader2 className="animate-spin" />}
                            Allow Location Access
                        </Button>
                    )}
                </div>
            )}

            {/* STEP 4: ID UPLOAD */}
            {step === 4 && (
                <div className="space-y-6">
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                         <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileUpload} 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                         {formData.idImage ? (
                             <img src={formData.idImage} alt="ID Preview" className="h-48 object-contain" />
                         ) : (
                             <>
                                <Upload className="h-10 w-10 text-slate-400 mb-2" />
                                <span className="text-slate-500 font-medium">Click to Upload Government ID</span>
                                <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                             </>
                         )}
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                        <p className="text-sm text-yellow-800">
                            Ensure the text on the ID is clear and readable. Blurry images will be rejected by the AI.
                        </p>
                    </div>
                </div>
            )}

            {/* STEP 5: SELFIE */}
            {step === 5 && (
                <div className="flex flex-col items-center space-y-4">
                     {formData.selfieImage ? (
                         <div className="relative">
                            <img src={formData.selfieImage} alt="Selfie" className="rounded-xl border-4 border-green-500" />
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="absolute bottom-4 right-4"
                                onClick={() => setFormData(prev => ({ ...prev, selfieImage: null }))}
                            >
                                Retake
                            </Button>
                         </div>
                     ) : (
                         <div className="overflow-hidden rounded-xl border-4 border-slate-200">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                width={400}
                                videoConstraints={{ facingMode: "user" }}
                            />
                         </div>
                     )}
                     
                     {!formData.selfieImage && (
                         <Button onClick={captureSelfie} className="gap-2" size="lg">
                             <Camera /> Capture Photo
                         </Button>
                     )}
                </div>
            )}

        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1 || loading}>
                Back
            </Button>
            
            {step < 5 ? (
                <Button onClick={nextStep} disabled={
                    (step === 1 && !formData.tenantId) ||
                    (step === 2 && (!formData.birthDate || !formData.mothersMaidenName)) ||
                    (step === 3 && !formData.latitude) ||
                    (step === 4 && !formData.idImage)
                }>
                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            ) : (
                <Button onClick={handleSubmit} disabled={loading || !formData.selfieImage} className="bg-green-600 hover:bg-green-500">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Verify Identity
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
