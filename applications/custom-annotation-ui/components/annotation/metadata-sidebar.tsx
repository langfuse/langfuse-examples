import { cn } from "@/lib/utils"
import type { QueueItem } from "@/lib/types"

interface MetadataSidebarProps {
  item: QueueItem
}

export function MetadataSidebar({ item }: MetadataSidebarProps) {
  return (
    <div className="mt-8 space-y-4">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metadata</h4>
      <div className="text-xs space-y-2 text-muted-foreground/80">
        <div className="flex justify-between">
          <span>ID</span>
          <span className="font-mono text-foreground">{item.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Status</span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium",
              item.status === "COMPLETED"
                ? "bg-green-500/10 text-green-500"
                : "bg-yellow-500/10 text-yellow-500",
            )}
          >
            {item.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Created</span>
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
