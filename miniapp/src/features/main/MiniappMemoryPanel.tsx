import { Text, View } from '@tarojs/components'
import { MiniappModal } from '../../components/MiniappModal'
import type { RoomMemory } from '../../services/roomApi'
import './MiniappMemoryPanel.scss'

interface MiniappMemoryPanelProps {
  memories: RoomMemory[]
  busy: boolean
  onClose(): void
  onRemove(memoryId: string): void
}

export function MiniappMemoryPanel({ memories, busy, onClose, onRemove }: MiniappMemoryPanelProps) {
  return (
    <MiniappModal onClose={onClose}>
      <View className="miniapp-memory-panel__header">
          <View>
            <Text className="miniapp-memory-panel__eyebrow">共同记忆</Text>
            <Text className="miniapp-memory-panel__title">小多利记住的事</Text>
          </View>
        </View>
        <Text className="miniapp-memory-panel__intro">这里保存被提炼后的共同事件，不会把所有聊天逐字当作长期记忆。</Text>
        <View className="miniapp-memory-panel__list">
          {memories.length === 0 && <Text className="miniapp-memory-panel__empty">暂时没有长期记忆。</Text>}
          {memories.map((memory) => (
            <View className="miniapp-memory-panel__item" key={memory.id}>
              <Text className="miniapp-memory-panel__mark">✓</Text>
              <Text className="miniapp-memory-panel__text">{memory.text}</Text>
              <Button
                className="miniapp-memory-panel__remove"
                disabled={busy}
                onClick={() => onRemove(memory.id)}
              >
                删除
              </Button>
            </View>
          ))}
        </View>
    </MiniappModal>
  )
}
