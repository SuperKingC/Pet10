import type { CSSProperties } from 'react'
import { parseAvatarConfig, type AvatarConfig } from '../domain/types'

export interface AvatarUserLike {
  displayName: string
  avatarUrl?: string | null
  avatarConfig?: string | null
}

const SKIN_COLORS: Record<string, string> = {
  cream: '#ffe3c9',
  peach: '#ffd4b8',
  wheat: '#eec39a',
  cocoa: '#c99b72',
  milk: '#fff0e2'
}

/** 分层内联 SVG 捏脸头像：照片优先，其次捏脸配置，兜底字母 */
export function AvatarView({ user, size = 44, className, style }: {
  user: AvatarUserLike
  size?: number
  className?: string
  style?: CSSProperties
}) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', ...style }}
      />
    )
  }
  const config = parseAvatarConfig(user.avatarConfig)
  if (!config) {
    const letter = (user.displayName || '?').trim().slice(0, 1).toUpperCase()
    return (
      <span
        className={className}
        aria-label={user.displayName}
        style={{
          width: size, height: size, borderRadius: '50%', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: '#ffd9a8', color: '#7a4c1f', fontWeight: 700,
          fontSize: Math.round(size * 0.45), ...style
        }}
      >
        {letter}
      </span>
    )
  }
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '50%', flexShrink: 0, display: 'block', ...style }}
      role="img"
      aria-label={user.displayName}
    >
      <AvatarLayers config={config} />
    </svg>
  )
}

export function AvatarLayers({ config }: { config: AvatarConfig }) {
  const skin = SKIN_COLORS[config.skin] ?? config.skin
  return (
    <g>
      <circle cx="60" cy="60" r="58" fill={config.background} />
      {/* 身体 */}
      <ellipse cx="60" cy="112" rx="30" ry="16" fill={skin} />
      {/* 脸型 */}
      {config.face === 'square'
        ? <rect x="30" y="36" width="60" height="58" rx="20" fill={skin} />
        : config.face === 'oval'
          ? <ellipse cx="60" cy="64" rx="26" ry="31" fill={skin} />
          : <ellipse cx="60" cy="64" rx="30" ry="29" fill={skin} />}
      {/* 耳朵 */}
      <circle cx="31" cy="66" r="6" fill={skin} />
      <circle cx="89" cy="66" r="6" fill={skin} />
      {/* 头发 */}
      <Hair kind={config.hair} color={config.hairColor} />
      {/* 眼睛 */}
      <Eyes kind={config.eyes} />
      {/* 腮红 */}
      {config.blush && (
        <g fill="#ff9d9d" opacity="0.65">
          <ellipse cx="40" cy="74" rx="6" ry="3.6" />
          <ellipse cx="80" cy="74" rx="6" ry="3.6" />
        </g>
      )}
      {/* 嘴 */}
      <Mouth kind={config.mouth} />
      {/* 胡子 */}
      <Beard kind={config.beard} />
      {/* 眼镜 */}
      <Glasses kind={config.glasses} />
      {/* 帽子 */}
      <Hat kind={config.hat} />
      {/* 颈饰 */}
      <Neck kind={config.neck} />
      {/* 手持 */}
      <Held kind={config.held} />
    </g>
  )
}

function Hair({ kind, color }: { kind: string; color: string }) {
  switch (kind) {
    case 'bob':
      return <path d="M28 62 C26 30 46 22 60 22 C74 22 94 30 92 62 L84 56 C84 42 74 34 60 34 C46 34 36 42 36 56 Z" fill={color} />
    case 'short':
      return <path d="M30 56 L36 40 L44 48 L52 32 L60 44 L68 32 L76 48 L84 40 L90 56 C82 40 70 34 60 34 C50 34 38 40 30 56 Z" fill={color} />
    case 'twin':
      return (
        <g fill={color}>
          <path d="M30 58 C28 32 46 22 60 22 C74 22 92 32 90 58 L82 52 C82 40 72 34 60 34 C48 34 38 40 38 52 Z" />
          <circle cx="24" cy="52" r="9" />
          <circle cx="96" cy="52" r="9" />
        </g>
      )
    case 'curly':
      return (
        <g fill={color}>
          <circle cx="40" cy="38" r="11" />
          <circle cx="58" cy="30" r="12" />
          <circle cx="76" cy="36" r="11" />
          <circle cx="88" cy="48" r="8" />
          <circle cx="32" cy="48" r="8" />
        </g>
      )
    default:
      // none: 一根呆毛
      return <path d="M58 26 C56 18 62 14 66 16 C60 18 61 22 62 27 Z" fill="#8a6a4f" />
  }
}

function Eyes({ kind }: { kind: string }) {
  const stroke = '#4a3426'
  switch (kind) {
    case 'happy':
      return (
        <g stroke={stroke} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M42 64 Q48 57 54 64" />
          <path d="M66 64 Q72 57 78 64" />
        </g>
      )
    case 'sleepy':
      return (
        <g stroke={stroke} strokeWidth="3" strokeLinecap="round">
          <line x1="42" y1="64" x2="54" y2="64" />
          <line x1="66" y1="64" x2="78" y2="64" />
        </g>
      )
    case 'wink':
      return (
        <g stroke={stroke} strokeWidth="3" strokeLinecap="round" fill={stroke}>
          <circle cx="48" cy="64" r="3.6" stroke="none" />
          <path d="M66 64 Q72 58 78 64" fill="none" />
        </g>
      )
    case 'star':
      return (
        <g fill="#e8a418">
          <text x="42" y="70" fontSize="16">★</text>
          <text x="64" y="70" fontSize="16">★</text>
        </g>
      )
    default:
      return (
        <g fill="#4a3426">
          <circle cx="48" cy="64" r="4" />
          <circle cx="72" cy="64" r="4" />
          <circle cx="49.5" cy="62.5" r="1.3" fill="#fff" />
          <circle cx="73.5" cy="62.5" r="1.3" fill="#fff" />
        </g>
      )
  }
}

function Mouth({ kind }: { kind: string }) {
  const stroke = '#8a4a3a'
  switch (kind) {
    case 'open':
      return <ellipse cx="60" cy="79" rx="5.5" ry="6.5" fill="#c9564a" />
    case 'cat':
      return (
        <path d="M52 78 Q56 83 60 78 Q64 83 68 78" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )
    case 'flat':
      return <line x1="54" y1="79" x2="66" y2="79" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    default:
      return <path d="M52 77 Q60 85 68 77" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round" />
  }
}

function Glasses({ kind }: { kind: string | null }) {
  if (!kind) return null
  if (kind === 'sun') {
    return (
      <g fill="#3a3a3a">
        <rect x="38" y="57" width="19" height="13" rx="6" />
        <rect x="63" y="57" width="19" height="13" rx="6" />
        <line x1="57" y1="62" x2="63" y2="62" stroke="#3a3a3a" strokeWidth="2.5" />
      </g>
    )
  }
  if (kind === 'square') {
    return (
      <g fill="none" stroke="#5a4632" strokeWidth="2.5">
        <rect x="39" y="56" width="18" height="14" rx="4" />
        <rect x="63" y="56" width="18" height="14" rx="4" />
        <line x1="57" y1="62" x2="63" y2="62" />
      </g>
    )
  }
  return (
    <g fill="none" stroke="#5a4632" strokeWidth="2.5">
      <circle cx="48" cy="64" r="9" />
      <circle cx="72" cy="64" r="9" />
      <line x1="57" y1="63" x2="63" y2="63" />
    </g>
  )
}

function Beard({ kind }: { kind: string | null }) {
  if (!kind) return null
  const color = '#7a5a3f'
  if (kind === 'goat') {
    return <path d="M55 86 Q60 96 65 86 Q60 90 55 86" fill={color} />
  }
  return (
    <g stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.8">
      <line x1="44" y1="80" x2="42" y2="84" />
      <line x1="48" y1="83" x2="47" y2="87" />
      <line x1="72" y1="83" x2="73" y2="87" />
      <line x1="76" y1="80" x2="78" y2="84" />
    </g>
  )
}

function Hat({ kind }: { kind: string | null }) {
  if (!kind) return null
  if (kind === 'cap') {
    return (
      <g>
        <path d="M32 44 C34 22 86 22 88 44 Z" fill="#e2635f" />
        <rect x="30" y="42" width="60" height="7" rx="3.5" fill="#c94f4c" />
      </g>
    )
  }
  if (kind === 'beanie') {
    return (
      <g>
        <path d="M32 46 C32 20 88 20 88 46 Z" fill="#7fa8d9" />
        <rect x="30" y="42" width="60" height="9" rx="4.5" fill="#5f8cc4" />
        <circle cx="60" cy="20" r="6" fill="#fff3d6" />
      </g>
    )
  }
  // bow 蝴蝶结
  return (
    <g fill="#f28ba0">
      <path d="M60 26 L44 16 L46 34 Z" />
      <path d="M60 26 L76 16 L74 34 Z" />
      <circle cx="60" cy="26" r="5" fill="#e56d87" />
    </g>
  )
}

function Neck({ kind }: { kind: string | null }) {
  if (!kind) return null
  if (kind === 'scarf') {
    return (
      <g fill="#e8875f">
        <rect x="38" y="92" width="44" height="10" rx="5" />
        <rect x="56" y="96" width="10" height="16" rx="4" />
      </g>
    )
  }
  // bowtie 领结
  return (
    <g fill="#5f8cc4">
      <path d="M60 98 L46 91 L46 105 Z" />
      <path d="M60 98 L74 91 L74 105 Z" />
      <circle cx="60" cy="98" r="4" fill="#456fa3" />
    </g>
  )
}

function Held({ kind }: { kind: string | null }) {
  if (!kind) return null
  if (kind === 'flower') {
    return (
      <g>
        <line x1="98" y1="104" x2="98" y2="88" stroke="#5f9e57" strokeWidth="3" strokeLinecap="round" />
        <g fill="#f6a5c0">
          <circle cx="98" cy="82" r="4.5" />
          <circle cx="92" cy="87" r="4.5" />
          <circle cx="104" cy="87" r="4.5" />
          <circle cx="94" cy="93" r="4.5" />
          <circle cx="102" cy="93" r="4.5" />
        </g>
        <circle cx="98" cy="88" r="3.5" fill="#ffd23e" />
      </g>
    )
  }
  if (kind === 'balloon') {
    return (
      <g>
        <line x1="100" y1="104" x2="100" y2="80" stroke="#b98a67" strokeWidth="1.8" />
        <ellipse cx="100" cy="70" rx="10" ry="12" fill="#f2789f" />
        <ellipse cx="96" cy="66" rx="3" ry="4" fill="#fff" opacity="0.5" />
      </g>
    )
  }
  // candy 棒棒糖
  return (
    <g>
      <line x1="99" y1="104" x2="99" y2="88" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="99" cy="80" r="9" fill="#ff8fa3" />
      <path d="M99 80 m-6 0 a6 6 0 0 1 12 0" stroke="#fff" strokeWidth="2.4" fill="none" />
    </g>
  )
}
