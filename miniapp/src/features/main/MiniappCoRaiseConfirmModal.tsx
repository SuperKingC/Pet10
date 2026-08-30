import { Button, Image, Text, View } from '@tarojs/components'
import './MiniappCoRaiseConfirmModal.scss'

interface MiniappCoRaiseConfirmModalProps {
  friendName: string
  petAvatarSource: string
  busy: boolean
  onCancel(): void
  onConfirm(): void
}

// 确认合养弹窗（页面根层级渲染，盖过 tab 栏）：小多利只能与唯一好友共养
export function MiniappCoRaiseConfirmModal({ friendName, petAvatarSource, busy, onCancel, onConfirm }: MiniappCoRaiseConfirmModalProps) {
  return (
    <View className="miniapp-confirm-overlay">
      <View className="miniapp-confirm-wrap">
        <Image className="miniapp-confirm-pet" src={petAvatarSource} mode="aspectFit" fadeIn={false} />
        <View className="miniapp-confirm-panel">
          <Text className="miniapp-confirm-title">和 {friendName} 一起养小多利？</Text>
          <Text className="miniapp-confirm-copy">小多利全世界只有一只，只能与唯一的一位好友共养哦。确认选择和 Ta 一起养了吗？</Text>
          <View className="miniapp-confirm-actions">
            <Button className="miniapp-confirm-cancel" disabled={busy} onClick={onCancel}>
              再想想
            </Button>
            <Button className="miniapp-confirm-ok" loading={busy} disabled={busy} onClick={onConfirm}>
              确认
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}
