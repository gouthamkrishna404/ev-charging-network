import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-[60px]" />
      <Skeleton className="h-[60px]" />
    </div>
  );
}
