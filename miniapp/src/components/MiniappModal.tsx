import { Image, View } from '@tarojs/components'
import type { ReactNode } from 'react'
import './MiniappModal.scss'

// v2 起去掉外圈、只保留 X 叉本体；同路径图会被工具缓存，换图必须升文件名
const closeIcon = require('../assets/common/modal-close-v2.png')

interface MiniappModalProps {
  children: ReactNode
  onClose(): void
}

export function MiniappModal({ children, onClose }: MiniappModalProps) {
  return (
    <View className="miniapp-modal">
      <View className="miniapp-modal__backdrop" onClick={onClose} />
      <View className="miniapp-modal__panel">
        <Image className="miniapp-modal__close" src={closeIcon} mode="aspectFit" onClick={onClose} />
        {children}
      </View>
    </View>
  )
}
