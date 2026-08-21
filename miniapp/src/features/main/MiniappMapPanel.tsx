import { Button, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { socialApi, type MiniappMapLight } from '../../services/socialApi'
import './MiniappMapPanel.scss'

const spots = [
  ['哈尔滨', '❄️'], ['北京', '🏯'], ['内蒙古', '🌿'], ['乌鲁木齐', '🏔️'],
  ['敦煌', '🌄'], ['拉萨', '🏔️'], ['西安', '🏯'], ['成都', '🐼'],
  ['重庆', '🌶️'], ['武汉', '🌉'], ['杭州', '🌸'], ['上海', '🌃'],
  ['昆明', '🌼'], ['厦门', '🌊'], ['广州', '🌴'], ['三亚', '🏝️'],
] as const

interface MiniappMapPanelProps {
  roomId: string
  onClose(): void
}

export function MiniappMapPanel({ roomId, onClose }: MiniappMapPanelProps) {
  const [lights, setLights] = useState<MiniappMapLight[]>([])
  const [pending, setPending] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void socialApi.listMapLights(roomId)
      .then((result) => { if (!cancelled) setLights(result) })
      .catch(() => { if (!cancelled) setLights([]) })
    return () => { cancelled = true }
  }, [roomId])

  const litIds = new Set(lights.map((item) => item.spotId))
  const confirm = async () => {
    if (pending === null || busy) return
    setBusy(true)
    try {
      const light = await socialApi.lightMapSpot(roomId, pending)
      setLights((current) => current.some((item) => item.spotId === light.spotId) ? current : [...current, light])
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="miniapp-map-panel">
      <View className="miniapp-map-panel__backdrop" onClick={onClose} />
      <View className="miniapp-map-panel__sheet">
        <View className="miniapp-map-panel__handle" />
        <View className="miniapp-map-panel__header">
          <View>
            <Text className="miniapp-map-panel__title">足迹地图</Text>
            <Text className="miniapp-map-panel__caption">点亮一起去过的地方</Text>
          </View>
          <Button className="miniapp-map-panel__close" onClick={onClose}>×</Button>
        </View>
        <Text className="miniapp-map-panel__progress">已点亮 {litIds.size} / {spots.length}</Text>
        <View className="miniapp-map-panel__grid">
          {spots.map(([name, icon], index) => (
            <Button
              key={name}
              className={litIds.has(index + 1) ? 'miniapp-map-panel__spot miniapp-map-panel__spot--lit' : 'miniapp-map-panel__spot'}
              disabled={litIds.has(index + 1)}
              onClick={() => setPending(index + 1)}
            >
              <Text className="miniapp-map-panel__icon">{litIds.has(index + 1) ? '🐾' : icon}</Text>
              <Text>{name}</Text>
            </Button>
          ))}
        </View>
        {pending !== null && (
          <View className="miniapp-map-panel__confirm">
            <Text>点亮「{spots[pending - 1][0]}」的足迹吗？</Text>
            <View>
              <Button onClick={() => setPending(null)}>再想想</Button>
              <Button loading={busy} onClick={() => void confirm()}>点亮</Button>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
