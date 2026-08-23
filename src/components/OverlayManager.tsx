import { lazy, Suspense, useRef } from 'react'
import { parseAvatarConfig, type AvatarConfig, type Conversation, type Fortune, type UserProfile } from '../domain/types'
import { createMemoryService } from '../services/memoryService'
import type { RoomRuntimeApi } from '../state/useRoomRuntime'
import { formatTarotDownloadTitle } from '../games/tarot/tarotDownloadStatus'
import type { useTarotLauncher } from '../games/tarot/useTarotLauncher'
import { FortuneDetail } from './FortuneDetail'

// 游戏模块（懒加载）
const GobangGame = lazy(() => import('../games/gobang/GobangGame').then((m) => ({ default: m.GobangGame })))
const MapScreen = lazy(() => import('../games/map/MapScreen').then((m) => ({ default: m.MapScreen })))
const TarotGame = lazy(() => import('../games/tarot/TarotGame').then((m) => ({ default: m.TarotGame })))

// 覆盖层（懒加载）
const FeedScreen = lazy(() => import('./FeedScreen').then((m) => ({ default: m.FeedScreen })))
const MbtiTestScreen = lazy(() => import('./MbtiTestScreen').then((m) => ({ default: m.MbtiTestScreen })))
const AvatarStudio = lazy(() => import('./AvatarStudio').then((m) => ({ default: m.AvatarStudio })))
const NotificationCenter = lazy(() => import('./NotificationCenter').then((m) => ({ default: m.NotificationCenter })))
const MemoryPanel = lazy(() => import('./MemoryPanel').then((m) => ({ default: m.MemoryPanel })))

export type Overlay = 'feed' | 'notifications' | 'mbti' | 'memory' | 'tarot' | 'gobang' | 'avatar' | 'map' | null

interface OverlayManagerProps {
  overlay: Overlay
  onClose: () => void
  pairRoom: Conversation | undefined
  profile: UserProfile
  runtime: RoomRuntimeApi
  mapVersion: number
  fortuneDetail: Fortune | undefined
  onFortuneClose: () => void
  onMbtiComplete: (mbti: string) => Promise<void>
  onAvatarSave: (config: AvatarConfig) => Promise<void>
  onStudioPhoto: (file?: File) => Promise<void>
  onShareTarotToChat: (text: string) => Promise<void>
  onNotificationUnreadChange: (count: number) => void
  tarotLauncher: ReturnType<typeof useTarotLauncher>
}

export function OverlayManager({
  overlay, onClose, pairRoom, profile, runtime, mapVersion,
  fortuneDetail, onFortuneClose, onMbtiComplete, onAvatarSave,
  onStudioPhoto, onShareTarotToChat, onNotificationUnreadChange,
  tarotLauncher
}: OverlayManagerProps) {
  const studioUploadRef = useRef<HTMLInputElement>(null)
  const friendNames: Record<string, string> = {
    [profile.id]: profile.displayName,
    ...(pairRoom?.friend ? { [pairRoom.friend.id]: pairRoom.friend.displayName } : {})
  }

  return (
    <>
      {tarotLauncher.load && (
        <section className="tarot-download" role="dialog" aria-modal="true" aria-label="塔罗资源下载">
          <div className="tarot-download__sigil" aria-hidden="true"><span>II</span></div>
          <h2>{tarotLauncher.load.error ? '资源尚未准备好' : formatTarotDownloadTitle(tarotLauncher.load.progress)}</h2>
          <p>{tarotLauncher.load.error ?? '正在准备 22 张牌面与塔罗场景'}</p>
          <div className="tarot-download__bar" aria-label={`下载进度 ${Math.round(tarotLauncher.load.progress * 100)}%`}>
            <span style={{ width: `${tarotLauncher.load.progress * 100}%` }} />
          </div>
          <div className="tarot-download__actions">
            {tarotLauncher.load.error && <button onClick={() => void tarotLauncher.open()}>重新下载</button>}
            <button onClick={tarotLauncher.closeLoad}>关闭</button>
          </div>
        </section>
      )}
      <Suspense>
        {overlay === 'feed' && (
          <FeedScreen
            pairRoom={pairRoom}
            myUserId={profile.id}
            myName={profile.displayName}
            myProfile={profile}
            friendName={pairRoom?.friend?.displayName ?? ''}
            onClose={onClose}
          />
        )}
        {fortuneDetail && <FortuneDetail fortune={fortuneDetail} onClose={onFortuneClose} />}
        {overlay === 'notifications' && (
          <NotificationCenter onClose={onClose} onUnreadChange={onNotificationUnreadChange} />
        )}
        {overlay === 'mbti' && (
          <MbtiTestScreen onComplete={(mbti) => void onMbtiComplete(mbti)} onClose={onClose} />
        )}
        {overlay === 'memory' && pairRoom && (
          <MemoryPanel
            memories={runtime.states[pairRoom.roomId]?.memories ?? []}
            onClose={onClose}
            onRemove={async (memoryId) => {
              const service = createMemoryService(pairRoom.roomId)
              const remaining = await service.removeMemory(runtime.states[pairRoom.roomId]?.memories ?? [], memoryId)
              runtime.patchRoom(pairRoom.roomId, { memories: remaining })
            }}
          />
        )}
        {overlay === 'tarot' && (
          <TarotGame onClose={onClose} onShareToChat={onShareTarotToChat} />
        )}
        {overlay === 'avatar' && (
          <>
            <AvatarStudio
              initialConfig={parseAvatarConfig(profile.avatarConfig)}
              onSave={(config) => void onAvatarSave(config)}
              onUploadPhoto={() => studioUploadRef.current?.click()}
              onClose={onClose}
            />
            <input
              ref={studioUploadRef}
              className="visually-hidden"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                void onStudioPhoto(file)
              }}
            />
          </>
        )}
        {overlay === 'gobang' && pairRoom && (
          <GobangGame
            roomId={pairRoom.roomId}
            myUserId={profile.id}
            friendName={pairRoom.friend?.displayName ?? '好友'}
            friendId={pairRoom.friend?.id}
            getRealtime={runtime.getRealtime}
            onClose={onClose}
          />
        )}
        {overlay === 'map' && pairRoom && (
          <MapScreen
            roomId={pairRoom.roomId}
            myUserId={profile.id}
            friendNames={friendNames}
            refreshKey={mapVersion}
            onClose={onClose}
          />
        )}
      </Suspense>
    </>
  )
}
