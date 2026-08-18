import type { PetAction } from '../domain/petRules'

interface PetActionBarProps {
  onAction: (action: PetAction) => void
}

const actions: Array<{ id: PetAction; icon: string; label: string }> = [
  { id: 'feed', icon: '/nest/action-feed.png', label: '喂食' },
  { id: 'play', icon: '/nest/action-play.png', label: '玩耍' },
  { id: 'clean', icon: '/nest/action-clean.png', label: '清洁' },
  { id: 'sleep', icon: '/nest/action-sleep.png', label: '睡觉' }
]

export function PetActionBar({ onAction }: PetActionBarProps) {
  return (
    <section className="pet-actions-panel" aria-label="照顾小多利">
      <h3>照顾小多利</h3>
      <div className="pet-actions">
        {actions.map((action) => (
          <button
            className="pet-action-button"
            key={action.id}
            aria-label={action.label}
            onClick={() => onAction(action.id)}
          >
            <img src={action.icon} alt="" />
          </button>
        ))}
      </div>
    </section>
  )
}
