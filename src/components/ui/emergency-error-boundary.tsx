'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Terminal, ShieldAlert, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Props {
  children?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class EmergencyErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`CRITICAL ERROR in ${this.props.name || 'Emergency System'}:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
      window.location.reload();
  };

  private handleReset = () => {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] p-4 font-sans text-zinc-100">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(239,68,68,0.05),_transparent_50%)]" />
            
            <Card className="w-full max-w-2xl bg-zinc-900/50 border-red-900/30 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
                
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-3 mb-2 text-red-500">
                        <ShieldAlert className="h-8 w-8" />
                        <CardTitle className="text-2xl font-bold tracking-tight">System Fault Detected</CardTitle>
                    </div>
                    <CardDescription className="text-zinc-400 text-base">
                        The {this.props.name || 'Emergency Dashboard'} encountered a critical runtime exception.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="bg-black/40 rounded-lg border border-white/5 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-red-400 text-sm font-semibold uppercase tracking-wider">
                            <Bug className="h-4 w-4" />
                            Exception Stack
                        </div>
                        <div className="font-mono text-xs text-red-300/80 leading-relaxed whitespace-pre-wrap break-all bg-red-950/20 p-3 rounded border border-red-900/20">
                            {this.state.error?.name}: {this.state.error?.message}
                        </div>
                        
                        {this.state.errorInfo && (
                            <ScrollArea className="h-48 w-full rounded border border-white/5 bg-black/20 p-3">
                                <pre className="text-[10px] text-zinc-500 font-mono leading-tight italic">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </ScrollArea>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Terminal className="h-4 w-4" />
                            Potential Root Causes:
                        </h4>
                        <ul className="text-xs text-zinc-400 space-y-1 pl-6 list-disc">
                            <li>Leaflet Map initialization failure (Invalid Coordinates)</li>
                            <li>Firestore collection permission mismatch</li>
                            <li>Custom hook execution order during rapid state update</li>
                            <li>Browser Geolocation API policy restriction</li>
                        </ul>
                    </div>
                </CardContent>

                <Separator className="bg-white/5" />

                <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                    <Button 
                        onClick={this.handleReset}
                        variant="outline" 
                        className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Attempt Soft Recovery
                    </Button>
                    <Button 
                        onClick={this.handleReload}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Hard Refresh Application
                    </Button>
                </CardFooter>
            </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
