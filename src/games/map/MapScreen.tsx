import { useCallback, useEffect, useState } from 'react'
import { CHINA_OUTLINE, MAP_SPOT_COUNT, MAP_SPOTS, type MapSpot } from './chinaMap'
import { socialApi } from '../../services/socialApi'
import type { MapLight } from '../../domain/types'

interface MapScreenProps {
  roomId: string
  myUserId: string
  friendNames: Record<string, string>
  /** 外部 map.lit 事件计数，变化时重拉点亮列表 */
  refreshKey: number
  onClose(): void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** 爪印印章（点亮盖章） */
function PawStamp() {
  return (
    <g fill="#e8927c">
      <ellipse cx="0" cy="3.4" rx="7" ry="5.8" />
      <circle cx="-6.2" cy="-3.6" r="2.7" />
      <circle cx="0" cy="-5.8" r="2.7" />
      <circle cx="6.2" cy="-3.6" r="2.7" />
    </g>
  )
}

export function MapScreen({ roomId, myUserId, friendNames, refreshKey, onClose }: MapScreenProps) {
  const [lights, setLights] = useState<MapLight[]>([])
  const [pendingSpot, setPendingSpot] = useState<MapSpot | null>(null)
  const [busy, setBusy] = useState(false)
  const [freshSpotId, setFreshSpotId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    socialApi.listMapLights(roomId)
      .then((list) => { if (!cancelled) setLights(list) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [roomId, refreshKey])

  const litIds = new Set(lights.map((light) => light.spotId))
  const lightBySpot = new Map(lights.map((light) => [light.spotId, light]))

  async function confirmLight() {
    if (!pendingSpot || busy) return
    setBusy(true)
    try {
      const light = await socialApi.lightMapSpot(roomId, pendingSpot.id)
      setLights((current) => current.some((item) => item.spotId === light.spotId)
        ? current
        : [...current, light])
      setFreshSpotId(light.spotId)
      setPendingSpot(null)
      window.setTimeout(() => setFreshSpotId(null), 1600)
    } catch { /* 静默 */ } finally {
      setBusy(false)
    }
  }

  const handleSpotClick = useCallback((spot: MapSpot) => {
    if (!litIds.has(spot.id)) setPendingSpot(spot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lights.length])

  return (
    <div className="map-screen" role="dialog" aria-label="足迹地图">
      <header className="map-screen__header">
        <button className="map-screen__back" onClick={onClose} aria-label="返回">←</button>
        <div>
          <h2>足迹地图</h2>
          <p>已点亮 <strong>{litIds.size}</strong> / {MAP_SPOT_COUNT}，想去的城市盖个爪印吧</p>
        </div>
      </header>

      <div className="map-screen__canvas">
        <svg viewBox="0 0 360 310" className="map-screen__svg" aria-hidden="true">
          <path d={CHINA_OUTLINE} className="map-outline" />
          {MAP_SPOTS.map((spot) => {
            const light = lightBySpot.get(spot.id)
            const labelDy = spot.labelDy ?? 24
            return (
              <g key={spot.id} transform={`translate(${spot.x} ${spot.y})`}>
                {light ? (
                  <g className={`map-spot--lit ${freshSpotId === spot.id ? 'map-spot--fresh' : ''}`}>
                    <PawStamp />
                    <g transform={`translate(0 ${labelDy})`}>
                      <rect x="-30" y="-9" width="60" height="18" rx="9" className="map-label__bg" />
                      <text textAnchor="middle" dominantBaseline="central" className="map-label__text">
                        {spot.name} · {formatDate(light.createdAt)}
                      </text>
                    </g>
                  </g>
                ) : (
                  <g className="map-spot--unlit">
                    <circle r="10" className="map-spot__ring" />
                    <text textAnchor="middle" dominantBaseline="central" fontSize="9">{spot.icon}</text>
                  </g>
                )}
                {/* 透明命中区（未点亮可点击） */}
                {!light && (
                  <circle
                    r="15"
                    fill="transparent"
                    onClick={() => handleSpotClick(spot)}
                    role="button"
                    aria-label={`点亮${spot.name}`}
                  />
                )}
              </g>
            )
          })}
        </svg>
        {litIds.size === MAP_SPOT_COUNT && (
          <p className="map-screen__complete">🐾 16 个爪印全部盖满，你们的足迹连成了一片！</p>
        )}
      </div>

      {pendingSpot && (
        <div className="sheet-overlay" onClick={() => setPendingSpot(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <h3>{pendingSpot.icon} 点亮{pendingSpot.name}？</h3>
            <p className="sheet__hint">点亮后会在这里盖上一个爪印，{friendNames[myUserId] ?? '你'}和 TA 都能看见哦。</p>
            <div className="sheet__actions">
              <button className="sheet__cancel" onClick={() => setPendingSpot(null)}>再想想</button>
              <button className="sheet__confirm" disabled={busy} onClick={() => void confirmLight()}>
                {busy ? '盖章中…' : '点亮！🐾'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
