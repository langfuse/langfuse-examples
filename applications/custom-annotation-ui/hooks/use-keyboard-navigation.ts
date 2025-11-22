import { useEffect } from "react"

interface UseKeyboardNavigationParams {
  onNext: () => void
  onPrev: () => void
  enabled?: boolean
}

/**
 * Hook to handle keyboard navigation (arrow keys).
 * Ignores key presses when user is typing in input/textarea fields.
 */
export function useKeyboardNavigation({ onNext, onPrev, enabled = true }: UseKeyboardNavigationParams) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger navigation when typing in form fields
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return
      }

      if (e.key === "ArrowRight") onNext()
      if (e.key === "ArrowLeft") onPrev()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onNext, onPrev, enabled])
}
