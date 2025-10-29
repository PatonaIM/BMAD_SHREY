import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700 ${className}`}
      aria-hidden="true"
    />
  );
}

interface JobSkeletonListProps {
  count?: number;
}

export function JobSkeletonList({ count = 6 }: JobSkeletonListProps) {
  return (
    <ul className="grid gap-4 list-none p-0 m-0" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="card p-4 flex flex-col gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="flex flex-wrap gap-2 mt-1">
            {Array.from({ length: 6 }).map((__, j) => (
              <Skeleton key={j} className="h-5 w-16" />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}
