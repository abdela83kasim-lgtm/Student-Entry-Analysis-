import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed.error === 'string') {
        message = parsed.path
          ? `Database operation (${parsed.operationType}) on "${parsed.path}" failed: ${parsed.error}`
          : parsed.error;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#EAEFEA] dark:bg-[#0D1513] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#16221F] border border-[#D5E2DC] dark:border-[#2A3B37] rounded-2xl shadow-xl p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-serif font-bold text-[#0F4C3A] dark:text-[#E7EFEC]">
              Application Synchronization Notice
            </h1>
            <p className="text-xs sm:text-sm text-[#4F6166] dark:text-[#9DB0AA] break-words">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
