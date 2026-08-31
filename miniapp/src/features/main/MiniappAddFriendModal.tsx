import { useEffect, useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import { friendApi, type MiniappFriendLookup, type MiniappFriendSuggestion } from '../../services/socialCircleApi'
import { showInfo } from '../../services/feedback'
import { getFriendRequestAction, getSuggestionAction } from './addFriendPresentation'
import './MiniappAddFriendModal.scss'

const petAvatar = require('../../assets/xiaoduoli.png')

interface MiniappAddFriendModalProps {
  onClose(): void
}

const ERROR_TEXTS: Record<string, string> = {
  user_not_found: '没有找到这个 UID，检查一下数字对不对？',
  cannot_add_self: '这是你自己的 UID 呀~',
  relationship_already_exists: '你们已经是好友啦',
}

const SUGGESTION_LIMIT = 4

// 添加好友弹窗（页面根层级渲染）：UID 搜索看信息卡再手动发申请 + 推荐好友 + 微信分享邀请
export function MiniappAddFriendModal({ onClose }: MiniappAddFriendModalProps) {
  const [uidDraft, setUidDraft] = useState('')
  const [searching, setSearching] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')
  const [lookup, setLookup] = useState<MiniappFriendLookup | null>(null)
  const [suggestions, setSuggestions] = useState<MiniappFriendSuggestion[]>([])
  // 本次弹窗内已发过申请的推荐用户（推荐列表刷新不频繁，本地置灰即可）
  const [sentIds, setSentIds] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    void friendApi.listSuggestions()
      .then((list) => {
        if (mounted) setSuggestions(list.slice(0, SUGGESTION_LIMIT))
      })
      .catch(() => undefined)
    return () => { mounted = false }
  }, [])

  // 搜索只查信息不发申请；找到后展示信息卡，由用户点「加好友」再发送
  const submitSearch = async () => {
    const identifier = uidDraft.trim()
    if (!identifier || searching) return
    setSearching(true)
    setError('')
    try {
      const result = await friendApi.lookupUser(identifier)
      setLookup(result)
      setUidDraft('')
    } catch (searchError) {
      setLookup(null)
      const code = searchError instanceof Error ? searchError.message : ''
      setError(ERROR_TEXTS[code] ?? '没有找到这个用户，请稍后再试')
    } finally {
      setSearching(false)
    }
  }

  const sendRequest = async (target: { id: string; uid: string }) => {
    if (requesting) return
    setRequesting(true)
    setError('')
    try {
      await friendApi.sendRequest(target.uid)
      setLookup((current) => (current && current.id === target.id ? { ...current, relation: 'request_sent' } : current))
      setSentIds((current) => (current.includes(target.id) ? current : [...current, target.id]))
      void showInfo('好友申请已发送', 1200)
    } catch (sendError) {
      const code = sendError instanceof Error ? sendError.message : ''
      setError(ERROR_TEXTS[code] ?? '添加失败，请稍后再试')
    } finally {
      setRequesting(false)
    }
  }

  const cardAction = lookup ? getFriendRequestAction(lookup.relation) : null

  const renderAvatar = (user: { displayName: string; avatarUrl?: string | null }, avatarClass: string, letterClass: string) => (
    user.avatarUrl
      ? <Image className={avatarClass} src={user.avatarUrl} mode="aspectFill" />
      : <Text className={letterClass}>{user.displayName.slice(0, 1)}</Text>
  )

  return (
    <View className="miniapp-add-friend">
      <View className="miniapp-add-friend__backdrop" onClick={onClose} />
      <View className="miniapp-add-friend__wrap">
        <Image className="miniapp-add-friend__pet" src={petAvatar} mode="aspectFit" fadeIn={false} />
        <View className="miniapp-add-friend__panel">
          <Text className="miniapp-add-friend__title">添加好友</Text>
          <Text className="miniapp-add-friend__intro">输入对方的 UID 找到 Ta，或从推荐里挑一位新朋友。</Text>
          <View className="miniapp-add-friend__search">
            <Input
              className="miniapp-add-friend__input"
              value={uidDraft}
              type="number"
              maxlength={8}
              confirmType="search"
              placeholder="输入好友 UID"
              placeholderClass="miniapp-add-friend__placeholder"
              onInput={(event) => setUidDraft(event.detail.value)}
              onConfirm={() => void submitSearch()}
            />
            <Button
              className="miniapp-add-friend__search-btn"
              hoverClass="miniapp-add-friend__press"
              hoverStayTime={80}
              loading={searching}
              disabled={searching || !uidDraft.trim()}
              onClick={() => void submitSearch()}
            >
              搜索
            </Button>
          </View>
          {error ? <Text className="miniapp-add-friend__error">{error}</Text> : null}
          {lookup && cardAction && (
            <View className="miniapp-add-friend__card">
              <View className="miniapp-add-friend__card-head">
                <View className="miniapp-add-friend__card-avatar">
                  {renderAvatar(lookup, 'miniapp-add-friend__card-avatar-image', 'miniapp-add-friend__card-avatar-letter')}
                </View>
                <View className="miniapp-add-friend__card-id">
                  <Text className="miniapp-add-friend__card-name">{lookup.displayName}</Text>
                  <Text className="miniapp-add-friend__card-uid">UID {lookup.uid}</Text>
                </View>
              </View>
              <Text className="miniapp-add-friend__card-hint">{cardAction.hint}</Text>
              {cardAction.label ? (
                <Button
                  className="miniapp-add-friend__card-btn"
                  hoverClass="miniapp-add-friend__press"
                  hoverStayTime={80}
                  loading={requesting}
                  disabled={requesting}
                  onClick={() => void sendRequest(lookup)}
                >
                  {cardAction.label}
                </Button>
              ) : null}
            </View>
          )}
          {suggestions.length > 0 && (
            <View className="miniapp-add-friend__recommend">
              <Text className="miniapp-add-friend__section">推荐好友</Text>
              {suggestions.map((suggestion, index) => {
                const action = getSuggestionAction(sentIds.includes(suggestion.id))
                return (
                  <View
                    key={suggestion.id}
                    className="miniapp-add-friend__row"
                    style={`animation-delay:${index * 60}ms`}
                  >
                    <View className="miniapp-add-friend__avatar">
                      {renderAvatar(suggestion, 'miniapp-add-friend__avatar-image', 'miniapp-add-friend__avatar-letter')}
                    </View>
                    <Text className="miniapp-add-friend__name">{suggestion.displayName}</Text>
                    <Button
                      className={action.disabled
                        ? 'miniapp-add-friend__row-btn miniapp-add-friend__row-btn--done'
                        : 'miniapp-add-friend__row-btn'}
                      hoverClass={action.disabled ? '' : 'miniapp-add-friend__press'}
                      hoverStayTime={80}
                      disabled={action.disabled || requesting}
                      onClick={() => void sendRequest(suggestion)}
                    >
                      {action.label}
                    </Button>
                  </View>
                )
              })}
            </View>
          )}
          <Button className="miniapp-add-friend__share" hoverClass="miniapp-add-friend__press" hoverStayTime={80} openType="share">
            邀请微信好友
          </Button>
        </View>
      </View>
    </View>
  )
}
