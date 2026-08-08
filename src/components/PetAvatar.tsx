import type { PetMood } from '../domain/types'

interface PetAvatarProps {
  mood: PetMood
  size?: 'small' | 'large'
}

export function PetAvatar({ mood, size = 'large' }: PetAvatarProps) {
  return (
    <div className={`pet-avatar pet-avatar--${size} pet-avatar--${mood}`} aria-label={`小多利当前状态：${mood}`}>
      <img src="/pet/xiaoduoli.png" alt="小多利" draggable={false} />
    </div>
  )
}
