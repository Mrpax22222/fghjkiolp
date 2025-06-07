import { Skeleton } from "@/components/ui/skeleton"

export function LoadingEditor() {
  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <div className="h-14 border-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>

      <div className="border-b">
        <div className="flex items-center border-b h-10">
          <Skeleton className="h-8 w-20 mx-2" />
          <Skeleton className="h-8 w-20 mx-2" />
          <Skeleton className="h-8 w-20 mx-2" />
          <Skeleton className="h-8 w-20 mx-2" />
          <Skeleton className="h-8 w-20 mx-2" />
        </div>
        <div className="p-2 flex flex-wrap items-center gap-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      <div className="flex-1 bg-muted/30 flex items-center justify-center p-8">
        <div className="w-[210mm] h-[297mm] bg-white rounded-md shadow-lg animate-pulse" />
      </div>

      <div className="h-6 border-t px-4 flex items-center">
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  )
}
