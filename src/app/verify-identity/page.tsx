'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useFirebaseApp } from '@/firebase'; 
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import Webcam from 'react-webcam';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, CheckCircle, MapPin, Upload, AlertTriangle, ShieldCheck, ArrowRight, Smartphone, KeyRound } from "lucide-react";

// Import Geo Data
import provincesData from '@/lib/data/provinces.json';
import citiesData from '@/lib/data/cities-municipalities.json';

// --- STEPS ---
// 1. Tenant Selection (Province -> City -> Barangay)
// 2. Personal Info (DOB, MMN)
// 3. Geolocation
// 4. ID Upload
// 5. Selfie (Liveness)
// 6. Phone Verification (OTP)

export default function VerificationWizard() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore(); 
  const firebaseApp = useFirebaseApp(); 
  const auth = firebaseApp ? getAuth(firebaseApp) : null;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  
  // Location Data State
  const [tenants, setTenants] = useState<{id: string, name: string, province: string, city: string, center: {lat: number, lng: number}}[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedCityCode, setSelectedCityCode] = useState('');
  
  const [filteredCities, setFilteredCities] = useState<any[]>([]);
  const [filteredBarangays, setFilteredBarangays] = useState<any[]>([]);

  // Phone Auth State
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    tenantId: '',
    birthDate: '',
    mothersMaidenName: '',
    latitude: null as number | null,
    longitude: null as number | null,
    distanceKm: 0,
    idImage: null as string | null, // base64
    selfieImage: null as string | null, // base64
    phoneNumber: ''
  });

  const webcamRef = useRef<Webcam>(null);

  // Initialize Recaptcha
  useEffect(() => {
    if (!auth) return;
    
    // Ensure the element exists before initializing
    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (recaptchaContainer && !window.recaptchaVerifier) {
        try {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
                'expired-callback': () => {
                    // Response expired. Ask user to solve reCAPTCHA again.
                }
            });
        } catch (e) {
            console.error("Recaptcha Init Error", e);
        }
    }
  }, [auth, step]); // Re-run if step changes to ensure container is mounted when needed

  // Load Tenants on Mount
  useEffect(() => {
    if (!firestore) return;

    const fetchTenants = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'tenant_directory'));
        const list = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                name: data.barangay || data.name || "Unknown Barangay", 
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

  // Load Saved Progress on Mount
  useEffect(() => {
    if (!user || !firestore) return;

    const loadProgress = async () => {
        setIsResuming(true);
        try {
            const userRef = doc(firestore, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.verificationDraft) {
                    const draft = data.verificationDraft;
                    
                    // Restore Step
                    if (draft.step) setStep(draft.step);
                    
                    // Restore Form Data
                    setFormData(prev => ({ ...prev, ...draft.formData }));
                    
                    // Restore Phone Verified Status (if stored securely, otherwise user must re-verify)
                    // For security, usually force re-verify if sensitive, but for draft we can persist state
                    if (draft.phoneVerified) setPhoneVerified(true);

                    // Restore Location Dropdowns
                    if (draft.selectedProvinceCode) {
                        setSelectedProvinceCode(draft.selectedProvinceCode);
                        const cities = citiesData.filter(c => c.provinceCode === draft.selectedProvinceCode);
                        setFilteredCities(cities.sort((a, b) => a.name.localeCompare(b.name)));
                    }
                    if (draft.selectedCityCode) {
                        setSelectedCityCode(draft.selectedCityCode);
                    }
                    
                    toast({ title: "Progress Restored", description: "Continuing from where you left off." });
                }
            }
        } catch (error) {
            console.error("Error loading progress:", error);
        } finally {
            setIsResuming(false);
        }
    };

    loadProgress();
  }, [user, firestore]);

  // Effect to re-filter barangays when tenants or selected codes change (important for restoration)
  useEffect(() => {
      if (selectedCityCode && selectedProvinceCode && tenants.length > 0) {
          const cityObj = citiesData.find(c => c.code === selectedCityCode);
          const provObj = provincesData.find(p => p.code === selectedProvinceCode);
  
          if (cityObj && provObj) {
              const sCity = cityObj.name.trim().toLowerCase();
              const sProv = provObj.name.trim().toLowerCase();
  
              const matches = tenants.filter(t => {
                  const tCity = (t.city || "").trim().toLowerCase();
                  const tProv = (t.province || "").trim().toLowerCase();
  
                  const provMatch = tProv === sProv || tProv.includes(sProv) || sProv.includes(tProv);
                  if (!provMatch) return false;
  
                  const cityMatch = tCity === sCity || tCity.includes(sCity) || sCity.includes(tCity);
                  return cityMatch;
              });
              
              setFilteredBarangays(matches.sort((a, b) => a.name.localeCompare(b.name)));
          }
      }
  }, [selectedCityCode, selectedProvinceCode, tenants]);


  // Helper to save progress
  const saveProgress = async (newStep: number, currentData: any, verified = false) => {
      if (!user || !firestore) return;
      try {
          const userRef = doc(firestore, 'users', user.uid);
          await setDoc(userRef, {
              verificationDraft: {
                  step: newStep,
                  formData: currentData,
                  selectedProvinceCode,
                  selectedCityCode,
                  phoneVerified: verified,
                  lastUpdated: new Date()
              }
          }, { merge: true });
      } catch (error) {
          console.error("Failed to save progress", error);
      }
  };

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
    // Filtering handled by Effect now
  };

  const handleTenantSelect = (val: string) => {
    setFormData(prev => ({ ...prev, tenantId: val }));
  };

  const nextStep = () => {
      const next = step + 1;
      setStep(next);
      saveProgress(next, formData, phoneVerified); 
  };

  const prevStep = () => {
      const prev = step - 1;
      setStep(prev);
      saveProgress(prev, formData, phoneVerified); 
  };

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
            
            const selectedTenant = tenants.find(t => t.id === formData.tenantId);
            let dist = 0;
            if (selectedTenant) {
                dist = calculateDistance(lat, lng, selectedTenant.center.lat, selectedTenant.center.lng);
            }

            setFormData(prev => {
                const newData = {
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    distanceKm: dist
                };
                saveProgress(step, newData, phoneVerified); 
                return newData;
            });
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
            const base64 = reader.result as string;
            setFormData(prev => {
                const newData = { ...prev, idImage: base64 };
                saveProgress(step, newData, phoneVerified); 
                return newData;
            });
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

  // --- STEP 6: Phone Verification ---
  const sendOtp = async () => {
      if (!formData.phoneNumber || !auth) {
          toast({ variant: "destructive", title: "Error", description: "Please enter a valid phone number." });
          return;
      }
      setLoading(true);
      try {
          // Format phone: ensure it starts with +63
          let phone = formData.phoneNumber.replace(/^0+/, '');
          if (!phone.startsWith('+63')) {
              phone = `+63${phone}`;
          }

          const appVerifier = window.recaptchaVerifier;
          const result = await signInWithPhoneNumber(auth, phone, appVerifier);
          setConfirmationResult(result);
          toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
      } catch (error: any) {
          console.error("SMS Error:", error);
          toast({ variant: "destructive", title: "Failed to send OTP", description: error.message });
          // Reset recaptcha if error
          if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = undefined;
          }
      } finally {
          setLoading(false);
      }
  };

  const verifyOtp = async () => {
      if (!confirmationResult || !otpCode) return;
      setLoading(true);
      try {
          const result = await confirmationResult.confirm(otpCode);
          if (result.user) {
              setPhoneVerified(true);
              toast({ title: "Phone Verified", description: "You can now proceed." });
              saveProgress(step, formData, true); // Save verified state
          }
      } catch (error: any) {
          console.error("Verify Error:", error);
          toast({ variant: "destructive", title: "Invalid Code", description: "Please try again." });
      } finally {
          setLoading(false);
      }
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    try {
        const token = await user.getIdToken();
        const res = await fetch('/api/resident/verify-identity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                tenantId: formData.tenantId,
                birthDate: formData.birthDate,
                mothersMaidenName: formData.mothersMaidenName,
                location: {
                    lat: formData.latitude,
                    lng: formData.longitude,
                    distance: formData.distanceKm
                },
                idImage: formData.idImage,
                selfieImage: formData.selfieImage,
                phoneNumber: formData.phoneNumber // Include phone in profile update
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || errorData.reason || 'Submission failed');
        }

        const data = await res.json();

        // Clear Draft on Success
        if (firestore && user) {
            const userRef = doc(firestore, 'users', user.uid);
            await setDoc(userRef, { verificationDraft: null }, { merge: true });
        }

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

  if (isResuming) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <p className="text-slate-500">Restoring your progress...</p>
              </div>
          </div>
      );
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
            Step {step} of 6: {
                step === 1 ? "Select Barangay" :
                step === 2 ? "Security Questions" :
                step === 3 ? "Location Check" :
                step === 4 ? "Upload ID" :
                step === 5 ? "Live Selfie" : "Phone Verification"
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

            {/* STEP 6: PHONE VERIFICATION */}
            {step === 6 && (
                <div className="space-y-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-purple-50 rounded-full">
                            <Smartphone className="h-12 w-12 text-purple-600" />
                        </div>
                    </div>
                    
                    {!confirmationResult ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Mobile Number</Label>
                                <div className="flex gap-2">
                                    <div className="flex items-center px-3 border rounded-md bg-slate-50 text-slate-500">
                                        🇵🇭 +63
                                    </div>
                                    <Input 
                                        placeholder="917 123 4567" 
                                        value={formData.phoneNumber} 
                                        onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
                                        className="flex-1"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">We will send a 6-digit code to verify this number.</p>
                            </div>
                            <Button onClick={sendOtp} disabled={loading || !formData.phoneNumber} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Code
                            </Button>
                            {/* Hidden Recaptcha Container */}
                            <div id="recaptcha-container"></div>
                        </div>
                    ) : !phoneVerified ? (
                        <div className="space-y-4">
                            <div className="space-y-2 text-center">
                                <Label>Enter Verification Code</Label>
                                <Input 
                                    className="text-center text-2xl tracking-widest" 
                                    maxLength={6} 
                                    placeholder="000000"
                                    value={otpCode}
                                    onChange={e => setOtpCode(e.target.value)}
                                />
                                <p className="text-xs text-slate-500 cursor-pointer hover:text-purple-600" onClick={() => setConfirmationResult(null)}>
                                    Wrong number? Change it.
                                </p>
                            </div>
                            <Button onClick={verifyOtp} disabled={loading || otpCode.length !== 6} className="w-full bg-purple-600 hover:bg-purple-700">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify OTP
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 p-6 bg-green-50 text-green-700 rounded-lg border border-green-200">
                            <CheckCircle className="h-12 w-12" />
                            <h3 className="font-semibold text-lg">Phone Verified!</h3>
                            <p className="text-sm">Your number {formData.phoneNumber} has been confirmed.</p>
                        </div>
                    )}
                </div>
            )}

        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1 || loading}>
                Back
            </Button>
            
            {step < 6 ? (
                <Button onClick={nextStep} disabled={
                    (step === 1 && !formData.tenantId) ||
                    (step === 2 && (!formData.birthDate || !formData.mothersMaidenName)) ||
                    (step === 3 && !formData.latitude) ||
                    (step === 4 && !formData.idImage) ||
                    (step === 5 && !formData.selfieImage)
                }>
                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            ) : (
                <Button onClick={handleSubmit} disabled={loading || !phoneVerified} className="bg-green-600 hover:bg-green-500">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Complete Verification
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
