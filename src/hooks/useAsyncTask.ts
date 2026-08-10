import { useCallback, useEffect, useRef, useState } from 'react'
import { toUserError, type AsyncState } from '../services/asyncResult'

const initialState: AsyncState<never> = { status: 'idle', data: null, error: null }

export function useAsyncTask<TArgs extends unknown[], TResult>(
  task: (...args: TArgs) => Promise<TResult>,
  fallbackError = '操作失败'
) {
  const [state, setState] = useState<AsyncState<TResult>>(initialState)
  const taskRef = useRef(task)
  const requestId = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    taskRef.current = task
  }, [task])

  useEffect(() => () => {
    mounted.current = false
  }, [])

  const run = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    const currentRequest = requestId.current + 1
    requestId.current = currentRequest
    setState((current) => ({ status: 'loading', data: current.data, error: null }))
    try {
      const result = await taskRef.current(...args)
      if (mounted.current && requestId.current === currentRequest) {
        setState({ status: 'success', data: result, error: null })
      }
      return result
    } catch (error) {
      if (mounted.current && requestId.current === currentRequest) {
        setState((current) => ({ status: 'error', data: current.data, error: toUserError(error, fallbackError) }))
      }
      return undefined
    }
  }, [fallbackError])

  const reset = useCallback(() => {
    requestId.current += 1
    setState(initialState)
  }, [])

  return { state, run, reset }
}
