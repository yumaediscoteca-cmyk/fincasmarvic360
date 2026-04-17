import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
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
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center flex-col gap-4 text-center px-8">
          <span className="text-red-400 text-sm font-black tracking-widest uppercase">Error Inesperado</span>
          <span className="text-slate-400 text-xs">{this.state.error?.message || 'Ha ocurrido un error en la aplicación.'}</span>
          <button onClick={() => window.location.href = '/'} className="px-4 py-2 mt-4 bg-sky-500 text-slate-900 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-sky-400 transition-colors">Volver al Inicio</button>
        </div>
      );
    }

    return this.props.children;
  }
}