import { Button, Text, View } from '@tarojs/components'
import type { MiniappAvatarConfig } from '../../domain/avatarConfig'
import { MiniappAvatarPreview } from './MiniappAvatarPreview'
import './MiniappAvatarEditor.scss'

const skins = ['cream', 'peach', 'wheat', 'cocoa', 'milk']
const skinColors: Record<string, string> = { cream: '#ffe3c9', peach: '#ffd4b8', wheat: '#eec39a', cocoa: '#c99b72', milk: '#fff0e2' }
const hairColors = ['#6b4a2f', '#2e2a28', '#e8b64c', '#c96a4a', '#8f7ad9', '#f28ba0']
const backgrounds = ['#ffe9c7', '#ffd9e0', '#d9ecff', '#ddf3d9', '#f0e2ff', '#fff3c9']

export function MiniappAvatarEditor({ config, busy, onChange, onSave, onClose }: {
  config: MiniappAvatarConfig
  busy: boolean
  onChange(config: MiniappAvatarConfig): void
  onSave(): void
  onClose(): void
}) {
  const patch = (value: Partial<MiniappAvatarConfig>) => onChange({ ...config, ...value })
  return (
    <View className="miniapp-avatar-editor">
      <View className="miniapp-avatar-editor__backdrop" onClick={onClose} />
      <View className="miniapp-avatar-editor__sheet">
        <View className="miniapp-avatar-editor__handle" />
        <View className="miniapp-avatar-editor__preview"><MiniappAvatarPreview config={config} /></View>
        <Text className="miniapp-avatar-editor__title">设计你的 Pet10 头像</Text>
        <View className="miniapp-avatar-editor__section">
          <Text>肤色</Text><View>{skins.map((skin) => <Button key={skin} className={config.skin === skin ? 'active' : ''} style={{ backgroundColor: skinColors[skin] }} onClick={() => patch({ skin })} />)}</View>
        </View>
        <View className="miniapp-avatar-editor__section">
          <Text>发型</Text><View>{['none', 'bob', 'short', 'twin', 'curly'].map((hair) => <Button key={hair} className={config.hair === hair ? 'active text' : 'text'} onClick={() => patch({ hair })}>{hair}</Button>)}</View>
        </View>
        <View className="miniapp-avatar-editor__section">
          <Text>发色</Text><View>{hairColors.map((hairColor) => <Button key={hairColor} className={config.hairColor === hairColor ? 'active' : ''} style={{ backgroundColor: hairColor }} onClick={() => patch({ hairColor })} />)}</View>
        </View>
        <View className="miniapp-avatar-editor__section">
          <Text>眼睛</Text><View>{['round', 'happy', 'sleepy', 'wink', 'star'].map((eyes) => <Button key={eyes} className={config.eyes === eyes ? 'active text' : 'text'} onClick={() => patch({ eyes })}>{eyes}</Button>)}</View>
        </View>
        <View className="miniapp-avatar-editor__section">
          <Text>背景</Text><View>{backgrounds.map((background) => <Button key={background} className={config.background === background ? 'active' : ''} style={{ backgroundColor: background }} onClick={() => patch({ background })} />)}</View>
        </View>
        <View className="miniapp-avatar-editor__actions">
          <Button onClick={onClose}>取消</Button>
          <Button loading={busy} onClick={onSave}>保存头像</Button>
        </View>
      </View>
    </View>
  )
}
