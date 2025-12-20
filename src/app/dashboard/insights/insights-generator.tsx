
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, BarChart2, TrendingUp, AlertCircle } from "lucide-react";
import { generateBarangayInsights } from '@/ai/flows/barangay-data-insights';

export default function InsightsGenerator() {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setInsight(null);
    try {
      // In a real scenario, this fetches data from Firestore first
      // For now, we simulate the flow call or call the server action
      // Since `generateBarangayInsights` is a Genkit flow, we usually call it via an API route or Server Action wrapper.
      // Assuming we have an API route or direct server action capability:
      
      // Simulating a delay for effect if direct call isn't set up in this snippet context
      // In production: const result = await runFlow(generateBarangayInsights, currentData);
      
      // Placeholder for the actual integration
      await new Promise(r => setTimeout(r, 2000)); 
      setInsight(`
        **Key Insights for Barangay San Isidro:**
        
        1. **Demographic Shift:** There has been a 5% increase in the youth population (ages 18-24) over the last quarter. Consider launching more youth engagement programs.
        
        2. **Blotter Trends:** Noise complaints have spiked by 15% in Purok 3 during weekends. Targeted tanod patrols on Friday and Saturday nights are recommended.
        
        3. **Health Advisory:** Cases of Dengue are slightly above average for this season. Initiate a clean-up drive in flood-prone areas immediately.
      `);
      
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
