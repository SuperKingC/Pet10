import { useEffect, useState } from 'react'
import { Button, Input, Image, Text, View } from '@tarojs/components'
import { friendApi, type MiniappFriendCandidate } from '../../services/socialCircleApi'
import { showInfo } from '../../services/feedback'
import './MiniappAddFriendModal.scss'

interface MiniappAddFriendModalProps {
  /** 已接受的好友列表（推荐位；带 coRaising 标记） */
  candidates: MiniappFriendCandidate[]
  onClose(): void
  /** 加好友成功后回调（刷新列表） */
  onFriendAdded?(): void
}

const ERROR_TEXTS: Record<string, string> = {
  user_not_found: '没有找到这个 UID，检查一下数字对不对？',
  cannot_add_self: '这是你自己的 UID 呀~',
  relationship_already_exists: '你们已经是好友啦',
}

// 加好友弹窗：UID 搜索 + 推荐好友 + 微信分享邀请
export function MiniappAddFriendModal({ candidates, onClose, onFriendAdded }: MiniappAddFriendModalProps) {
  const [uidDraft, setUidDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
  }, [uidDraft])

  const submitSearch = async () => {
    const identifier = uidDraft.trim()
    if (!identifier || busy) return
    setBusy(true)
    setError('')
    try {
      await friendApi.sendRequest(identifier)
      setUidDraft('')
      void showInfo('好友申请已发送', 1200)
      onFriendAdded?.()
    } catch (sendError) {
      const code = sendError instanceof Error ? sendError.message : ''
      setError(ERROR_TEXTS[code] ?? '添加失败，请稍后再试')
    } finally {
      setBusy(false)
    }
  }

  const recommended = candidates.slice(0, 5)

  return (
    <View className="miniapp-add-friend">
      <View className="miniapp-add-friend__backdrop" onClick={onClose} />
      <View className="miniapp-add-friend__panel">
        <Text className="miniapp-add-friend__title">添加好友</Text>
        <Text className="miniapp-add-friend__intro">输入对方 UID 直接添加，或把小多利介绍给微信好友。</Text>
        <View className="miniapp-add-friend__search">
          <Input
            className="miniapp-add-friend__input"
            value={uidDraft}
            type="number"
            maxlength={8}
            placeholder="输入好友的 UID（8 位数字）"
            onInput={(event) => setUidDraft(event.detail.value)}
            onConfirm={() => void submitSearch()}
          />
          <Button className="miniapp-add-friend__search-btn" loading={busy} disabled={busy || !uidDraft.trim()} onClick={() => void submitSearch()}>
            搜索
          </Button>
        </View>
        {error ? <Text className="miniapp-add-friend__error">{error}</Text> : null}
        {recommended.length > 0 && (
          <View className="miniapp-add-friend__recommend">
            <Text className="miniapp-add-friend__section">推荐好友</Text>
            {recommended.map((candidate) => (
              <View key={candidate.relationshipId} className="miniapp-add-friend__row">
                <View className="miniapp-add-friend__avatar">
                  {candidate.friend.avatarUrl ? (
                    <Image className="miniapp-add-friend__avatar-image" src={candidate.friend.avatarUrl} mode="aspectFill" />
                  ) : (
                    <Text className="miniapp-add-friend__avatar-letter">{candidate.friend.displayName.slice(0, 1)}</Text>
                  )}
                </View>
                <Text className="miniapp-add-friend__name">{candidate.friend.displayName}</Text>
                <Text className={candidate.coRaising
                  ? 'miniapp-add-friend__state miniapp-add-friend__state--raising'
                  : 'miniapp-add-friend__state'}
                >
                  {candidate.coRaising ? '已共养小多利' : '已加好友'}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Button className="miniapp-add-friend__share" openType="share">
          邀请微信好友
        </Button>
      </View>
    </View>
  )
}
