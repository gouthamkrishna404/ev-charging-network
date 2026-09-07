import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-[76px]" />
      ))}
    </div>
  );
}
