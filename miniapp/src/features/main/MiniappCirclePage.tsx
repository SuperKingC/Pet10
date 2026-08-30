import { useEffect, useRef, useState } from 'react'
import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { socialCircleApi, type MiniappCirclePost } from '../../services/socialCircleApi'
import './MiniappCirclePage.scss'

const petAvatar = require('../../assets/xiaoduoli.png')
const emptyPaw = require('../../assets/messages-empty-v2.png')

interface MiniappCirclePageProps {
  /** 返回消息页（关闭圈层） */
  onBack(): void
  /** 打开添加好友弹窗（无动态时的引导） */
  onOpenAddFriend(): void
}

function timeLabel(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const minute = 60 * 1000
  if (diffMs < minute) return '刚刚'
  if (diffMs < 60 * minute) return `${Math.floor(diffMs / minute)} 分钟前`
  if (diffMs < 24 * 60 * minute) return `${Math.floor(diffMs / (60 * minute))} 小时前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 小多利圈：好友和小多利在各个小窝的动态流
export function MiniappCirclePage({ onBack, onOpenAddFriend }: MiniappCirclePageProps) {
  const [posts, setPosts] = useState<MiniappCirclePost[]>([])
  const [loaded, setLoaded] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    void socialCircleApi.listFeed()
      .then((feed) => {
        if (!mountedRef.current) return
        setPosts(feed)
        setLoaded(true)
      })
      .catch(() => {
        if (!mountedRef.current) return
        setLoaded(true)
      })
    return () => { mountedRef.current = false }
  }, [])

  const toggleLike = async (post: MiniappCirclePost) => {
    try {
      const likes = await socialCircleApi.toggleLike(post.id, !post.likes.likedByMe)
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, likes } : item)))
    } catch {
      void 0
    }
  }

  return (
    <View className="miniapp-circle">
      <View className="miniapp-circle__header">
        <MiniappBackButton onClick={onBack} />
        <View className="miniapp-circle__title-box">
          <Text className="miniapp-circle__title">小多利圈</Text>
          <Text className="miniapp-circle__caption">看看大家和小多利的新鲜事</Text>
        </View>
      </View>
      <ScrollView className="miniapp-circle__scroll" scrollY enhanced showScrollbar={false}>
        {!loaded && <Text className="miniapp-circle__loading">正在打开小多利圈…</Text>}
        {loaded && posts.length === 0 && (
          <View className="miniapp-circle__empty">
            <Image className="miniapp-circle__empty-image" src={emptyPaw} mode="widthFix" fadeIn={false} />
            <Text className="miniapp-circle__empty-title">这里还静悄悄的</Text>
            <Text className="miniapp-circle__empty-copy">添加好友、一起养小多利之后，这里就会出现你们的动态。</Text>
            <Button className="miniapp-circle__empty-action" onClick={onOpenAddFriend}>去添加好友</Button>
          </View>
        )}
        {loaded && posts.map((post) => {
          const isPet = post.authorType === 'pet'
          return (
            <View key={post.id} className="miniapp-circle__card">
              <View className="miniapp-circle__card-head">
                <View className={isPet ? 'miniapp-circle__avatar miniapp-circle__avatar--pet' : 'miniapp-circle__avatar'}>
                  <Image
                    className="miniapp-circle__avatar-image"
                    src={isPet ? petAvatar : (post.authorAvatarUrl || petAvatar)}
                    mode="aspectFill"
                    fadeIn={false}
                  />
                </View>
                <View className="miniapp-circle__head-text">
                  <Text className="miniapp-circle__name">{post.authorName}</Text>
                  <Text className="miniapp-circle__meta">{post.roomLabel} · {timeLabel(post.createdAt)}</Text>
                </View>
              </View>
              {post.text ? <Text className="miniapp-circle__text">{post.text}</Text> : null}
              <View className="miniapp-circle__foot">
                <View
                  className={post.likes.likedByMe ? 'miniapp-circle__like miniapp-circle__like--on' : 'miniapp-circle__like'}
                  onClick={() => void toggleLike(post)}
                >
                  <Text className="miniapp-circle__like-icon">{post.likes.likedByMe ? '♥' : '♡'}</Text>
                  {post.likes.count > 0 && <Text className="miniapp-circle__like-count">{post.likes.count}</Text>}
                </View>
              </View>
            </View>
          )
        })}
        <View className="miniapp-circle__bottom-space" />
      </ScrollView>
    </View>
  )
}
