import { useEffect, useState } from 'react'
import type { CodewordState, Conversation } from '../domain/types'
import { socialApi } from '../services/socialApi'

interface PawMenuProps {
  open: boolean
  pairRoom?: Conversation
  onClose(): void
  onOpenGame(game: 'tarot' | 'gobang' | 'map'): void
}

export function PawMenu({ open, pairRoom, onClose, onOpenGame }: PawMenuProps) {
  const [codeword, setCodeword] = useState<CodewordState>()
  const [codewordDraft, setCodewordDraft] = useState('')
  const [codewordBusy, setCodewordBusy] = useState(false)
  const roomId = pairRoom?.roomId

  useEffect(() => {
    if (!open || !roomId) {
      setCodeword(undefined)
      return
    }
    let cancelled = false
    void socialApi.getCodeword(roomId)
      .then((nextCodeword) => {
        if (!cancelled) setCodeword(nextCodeword)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open, roomId])

  useEffect(() => {
    if (!open) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  async function submitCodeword() {
    if (!roomId || !codewordDraft.trim() || codewordBusy) return
    setCodewordBusy(true)
    try {
      setCodeword(await socialApi.answerCodeword(roomId, codewordDraft.trim()))
      setCodewordDraft('')
    } finally {
      setCodewordBusy(false)
    }
  }

  function openGame(game: 'tarot' | 'gobang' | 'map') {
    if ((game === 'gobang' || game === 'map') && !pairRoom) return
    onClose()
    onOpenGame(game)
  }

  if (!open) return null

  return (
    <div className="paw-menu-backdrop" role="presentation" onClick={onClose}>
      <section
        className="paw-menu"
        role="dialog"
        aria-modal="true"
        aria-label="狗脚印快捷功能"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="paw-menu__handle" />
        <header className="paw-menu__header">
          <div>
            <h2>一起留下今天的脚印</h2>
            <p>记录、游戏和共同回忆都在这里</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭快捷功能">×</button>
        </header>

        <section className="paw-menu__codeword">
          <h3>每日暗号</h3>
          {!pairRoom && <p className="paw-menu__hint">绑定好友后，就能一起回答每日暗号。</p>}
          {pairRoom && !codeword && <p className="paw-menu__hint">正在准备今天的问题…</p>}
          {codeword && (
            <>
              <p className="codeword-card__question">{codeword.question}</p>
              {codeword.myAnswer ? (
                <p className="codeword-card__mine">我的答案：{codeword.myAnswer}</p>
              ) : (
                <div className="codeword-card__input">
                  <input
                    value={codewordDraft}
                    onChange={(event) => setCodewordDraft(event.target.value)}
                    placeholder="写下你的答案…"
                    onKeyDown={(event) => { if (event.key === 'Enter') void submitCodeword() }}
                  />
                  <button disabled={codewordBusy} onClick={() => void submitCodeword()}>
                    {codewordBusy ? '提交中…' : '提交'}
                  </button>
                </div>
              )}
              {codeword.partnerAnswer
                ? <p className="codeword-card__partner">TA 的答案：{codeword.partnerAnswer}</p>
                : <p className="codeword-card__waiting">{codeword.myAnswer ? '等 TA 也答完，就能互相看到啦…' : `已有 ${codeword.answeredCount} 人作答`}</p>}
            </>
          )}
        </section>

        <div className="paw-menu__grid">
          <button disabled={!pairRoom} onClick={() => openGame('gobang')}>
            <span>⚫</span>
            <strong>游戏</strong>
            <small>{pairRoom ? '和好友下一盘五子棋' : '绑定好友后开启'}</small>
          </button>
          <button disabled={!pairRoom} onClick={() => openGame('map')}>
            <span>🗺️</span>
            <strong>足迹地图</strong>
            <small>{pairRoom ? '点亮一起去过的地方' : '绑定好友后开启'}</small>
          </button>
          <button onClick={() => openGame('tarot')}>
            <span>🔮</span>
            <strong>塔罗占卜</strong>
            <small>问一问今天的心事</small>
          </button>
        </div>
      </section>
    </div>
  )
}
