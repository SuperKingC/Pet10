import type { PetAction } from '../domain/petRules'

interface PetActionBarProps {
  onAction: (action: PetAction) => void
}

const actions: Array<{ id: PetAction; icon: string; label: string }> = [
  { id: 'feed', icon: '🥣', label: '喂食' },
  { id: 'play', icon: '🎾', label: '玩耍' },
  { id: 'clean', icon: '🫧', label: '清洁' },
  { id: 'sleep', icon: '🌙', label: '睡觉' }
]

export function PetActionBar({ onAction }: PetActionBarProps) {
  return (
    <div className="pet-actions" aria-label="照顾小多利">
      {actions.map((action) => (
        <button key={action.id} onClick={() => onAction(action.id)}>
          <span>{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  )
}
