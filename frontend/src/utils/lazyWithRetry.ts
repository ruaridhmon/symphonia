import { lazy } from 'react';
import type { ComponentType } from 'react';

const RETRY_KEY = 'symphonia-lazy-retried';

function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  return /dynamically imported module|module script failed|loading chunk|importing a module script failed/i.test(
    message
  );
}

/**
 * Wrap React.lazy with a one-time hard refresh recovery for stale chunk errors.
 * This commonly happens after a fresh deploy while users still run an old shell.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await importer();
      try {
        sessionStorage.removeItem(RETRY_KEY);
      } catch {
        // Ignore storage access issues.
      }
      return mod;
    } catch (error) {
      if (isChunkLoadError(error)) {
        try {
          const retried = sessionStorage.getItem(RETRY_KEY) === '1';
          if (!retried) {
            sessionStorage.setItem(RETRY_KEY, '1');
            window.location.reload();
            return new Promise<{ default: T }>(() => {});
          }
          sessionStorage.removeItem(RETRY_KEY);
        } catch {
          // If storage is blocked, fall through and surface the original error.
        }
      }
      throw error;
    }
  });
}
