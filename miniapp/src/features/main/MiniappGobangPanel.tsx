import { Button, Image, Text, View } from '@tarojs/components'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { useEffect, useMemo, useState } from 'react'
import { gobangApi, type GobangGameState, type GobangInvitation } from '../../services/gobangApi'
import { applyAiMove, applySoloMove, createSoloGame, SOLO_BOARD_SIZE, type SoloGame } from '../../domain/gobangSolo'
import { startSingleFlightPolling } from '../../services/singleFlightPolling'
import './MiniappGobangPanel.scss'

const boardCells = Array.from({ length: 225 }, (_, index) => ({ x: index % 15, y: Math.floor(index / 15) }))
const starCells = new Set(['3,3', '11,3', '7,7', '3,11', '11,11'])
const xiaoduoliImage = require('../../assets/xiaoduoli.webp')
const gobangIcon = require('../../assets/navigation/gobang.webp')

type GobangMode = 'select' | 'solo' | 'friend'
type StoneColor = 'black' | 'white'

function PlayerPlate({ name, avatarUrl, mascot = false, stone, active, side }: {
  name: string
  avatarUrl?: string | null
  mascot?: boolean
  stone: StoneColor
  active: boolean
  side: 'left' | 'right'
}) {
  return (
    <View className={`miniapp-gobang__player miniapp-gobang__player--${side}${active ? ' miniapp-gobang__player--active' : ''}`}>
      <View className="miniapp-gobang__player-avatar">
        <View className="miniapp-gobang__player-imgwrap">
          {mascot || avatarUrl ? (
            <Image
              className={`miniapp-gobang__player-img${mascot ? ' miniapp-gobang__player-img--mascot' : ''}`}
              src={mascot ? xiaoduoliImage : avatarUrl || ''}
              mode={mascot ? 'aspectFit' : 'aspectFill'}
              fadeIn={false}
            />
          ) : (
            <Text className="miniapp-gobang__player-fallback">{name.slice(0, 1) || '友'}</Text>
          )}
        </View>
        <View className={`miniapp-gobang__player-stone miniapp-gobang__player-stone--${stone}`} />
      </View>
      <Text className="miniapp-gobang__player-name">{name}</Text>
      <Text className="miniapp-gobang__player-color">{stone === 'black' ? '黑棋' : '白棋'}</Text>
    </View>
  )
}

function BoardView({ stoneAt, lastMoveKey, onCell }: {
  stoneAt(x: number, y: number): StoneColor | null
  lastMoveKey?: string | null
  onCell(x: number, y: number): void
}) {
  return (
    <View className="miniapp-gobang__board">
      {boardCells.map(({ x, y }) => {
        const stone = stoneAt(x, y)
        const isStar = starCells.has(`${x},${y}`)
        return (
          <View
            key={`${x}-${y}`}
            className={`miniapp-gobang__cell${isStar ? ' miniapp-gobang__cell--star' : ''}`}
            onClick={() => onCell(x, y)}
          >
            {stone && (
              <View
                className={`miniapp-gobang__stone miniapp-gobang__stone--${stone}${lastMoveKey === `${x},${y}` ? ' miniapp-gobang__stone--last' : ''}`}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

export function MiniappGobangPanel({ roomId, myUserId, myAvatarUrl, friendId, friendAvatarUrl, friendName, onClose }: {
  roomId: string
  myUserId: string
  myAvatarUrl?: string | null
  friendId: string
  friendAvatarUrl?: string | null
  friendName: string
  onClose(): void
}) {
  const [mode, setMode] = useState<GobangMode>('select')
  const [soloGame, setSoloGame] = useState<SoloGame | null>(null)
  const [game, setGame] = useState<GobangGameState | null>(null)
  const [invitations, setInvitations] = useState<GobangInvitation[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const refresh = async (isCurrent: () => boolean = () => true) => {
    try {
      const state = await gobangApi.getState()
      if (!isCurrent()) return
      setGame(state.game)
      setInvitations(state.invitations.filter((invitation) => invitation.roomId === roomId))
    } catch {
      if (!isCurrent()) return
      setNotice('棋局同步失败，正在重试')
    }
  }

  useEffect(() => {
    if (mode !== 'friend') return
    return startSingleFlightPolling(refresh, 2000)
  }, [roomId, mode])

  const stones = useMemo(() => new Map(game?.moves.map((move) => [`${move.x},${move.y}`, move.color]) ?? []), [game])
  const myColor = game?.blackUserId === myUserId ? 'black' : game?.whiteUserId === myUserId ? 'white' : null
  const friendColor: StoneColor = myColor === 'white' ? 'black' : 'white'
  const myTurn = Boolean(game && myColor === game.turn)
  const lastFriendMove = game && game.moves.length ? game.moves[game.moves.length - 1] : null

  const invite = async () => {
    if (busy) return
    setBusy(true)
    try {
      await gobangApi.invite(friendId, roomId)
      setNotice(`已邀请 ${friendName}，等待对方接受`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '邀请失败')
    } finally {
      setBusy(false)
    }
  }

  const accept = async (inviteId: string) => {
    setBusy(true)
    try {
      setGame(await gobangApi.accept(inviteId))
      setInvitations([])
      setNotice('')
    } finally {
      setBusy(false)
    }
  }

  const move = async (x: number, y: number) => {
    if (!game || !myTurn || stones.has(`${x},${y}`) || busy) return
    setBusy(true)
    try {
      await gobangApi.move(game.id, x, y)
      await refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '落子失败')
    } finally {
      setBusy(false)
    }
  }

  const playSoloStone = (x: number, y: number) => {
    if (!soloGame || soloGame.status !== 'playing' || soloGame.turn !== 'player') return
    const afterPlayer = applySoloMove(soloGame, x, y)
    if (afterPlayer === soloGame) return
    setSoloGame(afterPlayer.status === 'playing' ? applyAiMove(afterPlayer) : afterPlayer)
  }

  const subtitle = mode === 'solo'
    ? '单人练习 · 和小多利下'
    : mode === 'friend' ? `和 ${friendName} 实时对弈` : '选一种玩法'

  const soloStatus = soloGame
    ? soloGame.status === 'finished'
      ? soloGame.winner === 'player' ? '你赢啦！🏆' : soloGame.winner === 'ai' ? '小多利获胜' : '平局'
      : '轮到你落子（黑棋）'
    : ''

  return (
    <View className="miniapp-gobang">
      <View className="miniapp-gobang__header">
        <MiniappBackButton onClick={mode === 'select' ? onClose : () => setMode('select')} />
        <View className="miniapp-gobang__heading">
          <Text className="miniapp-gobang__heading-title">五子棋</Text>
          <Text className="miniapp-gobang__heading-subtitle">{subtitle}</Text>
        </View>
      </View>

      {mode === 'select' && (
        <View className="miniapp-gobang__modes">
          <View className="miniapp-gobang__hero">
            <View className="miniapp-gobang__hero-copy">
              <Text className="miniapp-gobang__hero-title">连成五子，赢下这一局</Text>
              <Text className="miniapp-gobang__hero-caption">黑先白后，先连五子者胜</Text>
            </View>
            <Image className="miniapp-gobang__hero-puppy" src={xiaoduoliImage} mode="aspectFit" fadeIn={false} />
            <View className="miniapp-gobang__hero-stone miniapp-gobang__hero-stone--black" />
            <View className="miniapp-gobang__hero-stone miniapp-gobang__hero-stone--white" />
          </View>
          <Button className="miniapp-gobang__mode" onClick={() => { setSoloGame(createSoloGame()); setMode('solo') }}>
            <View className="miniapp-gobang__mode-icon">
              <Image className="miniapp-gobang__mode-icon-img" src={xiaoduoliImage} mode="aspectFit" fadeIn={false} />
            </View>
            <View className="miniapp-gobang__mode-info">
              <Text className="miniapp-gobang__mode-title">单人练习</Text>
              <Text className="miniapp-gobang__mode-caption">和小多利下一盘</Text>
            </View>
            <Text className="miniapp-gobang__mode-arrow">›</Text>
          </Button>
          <Button
            className="miniapp-gobang__mode"
            disabled={!roomId || !friendId}
            onClick={() => { setNotice(''); setMode('friend') }}
          >
            <View className="miniapp-gobang__mode-icon">
              <Image className="miniapp-gobang__mode-icon-img" src={gobangIcon} mode="aspectFit" fadeIn={false} />
            </View>
            <View className="miniapp-gobang__mode-info">
              <Text className="miniapp-gobang__mode-title">好友对战</Text>
              <Text className="miniapp-gobang__mode-caption">{roomId && friendId ? '邀请好友实时对弈' : '绑定好友后可邀请对战'}</Text>
            </View>
            <Text className="miniapp-gobang__mode-arrow">›</Text>
          </Button>
        </View>
      )}

      {mode === 'solo' && soloGame && (
        <View className="miniapp-gobang__arena">
          <View className="miniapp-gobang__versus">
            <PlayerPlate
              name="你"
              avatarUrl={myAvatarUrl}
              stone="black"
              active={soloGame.status === 'playing' && soloGame.turn === 'player'}
              side="left"
            />
            <View className="miniapp-gobang__vs"><Text>VS</Text></View>
            <PlayerPlate
              name="小多利"
              mascot
              stone="white"
              active={soloGame.status === 'playing' && soloGame.turn === 'ai'}
              side="right"
            />
          </View>
          <Text className="miniapp-gobang__status">{soloStatus}</Text>
          <BoardView
            stoneAt={(x, y) => {
              const stone = soloGame.board[y * SOLO_BOARD_SIZE + x]
              return stone === 0 ? null : stone === 1 ? 'black' : 'white'
            }}
            onCell={playSoloStone}
          />
          {soloGame.status === 'finished' && (
            <Button className="miniapp-gobang__primary" onClick={() => setSoloGame(createSoloGame())}>再来一局</Button>
          )}
        </View>
      )}

      {mode === 'friend' && (
        <>
          {invitations.map((invitation) => (
            <View className="miniapp-gobang__invite" key={invitation.inviteId}>
              <Text>{friendName} 邀请你下一局五子棋</Text>
              <View className="miniapp-gobang__invite-actions">
                <Button className="miniapp-gobang__resign" onClick={() => void gobangApi.decline(invitation.inviteId).then(refresh)}>暂不加入</Button>
                <Button className="miniapp-gobang__primary" loading={busy} onClick={() => void accept(invitation.inviteId)}>接受</Button>
              </View>
            </View>
          ))}
          {!game ? (
            <View className="miniapp-gobang__idle">
              <View className="miniapp-gobang__mode-icon">
                <Image className="miniapp-gobang__mode-icon-img" src={gobangIcon} mode="aspectFit" fadeIn={false} />
              </View>
              <Text>双方进入小程序后即可通过轮询同步棋局。</Text>
              <Button className="miniapp-gobang__primary" loading={busy} onClick={() => void invite()}>邀请对弈</Button>
              {notice && <Text className="miniapp-gobang__notice">{notice}</Text>}
            </View>
          ) : (
            <View className="miniapp-gobang__arena">
              <View className="miniapp-gobang__versus">
                <PlayerPlate
                  name="你"
                  avatarUrl={myAvatarUrl}
                  stone={myColor ?? 'black'}
                  active={Boolean(game && game.status === 'playing' && myTurn)}
                  side="left"
                />
                <View className="miniapp-gobang__vs"><Text>VS</Text></View>
                <PlayerPlate
                  name={friendName}
                  avatarUrl={friendAvatarUrl}
                  stone={friendColor}
                  active={Boolean(game && game.status === 'playing' && !myTurn)}
                  side="right"
                />
              </View>
              <Text className="miniapp-gobang__status">
                {game.status === 'finished'
                  ? game.winnerUserId === myUserId ? '你赢啦！🏆' : game.winnerUserId ? `${friendName} 获胜` : '棋局结束'
                  : myTurn ? `轮到你落子（${myColor === 'black' ? '黑棋' : '白棋'}）` : `等待 ${friendName} 落子`}
              </Text>
              <BoardView
                stoneAt={(x, y) => stones.get(`${x},${y}`) ?? null}
                lastMoveKey={lastFriendMove ? `${lastFriendMove.x},${lastFriendMove.y}` : null}
                onCell={(x, y) => void move(x, y)}
              />
              {game.status === 'playing' && <Button className="miniapp-gobang__resign" onClick={() => void gobangApi.resign(game.id).then(refresh)}>认输并结束</Button>}
              {game.status === 'finished' && <Button className="miniapp-gobang__primary" onClick={() => { setGame(null); void invite() }}>再来一局</Button>}
              {notice && <Text className="miniapp-gobang__notice">{notice}</Text>}
            </View>
          )}
        </>
      )}
    </View>
  )
}
