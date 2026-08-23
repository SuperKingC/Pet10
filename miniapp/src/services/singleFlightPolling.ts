export type PollingTask = (isCurrent: () => boolean) => Promise<void>

export function startSingleFlightPolling(task: PollingTask, intervalMs: number): () => void {
  let active = true
  let timer: ReturnType<typeof setTimeout> | undefined
  const isCurrent = () => active

  const run = async () => {
    try {
      await task(isCurrent)
    } catch {
      // Polling tasks surface their own user-facing errors and continue retrying.
    }
    if (active) timer = setTimeout(() => void run(), intervalMs)
  }

  void run()
  return () => {
    if (!active) return
    active = false
    if (timer !== undefined) clearTimeout(timer)
  }
}
