import { AvatarView, type AvatarUserLike } from './AvatarView'

interface MentionOption {
  key: string
  label: string
  avatar: string | null
  isPet?: boolean
  /** 非宠物用户传完整资料，渲染捏脸头像 */
  user?: AvatarUserLike
}

interface MentionPickerProps {
  options: MentionOption[]
  onPick(option: MentionOption): void
  onClose(): void
}

/** 输入 @ 后弹出的提及选择器（好友 + 小多利） */
export function MentionPicker({ options, onPick, onClose }: MentionPickerProps) {
  return (
    <div className="mention-picker" role="listbox" aria-label="选择要提及的人">
      <div className="mention-picker__backdrop" onClick={onClose} />
      <div className="mention-picker__panel">
        {options.map((option) => (
          <button key={option.key} className="mention-picker__item" onClick={() => onPick(option)}>
            {option.user
              ? <AvatarView user={option.user} size={32} style={{ width: 32, height: 32, borderRadius: 12 }} />
              : option.avatar
                ? option.avatar.startsWith('/') || option.avatar.startsWith('http')
                  ? <img className={option.isPet ? 'img-multiply' : undefined} src={option.avatar} alt="" />
                  : <span className="mention-picker__letter">{option.avatar}</span>
                : <span className="mention-picker__letter">🐶</span>}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export type { MentionOption }
