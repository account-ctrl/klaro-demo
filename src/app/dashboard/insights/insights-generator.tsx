
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, BarChart2, TrendingUp, AlertCircle } from "lucide-react";
import { generateInsightsAction } from '@/lib/actions';

export default function InsightsGenerator() {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setInsight(null);
    try {
      const result = await generateInsightsAction();
      
      if (result.success && result.insights) {
        setInsight(result.insights);
      } else {
        setInsight("Unable to generate insights at this time. Please try again.");
      }
      
    } catch (error) {
      console.error(error);
      setInsight("Failed to generate insights. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-indigo-900">AI Data Analyst</CardTitle>
            </div>
            {insight && (
                 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">Analysis Ready</span>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {!insight ? (
            <div className="text-center py-6 space-y-4">
                <div className="bg-white p-4 rounded-full inline-block shadow-sm">
                    <BarChart2 className="h-8 w-8 text-indigo-300" />
                </div>
                <p className="text-sm text-slate-600 max-w-sm mx-auto">
                    Click the button to analyze your Barangay's real-time data on resident demographics, project statuses, and blotter resolutions.
                </p>
                
                <Button onClick={handleGenerate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Insights
                </Button>
            </div>
        ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-white/50 p-4 rounded-lg border border-indigo-100 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {insight}
                </div>
                <div className="flex justify-end gap-2">
                     <Button variant="outline" size="sm" onClick={() => setInsight(null)}>Dismiss</Button>
                     <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50">View Detailed Report</Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
