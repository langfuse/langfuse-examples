import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Bot } from "lucide-react"

interface ChatBubbleProps {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
}

export function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const isUser = role === "user"
  const isSystem = role === "system"

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">{content}</span>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-3 mb-6 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "")}>
      <Avatar className="h-8 w-8 border border-border">
        <AvatarFallback
          className={cn("bg-muted text-muted-foreground", isUser ? "bg-primary text-primary-foreground" : "")}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={cn("flex flex-col gap-1 min-w-0", isUser ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground capitalize">{role}</span>
          {timestamp && (
            <span className="text-[10px] text-muted-foreground/60">{new Date(timestamp).toLocaleTimeString()}</span>
          )}
        </div>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words max-w-full shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted/50 border border-border/50 text-foreground rounded-tl-sm",
          )}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
