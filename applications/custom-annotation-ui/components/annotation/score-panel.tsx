"use client"

/**
 * ScorePanel Component
 *
 * Supports all three Langfuse score data types:
 *
 * 1. NUMERIC - Continuous numeric values
 *    - Displays as number buttons (if range ≤10) or input field
 *    - Supports optional min/max validation
 *
 * 2. CATEGORICAL - Predefined text categories
 *    - Displays as buttons for each category
 *    - Submitted as string values to Langfuse API
 *    - Internally tracked by numeric value, converted to label on submission
 *
 * 3. BOOLEAN - Binary yes/no values
 *    - Displays as Yes/No buttons
 *    - Submitted as 0 or 1 to Langfuse API
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ScoreConfig, Score } from "@/lib/types"

interface ScoreValue {
  configId: string
  name: string
  value: number
}

interface ScorePanelProps {
  scoreConfigs: ScoreConfig[]
  onSubmit: (scores: ScoreValue[], comment: string) => void
  isSubmitting?: boolean
  isCompleted?: boolean
  completedAt?: string | null
  existingScores?: Score[]
}

export function ScorePanel({ scoreConfigs, onSubmit, isSubmitting = false, isCompleted = false, completedAt, existingScores = [] }: ScorePanelProps) {
  // State is automatically reset when component remounts (controlled by key prop in parent)
  const [comment, setComment] = useState("")
  // Track selected scores for each config: { [configId]: value }
  const [selectedScores, setSelectedScores] = useState<Record<string, number>>({})

  const handleScoreSelect = (configId: string, value: number) => {
    setSelectedScores(prev => ({ ...prev, [configId]: value }))
  }

  const handleSubmit = () => {
    // Convert selectedScores to array of ScoreValue objects
    const scores = scoreConfigs
      .filter(config => selectedScores[config.id] !== undefined)
      .map(config => ({
        configId: config.id,
        name: config.name,
        value: selectedScores[config.id],
      }))

    onSubmit(scores, comment)
  }

  const allScoresSelected = scoreConfigs.every(config => selectedScores[config.id] !== undefined)
  const canSubmit = allScoresSelected && !isSubmitting

  // If already completed, show submitted scores
  if (isCompleted) {
    return (
      <div className="space-y-4">
        <div className="p-6 border rounded-xl bg-green-500/5 border-green-500/20">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-2">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium text-green-600">Completed</h3>
            <p className="text-sm text-muted-foreground">
              Scored on{" "}
              {completedAt ? new Date(completedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'an earlier date'}
            </p>
          </div>
        </div>

        {/* Display existing scores */}
        {existingScores && existingScores.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted Scores</h4>
            {existingScores.map((score) => {
              const config = scoreConfigs.find(c => c.id === score.configId || c.name === score.name)

              // Determine display value based on data type
              let displayValue: string | number = score.value ?? score.stringValue ?? 'N/A'

              if (config?.dataType === "CATEGORICAL") {
                // For categorical: prefer stringValue, fallback to finding label from numeric value
                displayValue = score.stringValue
                  || (config.categories?.find(cat => cat.value === score.value)?.label)
                  || score.value
                  || 'N/A'
              } else if (config?.dataType === "BOOLEAN") {
                // For boolean: show Yes/No based on value
                displayValue = score.value === 1 ? "Yes" : score.value === 0 ? "No" : score.stringValue || 'N/A'
              } else {
                // For numeric: show the numeric value
                displayValue = score.value ?? score.stringValue ?? 'N/A'
              }

              return (
                <div key={score.id} className="p-4 border rounded-xl bg-card/50">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{score.name}</span>
                      <span className="text-sm font-bold text-primary">
                        {displayValue}
                      </span>
                    </div>
                    {score.comment && (
                      <p className="text-xs text-muted-foreground italic">{score.comment}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Render score options for a single config
  const renderScoreOptions = (config: ScoreConfig) => {
    const selectedValue = selectedScores[config.id]

    // CATEGORICAL: Show button for each category
    if (config.dataType === "CATEGORICAL" && config.categories && config.categories.length > 0) {
      const gridCols = config.categories.length <= 2 ? "grid-cols-2" : config.categories.length === 3 ? "grid-cols-3" : "grid-cols-2"

      return (
        <div className={cn("grid gap-3", gridCols)}>
          {config.categories.map((category, idx) => {
            // Ensure value is a number
            const categoryValue = typeof category.value === 'number' ? category.value : idx
            const isSelected = selectedValue === categoryValue

            return (
              <Button
                key={`${category.label}-${idx}`}
                variant="outline"
                className={cn(
                  "h-20 flex flex-col gap-2",
                  !isSelected && "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-zinc-100 border-zinc-400 ring-2 ring-zinc-300",
                )}
                onClick={() => handleScoreSelect(config.id, categoryValue)}
                disabled={isSubmitting}
              >
                <span className="text-sm font-medium">{category.label}</span>
              </Button>
            )
          })}
        </div>
      )
    }

    // BOOLEAN: Show Yes/No buttons
    if (config.dataType === "BOOLEAN") {
      return (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className={cn(
              "h-20 flex flex-col gap-2",
              selectedValue !== 1 && "hover:bg-accent hover:text-accent-foreground",
              selectedValue === 1 && "bg-green-100 text-green-900 border-green-300",
            )}
            onClick={() => handleScoreSelect(config.id, 1)}
            disabled={isSubmitting}
          >
            <Check className="h-5 w-5" />
            <span>Yes</span>
          </Button>
          <Button
            variant="outline"
            className={cn(
              "h-20 flex flex-col gap-2",
              selectedValue !== 0 && "hover:bg-accent hover:text-accent-foreground",
              selectedValue === 0 && "bg-red-100 text-red-900 border-red-300",
            )}
            onClick={() => handleScoreSelect(config.id, 0)}
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
            <span>No</span>
          </Button>
        </div>
      )
    }

    // NUMERIC: Show buttons for each value in the range, or number input
    if (config.dataType === "NUMERIC") {
      const hasMinMax = config.minValue !== null && config.minValue !== undefined &&
                        config.maxValue !== null && config.maxValue !== undefined

      if (hasMinMax) {
        const min = config.minValue!
        const max = config.maxValue!
        const range = max - min + 1

        // If range is reasonable (≤10), show buttons for each value
        if (range <= 10) {
          const values = Array.from({ length: range }, (_, i) => min + i)
          // Use explicit Tailwind classes for JIT compiler
          const gridCols = range === 1 ? "grid-cols-1"
                         : range === 2 ? "grid-cols-2"
                         : range === 3 ? "grid-cols-3"
                         : range <= 6 ? "grid-cols-3"
                         : "grid-cols-4"

          return (
            <div className={cn("grid gap-2", gridCols)}>
              {values.map((value) => {
                const isSelected = selectedValue === value
                return (
                  <Button
                    key={value}
                    variant="outline"
                    className={cn(
                      "h-16 flex items-center justify-center",
                      !isSelected && "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-zinc-100 border-zinc-400 ring-2 ring-zinc-300",
                    )}
                    onClick={() => handleScoreSelect(config.id, value)}
                    disabled={isSubmitting}
                  >
                    <span className="text-lg font-bold">{value}</span>
                  </Button>
                )
              })}
            </div>
          )
        }

        // For larger ranges, use a number input
        return (
          <div className="space-y-2">
            <input
              type="number"
              min={min}
              max={max}
              value={selectedValue ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val >= min && val <= max) {
                  handleScoreSelect(config.id, val)
                }
              }}
              placeholder={`Enter value (${min}-${max})`}
              className="w-full h-12 px-4 border rounded-lg bg-background text-center text-lg font-medium"
              disabled={isSubmitting}
            />
          </div>
        )
      }

      // Numeric without min/max - use free number input
      return (
        <div className="space-y-2">
          <input
            type="number"
            value={selectedValue ?? ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val)) {
                handleScoreSelect(config.id, val)
              }
            }}
            placeholder="Enter numeric value"
            className="w-full h-12 px-4 border rounded-lg bg-background text-center text-lg font-medium"
            disabled={isSubmitting}
          />
        </div>
      )
    }

    // Fallback for unknown data types
    return (
      <div className="p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/5">
        <p className="text-xs text-yellow-600">
          Unsupported data type: {config.dataType || 'UNKNOWN'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supported types: NUMERIC, CATEGORICAL, BOOLEAN
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Evaluation</h3>
        <p className="text-sm text-foreground/80">Rate this conversation on all criteria.</p>
      </div>

      {/* Render each score config */}
      <div className="space-y-6">
        {scoreConfigs.map((config) => {
          const isConfigSelected = selectedScores[config.id] !== undefined

          return (
            <div
              key={config.id}
              className={cn(
                "space-y-3 p-4 border rounded-xl bg-card/50 transition-all",
                !isConfigSelected && "border-yellow-500/50 bg-yellow-500/5"
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{config.name}</h4>
                  {!isConfigSelected && (
                    <span className="text-xs text-yellow-600">• Required</span>
                  )}
                  {isConfigSelected && (
                    <span className="text-xs text-green-600">✓</span>
                  )}
                </div>
                {config.description && (
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                )}
              </div>
              {renderScoreOptions(config)}
            </div>
          )
        })}
      </div>

      {/* Comment section */}
      <div className="space-y-2">
        <Label htmlFor="comment" className="text-xs text-muted-foreground">
          Optional Comment
        </Label>
        <Textarea
          id="comment"
          placeholder="Add notes about this interaction..."
          className="resize-none min-h-[100px] bg-background/50"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {/* Submit button */}
      <div className="space-y-2">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-md"
          size="lg"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
              Submitting...
            </span>
          ) : (
            "Submit Evaluation"
          )}
        </Button>
      </div>
    </div>
  )
}
