import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches React errors in child component tree
 * 
 * Provides graceful fallback UI with:
 * - Error message display
 * - Component stack trace logging
 * - Retry button to reset error state
 * - Styled to match app theme
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallbackTitle="Dashboard Error">
 *   <Dashboard />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console with component stack
    console.error('ErrorBoundary caught an error:', {
      error,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
      errorInfo,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback (e.g., to reset route or refetch data)
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong' } = this.props;
      const { error } = this.state;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '2rem',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            textAlign: 'center',
            gap: '1rem',
          }}
        >
          {/* Error Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--destructive)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--destructive-foreground)',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            ⚠
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'var(--foreground)',
              margin: 0,
            }}
          >
            {fallbackTitle}
          </h2>

          {/* Error Message */}
          {error && (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--muted-foreground)',
                maxWidth: '500px',
                margin: '0.5rem 0',
                fontFamily: 'monospace',
                backgroundColor: 'var(--muted)',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
              }}
            >
              {error.message}
            </p>
          )}

          {/* Helpful message */}
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              maxWidth: '500px',
            }}
          >
            An unexpected error occurred. This has been logged to the console. 
            You can try reloading the page or contact support if the problem persists.
          </p>

          {/* Retry Button */}
          <button
            onClick={this.handleReset}
            className="btn-interactive px-5 py-3 text-base"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
              marginTop: '0.5rem',
            }}
          >
            Try Again
          </button>

          {/* Development mode: show stack trace */}
          {import.meta.env.DEV && this.state.errorInfo && (
            <details
              style={{
                marginTop: '1rem',
                width: '100%',
                maxWidth: '600px',
                textAlign: 'left',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  marginBottom: '0.5rem',
                }}
              >
                Component Stack (Dev Mode)
              </summary>
              <pre
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--muted)',
                  padding: '1rem',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  border: '1px solid var(--border)',
                }}
              >
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
