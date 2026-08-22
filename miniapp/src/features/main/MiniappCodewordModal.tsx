import { useEffect, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import { MiniappModal } from '../../components/MiniappModal'
import { socialApi, type MiniappCodeword } from '../../services/socialApi'
import './MiniappCodewordModal.scss'

interface MiniappCodewordModalProps {
  roomId: string
  onClose(): void
}

export function MiniappCodewordModal({ roomId, onClose }: MiniappCodewordModalProps) {
  const [codeword, setCodeword] = useState<MiniappCodeword | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!roomId) {
      setCodeword(null)
      return
    }
    let cancelled = false
    void socialApi.getCodeword(roomId)
      .then((nextCodeword) => {
        if (!cancelled) setCodeword(nextCodeword)
      })
      .catch(() => {
        if (!cancelled) setCodeword(null)
      })
    return () => {
      cancelled = true
    }
  }, [roomId])

  async function submit() {
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
    <MiniappModal onClose={onClose}>
      <View className="codeword-modal">
        <Text className="codeword-modal__title">每日暗号</Text>
        {!roomId && <Text className="codeword-modal__hint">绑定好友后，就能一起回答每日暗号。</Text>}
        {roomId && !codeword && <Text className="codeword-modal__hint">正在准备今天的问题…</Text>}
        {codeword && (
          <View>
            <Text className="codeword-modal__question">{codeword.question}</Text>
            {codeword.myAnswer ? (
              <Text className="codeword-modal__answer">我的答案：{codeword.myAnswer}</Text>
            ) : (
              <View className="codeword-modal__answer-row">
                <Input
                  value={draft}
                  placeholder="写下你的答案"
                  onInput={(event) => setDraft(event.detail.value)}
                  onConfirm={() => void submit()}
                />
                <Button loading={busy} onClick={() => void submit()}>提交</Button>
              </View>
            )}
            <Text className="codeword-modal__hint">
              {codeword.partnerAnswer ? `TA 的答案：${codeword.partnerAnswer}` : `已有 ${codeword.answeredCount} 人作答`}
            </Text>
          </View>
        )}
      </View>
    </MiniappModal>
  )
}
