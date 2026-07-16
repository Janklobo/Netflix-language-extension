import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../utils/monitoring';

interface Props {
  children: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Cast errorInfo componentStack to a format Sentry/monitoring helper accepts
    reportError(error, {
      component: this.props.fallbackName || 'UnknownComponent',
      componentStack: errorInfo.componentStack || undefined,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-[#0F0F1A] text-white rounded-lg border border-red-500/20">
          <div className="p-3 mb-4 bg-red-500/10 rounded-full text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            The application encountered an unexpected error. This has been reported to our team.
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 transition-colors rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0F0F1A]"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
