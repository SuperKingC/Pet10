import { Button, Image, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import type { PetAction } from '../../domain/types'
import type { LaunchContext } from '../../services/launchContextApi'
import type { PetState } from '../../domain/types'
import { PetActionBar } from '../../components/PetActionBar'
import { PetStatusCard } from '../../components/PetStatusCard'
import { MiniappContributionBoard } from './MiniappContributionBoard'
import { socialApi, type MiniappContribution } from '../../services/socialApi'
import './MiniappNestView.scss'

const wardrobe = require('../../assets/nest/wardrobe.png')
const photoWall = require('../../assets/nest/photo-wall.png')
const tasks = require('../../assets/nest/tasks.png')
interface MiniappNestViewProps {
  context: LaunchContext | null
  pet: PetState | null
  roomId: string
  onAction(action: PetAction): void
  onSelectRoom(roomId: string): void
  onOpenMemories(): void
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，小多利蹲在窝边等你'
  if (hour < 11) return '早上好，小多利睡了个懒觉'
  if (hour < 14) return '午后阳光正好，小多利在打盹'
  if (hour < 18) return '下午好，小多利想出去撒欢'
  if (hour < 22) return '晚上好，小多利跑过来讨摸摸'
  return '该休息啦，小多利帮你暖好被窝'
}

export function MiniappNestView({ context, pet, roomId, onAction, onSelectRoom, onOpenMemories }: MiniappNestViewProps) {
  const [contributions, setContributions] = useState<MiniappContribution[]>([])

  useEffect(() => {
    if (!roomId) {
      setContributions([])
      return
    }
    let cancelled = false
    void socialApi.listContributions(roomId)
      .then((result) => { if (!cancelled) setContributions(result) })
      .catch(() => { if (!cancelled) setContributions([]) })
    return () => { cancelled = true }
  }, [roomId])

  const names = Object.fromEntries(
    (context?.rooms ?? []).flatMap((room) => [[room.partner.id, room.partner.displayName] as const]),
  )
  return (
    <View className="miniapp-nest">
      <View className="miniapp-nest__header">
        <Text className="miniapp-nest__title">小窝</Text>
        <Text className="miniapp-nest__greeting">{greeting()}</Text>
      </View>

      {context && context.rooms.length > 0 && (
        <View className="miniapp-nest__rooms">
          {context.rooms.map((room) => (
            <Button
              key={room.id}
              className={room.id === roomId ? 'miniapp-room-chip miniapp-room-chip--active' : 'miniapp-room-chip'}
              onClick={() => onSelectRoom(room.id)}
            >
              {room.partner.displayName} · Lv.{room.pet.level}
            </Button>
          ))}
        </View>
      )}

      {pet ? <PetStatusCard pet={pet} onOpenMemories={onOpenMemories} /> : (
        <View className="miniapp-nest__empty">
          <Text>小多利正在赶来</Text>
          <Text>邀请一位好友，建立属于你们的共同小窝。</Text>
        </View>
      )}

      {pet && <PetActionBar onAction={onAction} />}

      <MiniappContributionBoard contributions={contributions} names={names} />

      <View className="miniapp-nest__shortcuts">
        <View className="miniapp-nest__shortcut">
          <Image src={wardrobe} mode="aspectFit" />
          <Text>衣柜</Text>
        </View>
        <View className="miniapp-nest__shortcut">
          <Image src={photoWall} mode="aspectFit" />
          <Text>照片墙</Text>
        </View>
        <View className="miniapp-nest__shortcut">
          <Image src={tasks} mode="aspectFit" />
          <Text>任务</Text>
        </View>
      </View>
    </View>
  )
}
