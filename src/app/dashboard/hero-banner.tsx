'use client';

import { useState, useTransition } from 'react';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { askBarangayData } from '@/ai/flows/ask-barangay-data';
import { Resident, Project, BlotterCase } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { useTenantProfile } from '@/hooks/use-tenant-profile';

interface HeroBannerProps {
  residents: Resident[];
  projects: Project[];
  blotterCases: BlotterCase[];
  currentDate: string;
  heroImageUrl?: string;
}

export function HeroBanner({ residents, projects, blotterCases, currentDate, heroImageUrl }: HeroBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [answer, setAnswer] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const { toast } = useToast();
  const { profile } = useTenantProfile();

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
      {/* Main Banner Card - Reduced Padding */}
      <div className="w-full bg-gradient-to-r from-[#ffedd5] to-[#fed7aa] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-md border border-orange-200">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-orange-300/30 rounded-full blur-3xl mix-blend-multiply" />
             <div className="absolute bottom-[-50%] left-[-10%] w-[400px] h-[400px] bg-yellow-200/40 rounded-full blur-3xl mix-blend-multiply" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left Content - Compact */}
          <div className="flex-1 max-w-xl space-y-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-orange-800/80 text-sm font-medium mb-1">
                    <span>Welcome to {currentDate}</span>
                    <span>|</span>
                    <span>{profile?.barangayName || 'Barangay San Isidro'}</span>
                </div>
                {/* Reduced Text Size */}
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#33475b] tracking-tight leading-tight">
                  Magandang Araw, Admin! <span className="inline-block animate-wave origin-bottom-right">👋</span>
                </h1>
            </div>

            {/* AI Search Bar - Compact */}
            <div className="relative max-w-lg w-full group">
                <div className="absolute inset-0 bg-blue-900/20 rounded-full blur-md transform group-hover:scale-[1.02] transition-transform duration-300" />
                <div className="relative flex items-center bg-[#2e3f50] rounded-full overflow-hidden shadow-lg border border-white/10 ring-1 ring-white/20 transition-all focus-within:ring-2 focus-within:ring-[#ff7a59]">
                    <div className="pl-4 pr-2 text-white/50">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin text-[#ff7a59]" /> : <Search className="h-4 w-4" />}
                    </div>
                    {/* Reduced Input Height */}
                    <input
                        type="text"
                        className="w-full h-10 bg-transparent text-white placeholder:text-white/60 outline-none text-sm"
                        placeholder="Ask Klaro AI about residents, projects, or cases..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                        disabled={isPending}
                    />
                    <div className="pr-1">
                        <Button 
                            size="icon" 
                            className="h-8 w-8 rounded-full bg-[#ff7a59] hover:bg-[#ff7a59]/90 text-white border-0 shadow-md transition-transform active:scale-95"
                            onClick={handleAsk}
                            disabled={isPending || !query.trim()}
                        >
                            <Sparkles className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
          </div>

          {/* Right Illustration - Optimized Spacing and Placement */}
          <div className="hidden md:block relative w-[400px] h-[220px] shrink-0 -mr-8 -mb-8">
                <div className="absolute inset-0 flex items-end justify-end">
                     {heroImageUrl ? (
                         <img 
                             src={heroImageUrl} 
                             alt="Barangay Community Illustration"
                             className="w-full h-full object-contain object-bottom"
                         />
                     ) : (
                         <img 
                            src="https://illustrations.popsy.co/amber/community.svg" 
                            alt="Barangay Community Illustration"
                            className="w-full h-full object-contain object-bottom"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                         />
                     )}
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
