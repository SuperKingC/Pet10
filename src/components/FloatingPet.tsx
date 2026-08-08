import { useEffect, useRef, useState } from 'react'

interface FloatingPetProps {
  /** 主动说话开关当前值 */
  proactiveEnabled: boolean
  onToggleProactive(enabled: boolean): void
  /** 点击宠物时冒一句话（可选） */
  onPoke?(): string | undefined
}

const STORAGE_KEY = 'pet10_floating_pet_pos'
const PET_REACTIONS = ['汪！', '汪呜～', '蹭蹭～', '(๑>ᴗ<๑)', '尾巴摇成小风扇！', '再摸一下嘛']

/**
 * 可拖拽悬浮小多利：拖动任意位置；点一下有反应；长按 600ms 切换主动说话开关。
 */
export function FloatingPet({ proactiveEnabled, onToggleProactive, onPoke }: FloatingPetProps) {
  const [pos, setPos] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as { x: number; y: number } | null
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved
    } catch { /* 忽略损坏的存储 */ }
    return { x: window.innerWidth - 92, y: window.innerHeight - 220 }
  })
  const [bubble, setBubble] = useState('')
  const [pressed, setPressed] = useState(false)
  const dragState = useRef<{ dragging: boolean; moved: boolean; startX: number; startY: number; originX: number; originY: number; timer: number }>()

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  }, [pos])

  useEffect(() => {
    if (!bubble) return
    const timer = window.setTimeout(() => setBubble(''), 2200)
    return () => window.clearTimeout(timer)
  }, [bubble])

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    dragState.current = {
      dragging: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
      timer: window.setTimeout(() => setPressed(true), 600)
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const state = dragState.current
    if (!state?.dragging) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved && Math.hypot(dx, dy) > 8) {
      state.moved = true
      window.clearTimeout(state.timer)
      setPressed(false)
    }
    if (state.moved) {
      const size = 72
      const nextX = Math.max(4, Math.min(window.innerWidth - size - 4, state.originX + dx))
      const nextY = Math.max(60, Math.min(window.innerHeight - size - 90, state.originY + dy))
      setPos({ x: nextX, y: nextY })
    }
  }

  function handlePointerUp() {
    const state = dragState.current
    if (!state) return
    window.clearTimeout(state.timer)
    const longPressed = state.dragging && !state.moved && pressed
    dragState.current = undefined
    setPressed(false)
    if (longPressed) {
      onToggleProactive(!proactiveEnabled)
      setBubble(proactiveEnabled ? '小多利乖乖闭嘴模式 🤐' : '小多利开启碎碎念模式 🗣️')
      return
    }
    if (!state.moved) {
      const custom = onPoke?.()
      setBubble(custom ?? PET_REACTIONS[Math.floor(Math.random() * PET_REACTIONS.length)])
    }
  }

  return (
    <button
      type="button"
      className={`floating-pet ${pressed ? 'floating-pet--pressed' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        if (dragState.current) window.clearTimeout(dragState.current.timer)
        dragState.current = undefined
        setPressed(false)
      }}
      aria-label={`悬浮小多利（长按切换主动说话，当前${proactiveEnabled ? '开启' : '关闭'}）`}
    >
      {bubble && <span className="floating-pet__bubble">{bubble}</span>}
      <img src="/pet/xiaoduoli-small.jpg" alt="小多利" draggable={false} />
      <span className={`floating-pet__dot ${proactiveEnabled ? 'floating-pet__dot--on' : ''}`} />
    </button>
  )
}
