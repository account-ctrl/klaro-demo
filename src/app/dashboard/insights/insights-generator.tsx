"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateInsightsAction } from "@/lib/actions";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { barangayDataForAI } from "@/lib/data";

export function InsightsGenerator() {
  const [isPending, startTransition] = useTransition();
  const [insights, setInsights] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateInsightsAction();
      if (result.success) {
        setInsights(result.insights);
        toast({
          title: "Insights Generated",
          description: "AI analysis complete.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Powered Analysis</CardTitle>
        <CardDescription>
          Click the button to analyze your Barangay's latest data on resident demographics, project statuses, and blotter resolutions to identify key trends and suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGenerate} disabled={isPending} size="lg">
          {isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-5 w-5" />
          )}
          Generate Insights
        </Button>
        {isPending && (
            <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI is analyzing data... This may take a moment.</span>
            </div>
        )}
        {insights && (
            <Card className="bg-muted/50">
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>Generated Insights</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                        {insights}
                    </div>
                </CardContent>
            </Card>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Note: This is a demo using sample data. In a live environment, the AI will analyze your Barangay's real-time data from Firestore.
        </p>
      </CardFooter>
    </Card>
  );
}
