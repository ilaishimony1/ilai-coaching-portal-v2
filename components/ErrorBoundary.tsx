import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a crash anywhere below it and shows a message instead of leaving
 * the screen blank. Without this, one bad render takes the whole app down
 * with nothing on screen to explain it.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-page px-6 text-center">
        <p className="text-slate-200 text-lg font-bold">Something went wrong.</p>
        <p className="text-slate-500 text-sm max-w-sm">
          Nothing was lost. Reloading usually fixes it — if it keeps happening,
          send this message to Ilai.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest"
        >
          Reload
        </button>
        <p className="text-slate-700 text-[10px] max-w-md break-words">
          {this.state.error.message}
        </p>
      </div>
    );
  }
}
