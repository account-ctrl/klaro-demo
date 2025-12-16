
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string; // To identify which component crashed
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Component Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2 text-sm">
              The <strong>{this.props.name || 'component'}</strong> encountered a problem and could not be rendered.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => this.setState({ hasError: false })}
              className="w-full sm:w-auto"
            >
              <RefreshCcw className="mr-2 h-3 w-3" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
