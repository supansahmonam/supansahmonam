import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown the moment a sidebar link is clicked. Every route under (app) reads
 * the session cookie, so it is dynamic and Next.js cannot prefetch the page
 * itself - only this fallback and the shared layout. Without it the click
 * would sit on the old page until the server finished rendering.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
