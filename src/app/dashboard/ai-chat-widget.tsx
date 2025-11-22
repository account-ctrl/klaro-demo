'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { askBarangayData } from '@/ai/flows/ask-barangay-data';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { Resident, Project, BlotterCase } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface AIChatWidgetProps {
  residents: Resident[];
  projects: Project[];
  blotterCases: BlotterCase[];
  isLoading: boolean;
}

export function AIChatWidget({
  residents,
  projects,
  blotterCases,
  isLoading,
}: AIChatWidgetProps) {
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
  
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Sparkles className="h-6 w-6 text-primary shrink-0" />
          <div className="flex-grow flex gap-2 items-center">
            <Input
              placeholder="Ask Klaro AI a question about your barangay data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              disabled={isPending}
            />
            <Button onClick={handleAsk} disabled={isPending} size="icon">
                {isPending ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </div>
        </div>

        {isPending && (
            <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI is analyzing data... This may take a moment.</span>
            </div>
        )}

        {answer && (
          <div className="p-4 rounded-md bg-background/50">
             <p className="text-sm text-primary-foreground whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
