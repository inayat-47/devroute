/**
 * src/components/ErrorBoundary.tsx
 *
 * Top-level React error boundary — catches any unhandled render error
 * in the component tree and shows a dark-themed recovery screen
 * instead of a blank white page.
 */

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md text-center p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
            <div className="h-14 w-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-white">
              Something Went Wrong
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              An unexpected error occurred. This is usually temporary — try
              refreshing the page to get back on track.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-slate-600 bg-slate-950 rounded-lg p-3 overflow-x-auto text-left border border-slate-800 max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all cursor-pointer"
            >
              ← Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
