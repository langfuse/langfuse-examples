// Langfuse API Response Types

export interface AnnotationQueue {
  id: string
  name: string
  description?: string | null
  scoreConfigIds: string[]
  createdAt: string
  updatedAt: string
  // Note: counts are not returned by API, we'll calculate them from items
  pendingItemCount?: number
  completedItemCount?: number
}

export interface QueueItem {
  id: string
  queueId: string
  objectId: string // The ID of the trace or session
  objectType: "TRACE" | "SESSION"
  status: "PENDING" | "COMPLETED"
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Observation {
  id: string
  traceId: string
  type: string
  name: string
  startTime: string
  endTime?: string | null
  input: any
  output: any
  metadata?: Record<string, any> | null
  level?: string
  statusMessage?: string | null
  parentObservationId?: string | null
  version?: string | null
  model?: string | null
  modelParameters?: Record<string, any> | null
  usage?: {
    input?: number
    output?: number
    total?: number
    unit?: string
    inputCost?: number
    outputCost?: number
    totalCost?: number
  } | null
  promptName?: string | null
  promptVersion?: number | null
  costDetails?: Record<string, number> | null
  calculatedInputCost?: number | null
  calculatedOutputCost?: number | null
  calculatedTotalCost?: number | null
  latency?: number | null
}

export interface Trace {
  id: string
  timestamp: string
  name: string
  input: any
  output: any
  sessionId?: string | null
  userId?: string | null
  metadata?: Record<string, any> | null
  tags?: string[]
  release?: string | null
  version?: string | null
  environment?: string | null
  public?: boolean
  htmlPath?: string
  latency?: number
  totalCost?: number
  observations?: Observation[]
  scores?: Score[]
}

export interface Session {
  id: string
  createdAt: string
  projectId: string
  environment?: string | null
  traces: Trace[]
}

export interface Score {
  id: string
  traceId?: string
  observationId?: string
  sessionId?: string
  name: string
  // For CATEGORICAL scores: value may be optional, stringValue is primary
  // For NUMERIC/BOOLEAN scores: value is the primary field
  value?: number
  stringValue?: string
  dataType?: "NUMERIC" | "CATEGORICAL" | "BOOLEAN"
  comment?: string | null
  source?: "ANNOTATION" | "API" | "EVAL"
  configId?: string | null
  queueId?: string | null
  authorUserId?: string | null
  timestamp: string
  createdAt: string
  updatedAt: string
}

export interface ConfigCategory {
  label: string
  value: number
}

export interface ScoreConfig {
  id: string
  name: string
  dataType: "NUMERIC" | "CATEGORICAL" | "BOOLEAN"
  description?: string | null
  categories?: ConfigCategory[] | null
  minValue?: number | null
  maxValue?: number | null
  isArchived?: boolean
  projectId?: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
  id?: string
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}
