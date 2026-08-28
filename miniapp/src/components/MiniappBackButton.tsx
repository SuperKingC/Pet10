import { View } from '@tarojs/components'
import './MiniappBackButton.scss'

interface MiniappBackButtonProps {
  onClick(): void
}

/** 全小程序统一的返回按钮：无底色的深棕左箭头,仅保留 72rpx 命中区域 */
export function MiniappBackButton({ onClick }: MiniappBackButtonProps) {
  return (
    <View
      className="miniapp-back-button"
      hoverClass="miniapp-back-button--active"
      hoverStayTime={100}
      aria-label="返回"
      onClick={onClick}
    >
      <View className="miniapp-back-button__icon" />
    </View>
  )
}
