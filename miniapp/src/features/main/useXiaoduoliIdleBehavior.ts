import { useEffect, useState } from 'react'
import {
  createXiaoduoliRng,
  hashXiaoduoliSeed,
  nextXiaoduoliStep,
  type XiaoduoliBehaviorStep,
  type XiaoduoliBodyAction,
  type XiaoduoliFaceAction,
} from '../../domain/xiaoduoliBehavior'

export type XiaoduoliIdleBehavior = {
  face: XiaoduoliFaceAction | null
  body: XiaoduoliBodyAction | null
}

// 待机随机行为调度：active 时按领域时间线循环触发表情与肢体，inactive 时清空并停表
export function useXiaoduoliIdleBehavior(params: { active: boolean; seed: string }): XiaoduoliIdleBehavior {
  const { active, seed } = params
  const [step, setStep] = useState<XiaoduoliBehaviorStep | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!active) {
      setStep(null)
      setPlaying(false)
      return undefined
    }
    // 领域时间线只对种子负责；混入一次性随机量让每次进入页面表演不同
    const random = createXiaoduoliRng(
      (hashXiaoduoliSeed(seed || 'xiaoduoli') ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0,
    )
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const scheduleNext = () => {
      const next = nextXiaoduoliStep(random)
      timer = setTimeout(() => {
        if (stopped) return
        setStep(next)
        setPlaying(true)
        timer = setTimeout(() => {
          if (stopped) return
          setPlaying(false)
          scheduleNext()
        }, next.durationMs)
      }, next.delayMs)
    }
    scheduleNext()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [active, seed])

  if (!playing || !step) return { face: null, body: null }
  return { face: step.face, body: step.body }
}
