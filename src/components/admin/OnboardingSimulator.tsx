
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle, FastForward } from 'lucide-react';
import { SimulateProvisioningDialog } from './SimulateProvisioningDialog';

export function OnboardingSimulator() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleStartSimulation = async () => {
    setLoading(true);
    // Simulate a delay for "generating" the user persona
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a random mock profile
    const randomId = Math.floor(Math.random() * 1000);
    const mockProfile = {
        province: 'Cavite',
        city: 'Bacoor',
        barangay: `Brgy. Simulation-${randomId}`,
    };

    // Construct the URL with query params
    const url = `/onboarding?province=${encodeURIComponent(mockProfile.province)}&city=${encodeURIComponent(mockProfile.city)}&barangay=${encodeURIComponent(mockProfile.barangay)}&simulationMode=true`;
    
    toast({
        title: "Simulation Started",
        description: `Starting onboarding journey for ${mockProfile.barangay}...`
    });

    router.push(url);
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-sm border-dashed border-amber-300 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-amber-700 flex items-center gap-2">
            <PlayCircle className="h-5 w-5" /> Simulation Suite
        </CardTitle>
        <CardDescription>
          Test the platform capabilities in a sandbox environment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-slate-600 mb-4">
            <p className="font-semibold mb-1">Available Modes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>User Journey:</strong> Launch the full Onboarding Wizard with a generated persona.</li>
                <li><strong>Backend Mock:</strong> Instantly create a pending request in the queue to test approvals.</li>
            </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button 
            className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
            onClick={handleStartSimulation}
            disabled={loading}
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FastForward className="mr-2 h-4 w-4" />}
            Launch Journey Simulator
        </Button>
        
        <div className="relative w-full text-center">
            <span className="bg-amber-50 px-2 text-[10px] text-slate-400 uppercase tracking-widest">or</span>
            <div className="absolute top-1/2 w-full border-t border-slate-200/50 -z-10"></div>
        </div>

        <SimulateProvisioningDialog className="w-full" />
      </CardFooter>
    </Card>
  );
}
