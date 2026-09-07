import { PageHeader, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Loading…" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
