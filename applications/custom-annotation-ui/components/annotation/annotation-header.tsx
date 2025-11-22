import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"

interface AnnotationHeaderProps {
  queueId: string
  currentIndex: number
  totalItems: number
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
}

export function AnnotationHeader({
  queueId,
  currentIndex,
  totalItems,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: AnnotationHeaderProps) {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm shrink-0 z-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <span className="text-sm font-medium">Queue #{queueId}</span>
          <span className="text-xs text-muted-foreground">
            Item {currentIndex + 1} of {totalItems}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground mr-4 hidden md:block">
          <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">←</span> Prev
          <span className="mx-2"></span>
          <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">→</span> Next
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!canGoPrev}
          className="h-8 w-8 p-0 bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
          className="h-8 w-8 p-0 bg-transparent"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
