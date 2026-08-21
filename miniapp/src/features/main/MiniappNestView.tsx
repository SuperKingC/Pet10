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
const roomBackground = require('../../assets/room-background.webp')
interface MiniappNestViewProps {
  context: LaunchContext | null
  pet: PetState | null
  roomId: string
  onAction(action: PetAction): void
  onSelectRoom(roomId: string): void
  onOpenMemories(): void
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
        <Text className="miniapp-nest__greeting">记录你们和小多利的共同生活。</Text>
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

      <View className="miniapp-nest__scene">
        {pet
          ? <PetStatusCard pet={pet} onOpenMemories={onOpenMemories} />
          : <View className="miniapp-nest__empty" style={{ backgroundImage: `url(${roomBackground})` }} />}

        <View className="miniapp-nest__shortcuts">
          <View className="miniapp-nest__shortcut">
            <Image src={wardrobe} mode="aspectFit" />
          </View>
          <View className="miniapp-nest__shortcut">
            <Image src={photoWall} mode="aspectFit" />
          </View>
          <View className="miniapp-nest__shortcut">
            <Image src={tasks} mode="aspectFit" />
          </View>
        </View>
      </View>

      {pet && <PetActionBar onAction={onAction} />}

      <MiniappContributionBoard contributions={contributions} names={names} />

    </View>
  )
}
