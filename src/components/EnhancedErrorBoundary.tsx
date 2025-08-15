import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { EnhancedButton } from './EnhancedButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReload?: boolean;
  showHome?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // Report to analytics/monitoring service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Error Boundary Triggered', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Oops! Something went wrong
            </h1>
            
            <p className="text-muted-foreground mb-6 leading-relaxed">
              We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-32">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <EnhancedButton
                onClick={this.handleRetry}
                variant="default"
                icon={<RefreshCw className="w-4 h-4" />}
                hapticType="medium"
                className="min-w-[120px]"
              >
                Try Again
              </EnhancedButton>
              
              {this.props.showReload && (
                <EnhancedButton
                  onClick={this.handleReload}
                  variant="outline"
                  icon={<RefreshCw className="w-4 h-4" />}
                  hapticType="light"
                  className="min-w-[120px]"
                >
                  Reload Page
                </EnhancedButton>
              )}
              
              {this.props.showHome && (
                <EnhancedButton
                  onClick={this.handleGoHome}
                  variant="ghost"
                  icon={<Home className="w-4 h-4" />}
                  hapticType="light"
                  className="min-w-[120px]"
                >
                  Go Home
                </EnhancedButton>
              )}
            </div>

            {this.state.retryCount > 2 && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Still having trouble? Try refreshing the page or contact support if the problem persists.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error handled:', error, errorInfo);
    
    // Report to monitoring service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Error Handled', {
        error: error.message,
        stack: error.stack
      });
    }
  };

  return { handleError };
};