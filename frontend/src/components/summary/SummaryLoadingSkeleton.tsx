import { Skeleton, SkeletonCard } from '../index';

/** Full-page loading skeleton for SummaryPage before form data loads */
export default function SummaryLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header
        className="border-b sticky top-0 z-40"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton variant="avatar" width="2rem" height="2rem" />
            <div>
              <Skeleton variant="text" width="10rem" height="1.25rem" />
              <Skeleton
                variant="text"
                width="8rem"
                height="0.875rem"
                style={{ marginTop: '0.25rem' }}
              />
            </div>
          </div>
          <Skeleton variant="button" width="5rem" height="2rem" />
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Skeleton variant="text" width="10rem" style={{ marginBottom: '1.5rem' }} />

        <div className="mb-6 flex gap-4">
          <Skeleton variant="avatar" width="3rem" height="3rem" />
          <Skeleton variant="avatar" width="3rem" height="3rem" />
          <Skeleton variant="avatar" width="3rem" height="3rem" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </main>
    </div>
  );
}
