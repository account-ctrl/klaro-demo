'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  TerminalSquare, 
  Upload, 
  MapPin, 
  Users, 
  Stamp,
  Server,
  ArrowRight,
  Check,
  FileBadge,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth, initiateEmailSignIn } from '@/firebase'; 
import { getProvinces, getRegionByProvince } from '@/lib/data/psgc';
import SuccessStep from '@/components/onboarding/SuccessStep';

const profileSchema = z.object({
  barangayName: z.string().min(3, "Barangay name is required."),
  city: z.string().min(3, "City/Municipality is required."),
  province: z.string().min(3, "Province is required."),
  region: z.string().optional(),
});
const officialsSchema = z.object({
  officials: z.array(z.object({
    name: z.string().min(2, "Name is required."),
    role: z.enum(['Captain', 'Secretary', 'Treasurer', 'Councilor']),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
  })).min(1, "Please add at least one official."),
});
type ProfileFormValues = z.infer<typeof profileSchema>;
type OfficialsFormValues = z.infer<typeof officialsSchema>;

const StepIndicator = ({ currentStep, steps }: { currentStep: number, steps: any[] }) => (
    <ol className="flex w-full items-center justify-between mb-8">
        {steps.map((step, index) => (
            <li key={step.id} className={cn("flex items-center", index < steps.length - 1 ? "w-full" : "")}>
                <div className="flex flex-col items-center relative">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 z-10", step.id < currentStep ? "bg-primary border-primary text-primary-foreground" : step.id === currentStep ? "bg-background border-primary text-primary shadow-lg ring-2 ring-primary/20" : "bg-muted border-muted-foreground/30 text-muted-foreground")}>
                        {step.id < currentStep ? <Check className="h-5 w-5" /> : step.icon}
                    </div>
                    <span className={cn("absolute -bottom-6 text-xs font-medium whitespace-nowrap transition-colors duration-300", step.id === currentStep ? "text-primary" : "text-muted-foreground")}>{step.title}</span>
                </div>
                {index < steps.length - 1 && (<div className={cn("h-[2px] w-full mx-2 transition-all duration-500", step.id < currentStep ? "bg-primary" : "bg-muted-foreground/20")}></div>)}
            </li>
        ))}
    </ol>
);

const TerminalView = ({ logs }: { logs: string[] }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="bg-black text-white font-mono p-6 rounded-lg shadow-2xl w-full max-w-2xl h-[400px] overflow-hidden flex flex-col border border-zinc-800 relative">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="w-3 h-3 rounded-full bg-green-500"></div></div>
                <div className="text-xs text-zinc-500">klaro-gov-cli v2.4.0</div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2" ref={scrollRef}>
                {logs.map((log, i) => (
                    <div key={i} className="break-words animate-in fade-in slide-in-from-left-2 duration-300 flex">
                        <span className="text-zinc-500 mr-2 shrink-0">root@klaro:~#</span>
                        <span className={cn(log.startsWith(">> ERROR:") ? "text-red-400" : log.startsWith(">> NOTICE:") ? "text-yellow-400" : log.startsWith(">> SUCCESS:") ? "text-green-400" : "text-zinc-300")}>{log}</span>
                    </div>
                ))}
                <div className="animate-pulse">_</div>
            </div>
        </div>
    );
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function OnboardingPageComponent() {
    const [currentStep, setCurrentStep] = useState(1);
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const auth = useAuth();
    
    const [showSuccess, setShowSuccess] = useState(false);
    const [provisionedTenantId, setProvisionedTenantId] = useState<string>('');
    const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
    const [officialsData, setOfficialsData] = useState<OfficialsFormValues | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isCertified, setIsCertified] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isCommissioning, setIsCommissioning] = useState(false);
    const [hasError, setHasError] = useState(false);
    
    const inviteToken = searchParams.get('token');

    useEffect(() => {
        if (!inviteToken) {
            toast({ title: "Invalid Link", description: "The onboarding link is missing an invitation token.", variant: "destructive", duration: 10000 });
        }
    }, [inviteToken, toast]);

    const steps = [
        { id: 1, title: 'Identity', icon: <MapPin className="h-4 w-4" /> },
        { id: 2, title: 'Custodians', icon: <Users className="h-4 w-4" /> },
        { id: 3, title: 'Digital Seal', icon: <Stamp className="h-4 w-4" /> },
        { id: 4, title: 'Review', icon: <ShieldCheck className="h-4 w-4" /> },
        { id: 5, title: 'Commission', icon: <Server className="h-4 w-4" /> },
    ];

    const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { barangayName: '', city: '', province: '', region: '' } });

    const determineRegion = (provinceName: string) => {
        const allProvinces = getProvinces();
        const matchedProvince = allProvinces.find(p => p.name.toLowerCase() === provinceName.toLowerCase());
        return matchedProvince ? getRegionByProvince(matchedProvince.code) : '';
    };

    useEffect(() => {
        const province = searchParams.get('province');
        const city = searchParams.get('city');
        const barangay = searchParams.get('barangay');
        const regionParam = searchParams.get('region');

        if (province && city && barangay) {
            const decodedProvince = decodeURIComponent(province);
            const decodedCity = decodeURIComponent(city);
            const decodedBarangay = decodeURIComponent(barangay);
            let determinedRegion = regionParam ? decodeURIComponent(regionParam) : determineRegion(decodedProvince);
            profileForm.reset({ province: decodedProvince, city: decodedCity, barangayName: decodedBarangay, region: determinedRegion });
        }
    }, [searchParams, profileForm]);

    const officialsForm = useForm<OfficialsFormValues>({ resolver: zodResolver(officialsSchema), defaultValues: { officials: [{ name: '', role: 'Captain', email: '', password: '' }] } });
    const { fields, append, remove } = useFieldArray({ control: officialsForm.control, name: "officials" });
    const handleProfileSubmit = (data: ProfileFormValues) => {
        if (!data.region) { data.region = determineRegion(data.province); profileForm.setValue('region', data.region); }
        setProfileData(data);
        setCurrentStep(2);
    };
    const handleOfficialsSubmit = (data: OfficialsFormValues) => { setOfficialsData(data); setCurrentStep(3); };
    const handleSealSubmit = () => setCurrentStep(4);

    const handleCommissionStart = async () => {
        if (!inviteToken || !isCertified || !profileData || !officialsData) {
            // Toast messages for these are handled by button disabled state or initial checks
            return;
        }

        setIsCommissioning(true);
        setHasError(false);
        setCurrentStep(5);
        
        const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

        try {
            addLog("Connecting to PSGC National Database..."); await delay(1000);
            addLog(`VERIFIED: ${profileData.region || 'Region Unknown'} - ${profileData.province} - ${profileData.city} - ${profileData.barangayName}`); await delay(500);
            addLog(`Allocating isolated storage in ${profileData.province} Region...`);

            const captain = officialsData.officials.find(o => o.role === 'Captain');
            const res = await fetch('/api/public/provision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    inviteToken, 
                    province: profileData.province, 
                    city: profileData.city, 
                    barangay: profileData.barangayName, 
                    region: profileData.region, 
                    adminProfile: captain ? { name: captain.name, email: captain.email, password: captain.password } : undefined,
                    officials: officialsData.officials // Pass all officials data
                })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Provisioning failed on server.');
            }
            
            if (res.status === 201 || res.status === 200) { // Check for Created or OK
                 if (data.tenantSlug) { setProvisionedTenantId(data.tenantSlug); }
                 addLog(">> SUCCESS: Vault Provisioned.");
            } else if (res.status === 202) { // Check for Accepted (re-linking)
                 addLog(">> NOTICE: Vault already exists. Re-linking.");
                 if (data.tenantSlug) setProvisionedTenantId(data.tenantSlug);
            }
            
            await delay(1200);

            addLog("Initializing Blotter & Health Record schemas..."); await delay(800);
            addLog("Generating unique encryption keys..."); await delay(1000);
            addLog("Setting up custodian access controls...");
            
            if (captain?.email && captain?.password && auth) {
                try {
                    await initiateEmailSignIn(auth, captain.email, captain.password);
                    addLog(">> SUCCESS: Client session established.");
                } catch (error: any) {
                    addLog(`>> NOTICE: Login failed (${error.code}). Please login manually.`);
                }
            }
            await delay(1200);

            addLog("Validating digital signatures..."); await delay(600);
            addLog("WRITING TO BLOCKCHAIN (Firestore Ledger)..."); await delay(1500);
            addLog("COMMISSIONING COMPLETE.");
            
            setTimeout(() => setShowSuccess(true), 1500);

        } catch (e: any) {
            console.error("Commissioning Error:", e);
            addLog(`>> ERROR: ${e.message}`);
            setHasError(true);
            setIsCommissioning(false);
        }
    };

    const handleRetry = () => {
        setLogs([]);
        handleCommissionStart();
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    if (!inviteToken) {
        return (<div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100"><Card className="bg-zinc-900/50 border-zinc-800 shadow-2xl max-w-md text-center"><CardHeader><div className="mx-auto bg-red-500/10 p-3 rounded-full w-fit"><AlertTriangle className="h-8 w-8 text-red-500" /></div><CardTitle className="text-2xl text-red-400">Invalid Onboarding Link</CardTitle></CardHeader><CardContent><p className="text-zinc-400">The invitation token is missing from the URL. This link is invalid or has expired. Please use the original, unmodified link from your invitation email to proceed.</p></CardContent><CardFooter><Button onClick={() => router.push('/login')} className="w-full">Return to Login</Button></CardFooter></Card></div>)
    }

    if (showSuccess && profileData && officialsData) {
        const captain = officialsData.officials.find(o => o.role === 'Captain');
        return (<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><SuccessStep tenantData={{ barangayName: profileData.barangayName, city: profileData.city, province: profileData.province, adminName: captain?.name || 'Admin', adminEmail: captain?.email || '', tenantId: provisionedTenantId || 'Pending-Activation' }} onComplete={() => router.push('/login')} /></div>);
    }
  
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100 font-sans selection:bg-primary selection:text-primary-foreground">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black z-0 pointer-events-none" />
        <div className="w-full max-w-3xl z-10 relative">
          <div className="mb-8 text-center space-y-2"><div className="flex justify-center mb-6"><Logo className="text-white" /></div>{currentStep < 5 && (<><h1 className="text-3xl font-bold tracking-tight text-white">Commission Your Node</h1><p className="text-zinc-400">Securely initialize your Local Government Unit's digital infrastructure.</p></>)}</div>
          {currentStep < 5 && <div className="mb-8"><StepIndicator currentStep={currentStep} steps={steps} /></div>}
          <Card className="bg-zinc-900/50 border-zinc-800 shadow-2xl backdrop-blur-sm">
            <CardContent className="p-8">
              {currentStep === 1 && (<Form {...profileForm}><form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500"><div className="space-y-4"><div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4"><h2 className="text-xl font-semibold flex items-center gap-2"><MapPin className="text-primary h-5 w-5" /> Node Location</h2><span className="text-xs uppercase tracking-wider text-green-500 font-mono bg-green-500/10 px-2 py-1 rounded">PSGC Linked</span></div><div className="grid gap-6"><FormField name="province" control={profileForm.control} render={({ field }) => (<FormItem><FormLabel className="text-zinc-300">Province</FormLabel><FormControl><div className="relative"><Input placeholder="Search Province..." {...field} className="bg-zinc-950/50 border-zinc-700 focus-visible:ring-primary pl-4" />{field.value.length > 3 && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />}</div></FormControl><FormMessage /></FormItem>)} /><FormField name="region" control={profileForm.control} render={({ field }) => (<FormItem className={field.value ? "" : "hidden"}><FormLabel className="text-zinc-300">Region</FormLabel><FormControl><div className="relative"><Input readOnly placeholder="Region Auto-Detected..." {...field} className="bg-zinc-900 border-zinc-800 text-zinc-500 focus-visible:ring-0 pl-4 cursor-not-allowed" /><CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" /></div></FormControl><FormMessage /></FormItem>)} /><FormField name="city" control={profileForm.control} render={({ field }) => (<FormItem><FormLabel className="text-zinc-300">City / Municipality</FormLabel><FormControl><div className="relative"><Input placeholder="Search City/Municipality..." {...field} className="bg-zinc-950/50 border-zinc-700 focus-visible:ring-primary pl-4" />{field.value.length > 3 && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />}</div></FormControl><FormMessage /></FormItem>)} /><FormField name="barangayName" control={profileForm.control} render={({ field }) => (<FormItem><FormLabel className="text-zinc-300">Barangay Name</FormLabel><FormControl><div className="relative"><Input placeholder="e.g. San Isidro" {...field} className="bg-zinc-950/50 border-zinc-700 focus-visible:ring-primary pl-4" />{field.value.length > 3 && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />}</div></FormControl><FormMessage /></FormItem>)} /></div></div><div className="pt-4"><Button type="submit" className="w-full h-12 text-base font-semibold shadow-primary/20 shadow-lg">Verify & Continue <ArrowRight className="ml-2 h-4 w-4" /></Button></div></form></Form>)}
              {currentStep === 2 && (<Form {...officialsForm}><form onSubmit={officialsForm.handleSubmit(handleOfficialsSubmit)} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500"><div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4"><h2 className="text-xl font-semibold flex items-center gap-2"><Users className="text-primary h-5 w-5" /> Authorized Custodians</h2></div><p className="text-sm text-zinc-400">List the key officials who will act as the primary administrators of this node.</p><div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">{fields.map((field, index) => (<Card key={field.id} className="bg-zinc-900 border-zinc-800"><CardContent className="p-4 flex gap-4 items-start"><div className="grid gap-4 flex-1"><FormField name={`officials.${index}.name`} control={officialsForm.control} render={({ field }) => (<FormItem><FormLabel className="text-xs text-zinc-500 uppercase">Official Name</FormLabel><FormControl><Input placeholder="Full Name" {...field} className="bg-zinc-950 border-zinc-700" /></FormControl><FormMessage /></FormItem>)} /><FormField name={`officials.${index}.role`} control={officialsForm.control} render={({ field }) => (<FormItem><FormLabel className="text-xs text-zinc-500 uppercase">Role / Designation</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue placeholder="Select Role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Captain">Punong Barangay (Captain)</SelectItem><SelectItem value="Secretary">Barangay Secretary</SelectItem><SelectItem value="Treasurer">Barangay Treasurer</SelectItem><SelectItem value="Councilor">Barangay Kagawad</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />{officialsForm.watch(`officials.${index}.role`) === 'Captain' && (<><FormField name={`officials.${index}.email`} control={officialsForm.control} render={({ field }) => (<FormItem><FormLabel className="text-xs text-zinc-500 uppercase">Email (For Login)</FormLabel><FormControl><Input placeholder="official@barangay.gov.ph" {...field} className="bg-zinc-950 border-zinc-700" /></FormControl><FormMessage /></FormItem>)} /><FormField name={`officials.${index}.password`} control={officialsForm.control} render={({ field }) => (<FormItem><FormLabel className="text-xs text-zinc-500 uppercase">Password</FormLabel><FormControl><Input type="password" placeholder="******" {...field} className="bg-zinc-950 border-zinc-700" /></FormControl><FormMessage /></FormItem>)} /></>)}</div><Button type="button" variant="ghost" size="icon" className="text-zinc-500 hover:text-red-400 mt-6" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button></CardContent></Card>))}</div><Button type="button" variant="outline" className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => append({ name: '', role: 'Councilor' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Official</Button><div className="flex gap-4 pt-4"><Button type="button" variant="ghost" onClick={() => setCurrentStep(1)} className="w-1/3">Back</Button><Button type="submit" className="w-2/3 h-12 shadow-primary/20 shadow-lg">Save Custodians <ArrowRight className="ml-2 h-4 w-4" /></Button></div></form></Form>)}
              {currentStep === 3 && (<div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8"><div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4"><h2 className="text-xl font-semibold flex items-center gap-2"><Stamp className="text-primary h-5 w-5" /> Digital Seal Generation</h2></div><div className="grid md:grid-cols-2 gap-8 items-center"><div className="space-y-6"><div className="bg-zinc-950/50 p-6 rounded-lg border border-zinc-800 text-center border-dashed"><Upload className="h-10 w-10 text-zinc-500 mx-auto mb-4" /><h3 className="text-sm font-medium text-zinc-300">Upload Official Logo</h3><p className="text-xs text-zinc-500 mb-4">PNG, JPG up to 5MB</p><Input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" /><label htmlFor="logo-upload"><Button variant="secondary" size="sm" className="pointer-events-none" asChild><span>Select File</span></Button></label></div><div className="text-xs text-zinc-500"><p>This logo will be used to generate a standardized high-resolution digital seal for official documents.</p></div></div><div className="flex flex-col items-center justify-center space-y-4"><h4 className="text-xs uppercase tracking-widest text-zinc-500">Preview</h4><div className="relative w-48 h-48 rounded-full border-4 border-double border-yellow-600 bg-white flex items-center justify-center shadow-2xl overflow-hidden">{logoPreview ? <img src={logoPreview} alt="Seal" className="w-32 h-32 object-contain" /> : <div className="text-center text-zinc-300"><FileBadge className="h-16 w-16 mx-auto text-zinc-200" /></div>}<div className="absolute inset-0 rounded-full border-[1px] border-zinc-900/10"></div></div><div className="text-center"><p className="font-serif font-bold text-lg text-white">BARANGAY {profileData?.barangayName?.toUpperCase() || 'NAME'}</p><p className="text-xs uppercase text-zinc-500">{profileData?.city || 'CITY'}, {profileData?.province || 'PROVINCE'}</p></div></div></div><div className="flex gap-4 pt-4"><Button type="button" variant="ghost" onClick={() => setCurrentStep(2)} className="w-1/3">Back</Button><Button onClick={handleSealSubmit} className="w-2/3 h-12 shadow-primary/20 shadow-lg">Generate Seal & Continue <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>)}
              {currentStep === 4 && (<div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6"><div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4"><h2 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="text-primary h-5 w-5" /> Pre-Commissioning Review</h2><span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded border border-yellow-500/20">Action Required</span></div><div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 space-y-4 font-mono text-sm"><div className="flex justify-between"><span className="text-zinc-500">Node ID:</span><span className="text-zinc-200">{profileData ? `${profileData.province.substring(0,3).toUpperCase()}-${profileData.city.substring(0,3).toUpperCase()}-${profileData.barangayName.replace(/\s/g,'').toUpperCase()}` : 'PENDING'}</span></div><div className="flex justify-between"><span className="text-zinc-500">Jurisdiction:</span><span className="text-zinc-200">{profileData ? `${profileData.barangayName}, ${profileData.city}, ${profileData.province}` : '...'}</span></div><div className="flex justify-between"><span className="text-zinc-500">Primary Custodian:</span><span className="text-zinc-200">{officialsData?.officials.find(o => o.role === 'Captain')?.name || '...'}</span></div><div className="flex justify-between"><span className="text-zinc-500">Security Level:</span><span className="text-green-500">HIGH (Level 4)</span></div></div><div className="flex items-start space-x-3 bg-primary/5 p-4 rounded-lg border border-primary/10"><Checkbox id="certify" checked={isCertified} onCheckedChange={(c) => setIsCertified(c as boolean)} className="mt-1"/><div className="grid gap-1.5 leading-none"><label htmlFor="certify" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-200">I certify that I am an authorized representative of this government unit.</label><p className="text-xs text-zinc-500">I understand that impersonating a government official is a punishable offense under the Revised Penal Code of the Philippines.</p></div></div><div className="flex gap-4 pt-4"><Button type="button" variant="ghost" onClick={() => setCurrentStep(3)} className="w-1/3">Back</Button><Button onClick={handleCommissionStart} disabled={!isCertified || isCommissioning} className={cn("w-2/3 h-12 shadow-lg transition-all", isCertified ? "shadow-primary/20 bg-primary hover:bg-primary/90" : "opacity-50")}>{isCommissioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TerminalSquare className="mr-2 h-4 w-4" />} Commission Node</Button></div></div>)}
              {currentStep === 5 && (<div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-500"><TerminalView logs={logs} /><div className="mt-8 text-center"><p className="text-zinc-500 text-sm">{hasError ? 'Commissioning failed. Please check the logs above.' : isCommissioning ? 'Processing secure handshake...' : 'Commissioning complete.'}</p>{hasError && (<Button onClick={handleRetry} variant="secondary" className="mt-4"><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>)}</div></div>)}
            </CardContent>
          </Card>
          <div className="mt-8 text-center text-xs text-zinc-600"><p>&copy; 2024 KlaroGov Systems. Secured by 256-bit Encryption.</p></div>
        </div>
      </div>
    );
}

export default function OnboardingPage() {
    return (<Suspense fallback={<div>Loading...</div>}><OnboardingPageComponent /></Suspense>);
}
