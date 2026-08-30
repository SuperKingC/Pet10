import { useEffect, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import { friendApi, type MiniappFriendCandidate } from '../../services/socialCircleApi'
import './MiniappCoRaisePickerModal.scss'

interface MiniappCoRaisePickerModalProps {
  /** 邀请成功（或需要去加好友）后关闭 */
  onClose(): void
  /** 没有好友时引导打开添加好友弹窗 */
  onNeedAddFriend(): void
  /** 邀请发送成功提示 */
  onInvited?(friendName: string): void
}

const ERROR_TEXTS: Record<string, string> = {
  pet_quota_used: '你已经和小多利住在别的小窝啦',
  friend_pet_quota_used: '对方已经在养小多利了',
  already_co_raising: '你们已经在一起养小多利啦',
  relationship_not_found: '好友关系不存在',
  room_forbidden: '这不是你的小窝',
}

// 选择一起养的好友弹窗：从好友列表挑一人发出合养邀请
export function MiniappCoRaisePickerModal({ onClose, onNeedAddFriend, onInvited }: MiniappCoRaisePickerModalProps) {
  const [candidates, setCandidates] = useState<MiniappFriendCandidate[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    void friendApi.listCoRaiseCandidates()
      .then((list) => {
        if (!mounted) return
        setCandidates(list.filter((candidate) => !candidate.coRaising))
        setLoaded(true)
      })
      .catch(() => {
        if (!mounted) return
        setLoaded(true)
      })
    return () => { mounted = false }
  }, [])

  const invite = async (candidate: MiniappFriendCandidate) => {
    if (busyId) return
    setBusyId(candidate.relationshipId)
    setError('')
    try {
      await friendApi.inviteCoRaise(candidate.relationshipId)
      onInvited?.(candidate.friend.displayName)
    } catch (inviteError) {
      const code = inviteError instanceof Error ? inviteError.message : ''
      setError(ERROR_TEXTS[code] ?? '邀请发送失败，请稍后再试')
    } finally {
      setBusyId('')
    }
  }

  return (
    <View className="miniapp-coraise-picker">
      <View className="miniapp-coraise-picker__backdrop" onClick={onClose} />
      <View className="miniapp-coraise-picker__panel">
        <Text className="miniapp-coraise-picker__title">选择一起养的好友</Text>
        <Text className="miniapp-coraise-picker__intro">小多利全世界只有一只，选定后 Ta 会住进你们俩的小窝。</Text>
        {!loaded && <Text className="miniapp-coraise-picker__loading">正在查找好友…</Text>}
        {loaded && candidates.length === 0 && (
          <View className="miniapp-coraise-picker__empty">
            <Text className="miniapp-coraise-picker__empty-text">你还没有好友，先去添加一位吧。</Text>
            <Button
              className="miniapp-coraise-picker__empty-action"
              onClick={() => {
                onClose()
                onNeedAddFriend()
              }}
            >
              去添加好友
            </Button>
          </View>
        )}
        {error ? <Text className="miniapp-coraise-picker__error">{error}</Text> : null}
        {candidates.map((candidate) => (
          <View key={candidate.relationshipId} className="miniapp-coraise-picker__row">
            <View className="miniapp-coraise-picker__avatar">
              {candidate.friend.avatarUrl ? (
                <Image className="miniapp-coraise-picker__avatar-image" src={candidate.friend.avatarUrl} mode="aspectFill" />
              ) : (
                <Text className="miniapp-coraise-picker__avatar-letter">{candidate.friend.displayName.slice(0, 1)}</Text>
              )}
            </View>
            <Text className="miniapp-coraise-picker__name">{candidate.friend.displayName}</Text>
            <Button
              className="miniapp-coraise-picker__invite"
              loading={busyId === candidate.relationshipId}
              disabled={Boolean(busyId)}
              onClick={() => void invite(candidate)}
            >
              邀请
            </Button>
          </View>
        ))}
      </View>
    </View>
  )
}
