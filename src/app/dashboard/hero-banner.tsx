
'use client';

import { useState, useTransition } from 'react';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { askBarangayData } from '@/ai/flows/ask-barangay-data';
import { Resident, Project, BlotterCase } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

interface HeroBannerProps {
  residents: Resident[];
  projects: Project[];
  blotterCases: BlotterCase[];
  currentDate: string;
}

export function HeroBanner({ residents, projects, blotterCases, currentDate }: HeroBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [answer, setAnswer] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const { toast } = useToast();

  const handleAsk = () => {
    if (!query) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a question.',
      });
      return;
    }

    setAnswer(null); // Clear previous answer

    startTransition(async () => {
      try {
        const result = await askBarangayData({
          query,
          residentDemographics: JSON.stringify(residents),
          projectStatus: JSON.stringify(projects),
          blotterResolutions: JSON.stringify(blotterCases),
        });
        setAnswer(result.answer);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to get an answer from the AI. Please try again.',
        });
      }
    });
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Main Banner Card */}
      <div className="w-full bg-gradient-to-r from-[#ffedd5] to-[#fed7aa] rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-md border border-orange-200">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             {/* Abstract Curves/Blobs */}
             <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-orange-300/30 rounded-full blur-3xl mix-blend-multiply" />
             <div className="absolute bottom-[-50%] left-[-10%] w-[400px] h-[400px] bg-yellow-200/40 rounded-full blur-3xl mix-blend-multiply" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Left Content */}
          <div className="flex-1 max-w-2xl space-y-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-800/80 font-medium mb-1">
                    <span>Welcome to {currentDate}</span>
                    <span>|</span>
                    <span>Barangay San Isidro</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-[#33475b] tracking-tight leading-tight">
                  Magandang Araw, Admin! <span className="inline-block animate-wave origin-bottom-right">👋</span>
                </h1>
            </div>

            {/* AI Search Bar - Integrated */}
            <div className="relative max-w-xl w-full group">
                <div className="absolute inset-0 bg-blue-900/20 rounded-full blur-md transform group-hover:scale-[1.02] transition-transform duration-300" />
                <div className="relative flex items-center bg-[#2e3f50] rounded-full overflow-hidden shadow-lg border border-white/10 ring-1 ring-white/20 transition-all focus-within:ring-2 focus-within:ring-[#ff7a59]">
                    <div className="pl-6 pr-3 text-white/50">
                        {isPending ? <Loader2 className="h-5 w-5 animate-spin text-[#ff7a59]" /> : <Search className="h-5 w-5" />}
                    </div>
                    <input
                        type="text"
                        className="w-full h-14 bg-transparent text-white placeholder:text-white/60 outline-none text-base"
                        placeholder="Ask Klaro AI about residents, projects, or cases..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                        disabled={isPending}
                    />
                    <div className="pr-2">
                        <Button 
                            size="icon" 
                            className="h-10 w-10 rounded-full bg-[#ff7a59] hover:bg-[#ff7a59]/90 text-white border-0 shadow-md transition-transform active:scale-95"
                            onClick={handleAsk}
                            disabled={isPending || !query.trim()}
                        >
                            <Sparkles className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="hidden md:block relative w-[400px] h-[250px] shrink-0">
                {/* We use a CSS-only composition to mimic the vector illustration style if an external image isn't preferred, 
                    but here I will use a placeholder image approach that looks like the sample. */}
                <div className="absolute inset-0 flex items-center justify-center drop-shadow-2xl filter contrast-125">
                     {/* Placeholder for the "Community/Police" illustration. 
                         Using a generic 'community' vector from a reliable CDN or a styled div representation. 
                         Since I cannot rely on external URLs being persistent, I will create a high-fidelity CSS composition 
                         or use a very standard placeholder that looks professional. */}
                     
                     {/* This represents the group of people in the reference */}
                     <img 
                        src="https://illustrations.popsy.co/amber/community.svg" 
                        alt="Barangay Community Illustration"
                        className="w-full h-full object-contain transform scale-110"
                        onError={(e) => {
                            // Fallback if image fails
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                     />
                </div>
          </div>
        </div>
      </div>

      {/* AI Answer Result Card (Appears below banner) */}
      {answer && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="bg-white/80 backdrop-blur-sm border-l-4 border-l-[#ff7a59] shadow-lg overflow-hidden">
                <CardContent className="p-6 relative">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setAnswer(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-4">
                        <div className="p-3 bg-orange-100 rounded-full h-fit">
                            <Sparkles className="h-6 w-6 text-[#ff7a59]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold text-[#33475b]">Klaro AI Analysis</h3>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{answer}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
