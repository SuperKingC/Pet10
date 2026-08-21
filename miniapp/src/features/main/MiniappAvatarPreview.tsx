import { View } from '@tarojs/components'
import type { MiniappAvatarConfig } from '../../domain/avatarConfig'
import './MiniappAvatarPreview.scss'

const skinColors: Record<string, string> = {
  cream: '#ffe3c9',
  peach: '#ffd4b8',
  wheat: '#eec39a',
  cocoa: '#c99b72',
  milk: '#fff0e2',
}

export function MiniappAvatarPreview({ config, compact = false }: { config: MiniappAvatarConfig; compact?: boolean }) {
  return (
    <View
      className={compact ? 'miniapp-avatar miniapp-avatar--compact' : 'miniapp-avatar'}
      style={{ backgroundColor: config.background }}
    >
      <View
        className={`miniapp-avatar__face miniapp-avatar__face--${config.face}`}
        style={{ backgroundColor: skinColors[config.skin] ?? skinColors.cream }}
      >
        {config.hair !== 'none' && (
          <View
            className={`miniapp-avatar__hair miniapp-avatar__hair--${config.hair}`}
            style={{ backgroundColor: config.hairColor }}
          />
        )}
        <View className={`miniapp-avatar__eyes miniapp-avatar__eyes--${config.eyes}`}>
          <View /><View />
        </View>
        {config.blush && <View className="miniapp-avatar__blush"><View /><View /></View>}
        <View className={`miniapp-avatar__mouth miniapp-avatar__mouth--${config.mouth}`} />
        {config.glasses && <View className={`miniapp-avatar__glasses miniapp-avatar__glasses--${config.glasses}`}><View /><View /></View>}
        {config.hat && <View className={`miniapp-avatar__hat miniapp-avatar__hat--${config.hat}`} />}
      </View>
    </View>
  )
}
