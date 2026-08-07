import type { PetMemory } from '../domain/types'

interface MemoryPanelProps {
  memories: PetMemory[]
  onClose: () => void
  onRemove: (id: string) => void
}

export function MemoryPanel({ memories, onClose, onRemove }: MemoryPanelProps) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="memory-sheet" role="dialog" aria-modal="true" aria-label="小多利的共同记忆" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <header>
          <div>
            <span className="eyebrow">共同记忆</span>
            <h2>小多利记住的事</h2>
          </div>
          <button onClick={onClose} aria-label="关闭">×</button>
        </header>
        <p className="memory-intro">这里保存提炼后的共同事件，不会把所有聊天逐字当作长期记忆。</p>
        <div className="memory-list">
          {memories.length === 0 && <div className="empty-state">暂时没有长期记忆。</div>}
          {memories.map((memory) => (
            <article key={memory.id}>
              <span>✨</span>
              <p>{memory.text}</p>
              <button onClick={() => onRemove(memory.id)}>删除</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
