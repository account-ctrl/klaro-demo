
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, AlertTriangle, BookOpen, CheckCircle, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOrdinanceAI, AIAnalysisResult } from '@/lib/services/ordinance-ai';
import { useToast } from '@/hooks/use-toast';

interface DraftToolsProps {
    content: string;
    onApplySuggestion: (text: string) => void;
}

export function DraftTools({ content, onApplySuggestion }: DraftToolsProps) {
    const { analyzeOrdinance } = useOrdinanceAI();
    const { toast } = useToast();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AIAnalysisResult | null>(null);

    const handleAnalyze = async () => {
        if (!content || content.length < 50) {
            toast({ title: "Content too short", description: "Please write more content before analyzing.", variant: "destructive" });
            return;
        }

        setIsAnalyzing(true);
        try {
            const data = await analyzeOrdinance(content);
            setResult(data);
        } catch (e) {
            toast({ title: "Analysis Failed", description: "Could not connect to AI service.", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-700">
                        <Sparkles className="h-4 w-4" /> AI Assistant
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Analyze your draft for conflicts, legal basis, and improvements.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button 
                        size="sm" 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />}
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Draft'}
                    </Button>
                </CardContent>
            </Card>

            <ScrollArea className="flex-1 pr-3">
                {result ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Summary */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                                <BookOpen className="h-3 w-3" /> Summary
                            </h4>
                            <p className="text-sm text-zinc-700 bg-white p-3 rounded border border-zinc-200 leading-relaxed">
                                {result.summary}
                            </p>
                        </div>

                        {/* Conflicts */}
                        {result.conflicts.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-2">
                                    <AlertTriangle className="h-3 w-3" /> Potential Conflicts
                                </h4>
                                <ul className="space-y-2">
                                    {result.conflicts.map((conflict, i) => (
                                        <li key={i} className="text-sm bg-red-50 text-red-800 p-2 rounded border border-red-100">
                                            {conflict}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Suggestions */}
                        {result.suggestions.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3" /> Suggestions
                                </h4>
                                <ul className="space-y-2">
                                    {result.suggestions.map((suggestion, i) => (
                                        <li key={i} className="text-sm bg-blue-50 text-blue-800 p-2 rounded border border-blue-100 flex justify-between items-start gap-2 group">
                                            <span>{suggestion}</span>
                                            {/* Future: Add 'Apply' button to auto-insert */}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                         {/* Legal Basis */}
                         {result.legalBasis.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-green-600 flex items-center gap-2">
                                    <BookOpen className="h-3 w-3" /> Legal References
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.legalBasis.map((basis, i) => (
                                        <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            {basis}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 text-zinc-400 text-sm">
                        <p>No analysis yet.</p>
                        <p className="text-xs mt-1">Click "Analyze Draft" to get insights.</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
