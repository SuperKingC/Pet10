import { useEffect, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import { socialApi, type MiniappCodeword } from '../../services/socialApi'
import './MiniappPawMenu.scss'

interface MiniappPawMenuProps {
  open: boolean
  roomId: string
  onClose(): void
  onOpenMap(): void
  onOpenGobang(): void
  onOpenTarot(): void
}

export function MiniappPawMenu({
  open,
  roomId,
  onClose,
  onOpenMap,
  onOpenGobang,
  onOpenTarot,
}: MiniappPawMenuProps) {
  const [codeword, setCodeword] = useState<MiniappCodeword | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !roomId) {
      setCodeword(null)
      return
    }
    void socialApi.getCodeword(roomId).then(setCodeword).catch(() => setCodeword(null))
  }, [open, roomId])

  if (!open) return null

  const answer = async () => {
    if (!roomId || !draft.trim() || busy) return
    setBusy(true)
    try {
      setCodeword(await socialApi.answerCodeword(roomId, draft.trim()))
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="miniapp-paw-menu">
      <View className="miniapp-paw-menu__backdrop" onClick={onClose} />
      <View className="miniapp-paw-menu__sheet">
        <View className="miniapp-paw-menu__handle" />
        <View className="miniapp-paw-menu__header">
          <View>
            <Text className="miniapp-paw-menu__title">一起留下今天的脚印</Text>
            <Text className="miniapp-paw-menu__caption">记录、游戏和共同回忆都在这里</Text>
          </View>
          <Button className="miniapp-paw-menu__close" onClick={onClose}>×</Button>
        </View>
        <View className="miniapp-paw-menu__codeword">
          <Text className="miniapp-paw-menu__section-title">每日暗号</Text>
          {!roomId && <Text className="miniapp-paw-menu__hint">绑定好友后，就能一起回答每日暗号。</Text>}
          {roomId && !codeword && <Text className="miniapp-paw-menu__hint">正在准备今天的问题…</Text>}
          {codeword && <View>
            <Text className="miniapp-paw-menu__question">{codeword.question}</Text>
            {codeword.myAnswer ? (
              <Text className="miniapp-paw-menu__answer">我的答案：{codeword.myAnswer}</Text>
            ) : (
              <View className="miniapp-paw-menu__answer-row">
                <Input value={draft} placeholder="写下你的答案" onInput={(event) => setDraft(event.detail.value)} onConfirm={answer} />
                <Button loading={busy} onClick={answer}>提交</Button>
              </View>
            )}
            <Text className="miniapp-paw-menu__hint">
              {codeword.partnerAnswer ? `TA 的答案：${codeword.partnerAnswer}` : `已有 ${codeword.answeredCount} 人作答`}
            </Text>
          </View>}
        </View>
        <View className="miniapp-paw-menu__grid">
          <Button disabled={!roomId} onClick={onOpenGobang}>
            <Text>游戏</Text>
            <Text>和好友下一盘五子棋</Text>
          </Button>
          <Button disabled={!roomId} onClick={onOpenMap}>
            <Text>足迹地图</Text>
            <Text>点亮一起去过的地方</Text>
          </Button>
          <Button onClick={onOpenTarot}>
            <Text>塔罗占卜</Text>
            <Text>问一问今天的心事</Text>
          </Button>
        </View>
      </View>
    </View>
  )
}
