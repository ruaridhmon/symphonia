import { CheckCircle } from 'lucide-react';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/**
 * Post-submission confirmation page.
 * Rendered inside PageLayout (which provides Header + Footer).
 */
export default function ThankYouPage() {
  useDocumentTitle('Submission Complete');
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="card-lg p-8 sm:p-10 max-w-3xl w-full text-center space-y-5">
        <div className="flex justify-center">
          <CheckCircle size={48} style={{ color: 'var(--success)' }} />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Thank you for your submission
        </h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Your reflections have been recorded successfully.
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We appreciate your contribution to this collaborative process.
        </p>
      </div>
    </div>
  );
}
