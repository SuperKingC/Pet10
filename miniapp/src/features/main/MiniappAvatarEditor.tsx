import { Button, Text, View } from '@tarojs/components'
import type { MiniappAvatarConfig } from '../../domain/avatarConfig'
import { MiniappModal } from '../../components/MiniappModal'
import { MiniappAvatarPreview } from './MiniappAvatarPreview'
import { avatarBackgroundOptions, avatarEyeOptions, avatarHairColorOptions, avatarHairOptions, avatarSkinOptions } from './avatarEditorOptions'
import './MiniappAvatarEditor.scss'

export function MiniappAvatarEditor({ config, busy, onChange, onSave, onClose }: {
  config: MiniappAvatarConfig
  busy: boolean
  onChange(config: MiniappAvatarConfig): void
  onSave(): void
  onClose(): void
}) {
  const patch = (value: Partial<MiniappAvatarConfig>) => onChange({ ...config, ...value })
  return (
    <MiniappModal onClose={onClose}>
      <View className="miniapp-avatar-editor__preview"><MiniappAvatarPreview config={config} /></View>
        <Text className="miniapp-avatar-editor__title">设计你的 Pet10 头像</Text>
        <View className="miniapp-avatar-editor__section">
          <Text>肤色</Text><View>{avatarSkinOptions.map((option) => <Button key={option.value} className={config.skin === option.value ? 'active text' : 'text'} style={{ backgroundColor: option.color }} onClick={() => patch({ skin: option.value })}>{option.label}</Button>)}</View>
        </View>
        <View className="miniapp-avatar-editor__section">
          <Text>发型</Text><View>{avatarHairOptions.map((option) => <Button key={option.value} className={config.hair === option.value ? 'active text' : 'text'} onClick={() => patch({ hair: option.value })}>{option.label}</Button>)}</View>
        </View>
        <View className="miniapp-avatar-editor__section">
          <Text>发色</Text><View>{avatarHairColorOptions.map((hairColor) => <Button key={hairColor} className={config.hairColor === hairColor ? 'active' : ''} style={{ backgroundColor: hairColor }} onClick={() => patch({ hairColor })} />)}</View>
        </View>
        <View className="miniapp-avatar-editor__section">
          <Text>眼睛</Text><View>{avatarEyeOptions.map((option) => <Button key={option.value} className={config.eyes === option.value ? 'active text' : 'text'} onClick={() => patch({ eyes: option.value })}>{option.label}</Button>)}</View>
        </View>
        <View className="miniapp-avatar-editor__section">
          <Text>背景</Text><View>{avatarBackgroundOptions.map((option) => <Button key={option.value} className={config.background === option.value ? 'active text' : 'text'} style={{ backgroundColor: option.color }} onClick={() => patch({ background: option.value })}>{option.label}</Button>)}</View>
        </View>
        <View className="miniapp-avatar-editor__actions">
          <Button onClick={onClose}>取消</Button>
          <Button loading={busy} onClick={onSave}>保存头像</Button>
        </View>
    </MiniappModal>
  )
}
