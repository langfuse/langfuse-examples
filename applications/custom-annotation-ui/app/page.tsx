import Link from "next/link"
import { api } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, ListTodo, CheckCircle2 } from "lucide-react"

export default async function Dashboard() {
  const queues = await api.getQueues()

  return (
    <div className="min-h-screen bg-background p-8 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Annotation Queues</h1>
        <p className="text-muted-foreground text-lg">Select a queue to start reviewing traces.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues.map((queue) => (
          <Card key={queue.id} className="group hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{queue.name}</span>
              </CardTitle>
              <CardDescription className="line-clamp-2 h-10">
                {queue.description || "No description provided."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ListTodo className="h-4 w-4" />
                  <span>{queue.pendingItemCount} pending</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{queue.completedItemCount} completed</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                asChild
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
              >
                <Link href={`/queue/${queue.id}`}>
                  Start Reviewing <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
