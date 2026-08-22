import { Image, View } from '@tarojs/components'
import type { ReactNode } from 'react'
import './MiniappModal.scss'

const closeIcon = require('../assets/common/modal-close.png')

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
