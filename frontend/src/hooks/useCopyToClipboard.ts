import { useState, useCallback, useRef } from 'react';

/**
 * Hook to copy text to clipboard with visual feedback.
 * Returns [copied, copyFn] — `copied` is true for `feedbackMs` after a copy.
 */
export function useCopyToClipboard(feedbackMs = 2000): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), feedbackMs);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), feedbackMs);
    }
  }, [feedbackMs]);

  return [copied, copy];
}
