import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { useAsyncTask } from './useAsyncTask'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Harness({
  task,
  onValue,
}: {
  task: () => Promise<string>
  onValue(value: ReturnType<typeof useAsyncTask<[], string>>): void
}) {
  onValue(useAsyncTask(task, '加载失败'))
  return null
}

describe('useAsyncTask', () => {
  it('moves through loading, success, error, and reset states', async () => {
    let resolveTask!: (value: string) => void
    const task = () => new Promise<string>((resolve) => { resolveTask = resolve })
    let current!: ReturnType<typeof useAsyncTask<[], string>>
    const root = createRoot(document.createElement('div'))

    act(() => root.render(<Harness task={task} onValue={(value) => { current = value }} />))
    expect(current.state.status).toBe('idle')

    let pending!: Promise<string | undefined>
    act(() => { pending = current.run() })
    expect(current.state.status).toBe('loading')
    await act(async () => {
      resolveTask('done')
      await pending
    })
    expect(current.state).toEqual({ status: 'success', data: 'done', error: null })

    act(() => current.reset())
    expect(current.state.status).toBe('idle')
    act(() => root.unmount())
  })
})
