import { Card, PageHeader, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Stations I Manage" subtitle="Loading…" />
      <Skeleton className="h-20" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4 h-16 flex items-center">
            <Skeleton className="h-8 w-8 rounded-lg mr-3" />
            <Skeleton className="h-4 flex-1" />
          </Card>
        ))}
      </div>
    </div>
  );
}
