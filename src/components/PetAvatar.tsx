import type { PetMood } from '../domain/types'

interface PetAvatarProps {
  mood: PetMood
  size?: 'small' | 'large'
}

export function PetAvatar({ mood, size = 'large' }: PetAvatarProps) {
  return (
    <div className={`pet-avatar pet-avatar--${size} pet-avatar--${mood}`} aria-label={`小多利当前状态：${mood}`}>
      <svg viewBox="0 0 260 270" role="img" aria-hidden="true">
        <ellipse className="pet-shadow" cx="130" cy="254" rx="73" ry="13" />
        <path className="pet-ear" d="M61 108C24 96 27 45 59 45c23 0 32 22 24 58z" />
        <path className="pet-ear" d="M199 108c37-12 34-63 2-63-23 0-32 22-24 58z" />
        <path className="pet-head" d="M45 120c2-62 46-93 85-93s83 31 85 93c1 49-25 75-85 75s-86-26-85-75z" />
        <path className="pet-highlight" d="M72 111c13-41 37-67 58-73 21 6 45 32 58 73-28-17-88-17-116 0z" />
        <path className="pet-muzzle" d="M71 122c23-17 95-17 118 0 6 48-22 65-59 68-37-3-65-20-59-68z" />
        <g className="pet-eyes">
          <ellipse className="eye-white" cx="91" cy="117" rx="24" ry="28" />
          <ellipse className="eye-white" cx="169" cy="117" rx="24" ry="28" />
          <ellipse className="eye" cx="93" cy="121" rx="15" ry="20" />
          <ellipse className="eye" cx="167" cy="121" rx="15" ry="20" />
          <circle className="eye-shine" cx="88" cy="113" r="5" />
          <circle className="eye-shine" cx="162" cy="113" r="5" />
        </g>
        <g className="pet-sleep-eyes">
          <path d="M73 119q18 16 36 0M151 119q18 16 36 0" />
        </g>
        <ellipse className="pet-nose" cx="130" cy="155" rx="22" ry="14" />
        <path className="pet-smile" d="M104 171q26 21 52 0" />
        <path className="pet-tongue" d="M116 180q14 33 28 0z" />
        <circle className="pet-blush" cx="66" cy="151" r="9" />
        <circle className="pet-blush" cx="194" cy="151" r="9" />
        <ellipse className="pet-body" cx="130" cy="224" rx="78" ry="51" />
        <ellipse className="pet-paw" cx="84" cy="250" rx="40" ry="25" />
        <ellipse className="pet-paw" cx="176" cy="250" rx="40" ry="25" />
        <path className="pet-tail" d="M55 219c-24-13-30-37-15-51" />
      </svg>
    </div>
  )
}
