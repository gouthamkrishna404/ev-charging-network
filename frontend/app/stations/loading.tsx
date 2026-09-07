import { PageHeader, Skeleton, Card } from "@/components/ui";

export default function Loading() {
  return (
    <div>
      <PageHeader title="Charging Stations" subtitle="Loading…" />
      <Skeleton className="h-[380px] w-full mb-6" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 h-[104px] flex flex-col gap-2 justify-center">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}
