import type { PetState } from '../domain/types'
import { PetAvatar } from './PetAvatar'

interface PetStatusCardProps {
  pet: PetState
  onOpenMemories: () => void
}

const moodText = {
  happy: '开心地陪着你们',
  hungry: '肚子有点饿',
  sleepy: '困困的想休息',
  clingy: '特别想撒娇'
}

function StatusBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="status-line">
      <div className="status-line__meta">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="status-line__track">
        <span style={{ width: `${value}%`, background: tone }} />
      </div>
    </div>
  )
}

export function PetStatusCard({ pet, onOpenMemories }: PetStatusCardProps) {
  const experiencePercent = Math.min(100, (pet.experience / pet.experienceToNextLevel) * 100)

  return (
    <section className="pet-card">
      <div className="pet-card__visual">
        <div className="pet-level">Lv.{pet.level}</div>
        <PetAvatar mood={pet.moodLabel} />
      </div>
      <div className="pet-card__content">
        <div className="pet-card__heading">
          <div>
            <span className="eyebrow">共享 AI 宠物</span>
            <h1>{pet.name}</h1>
            <p>{moodText[pet.moodLabel]}</p>
          </div>
          <button className="memory-button" onClick={onOpenMemories}>
            记忆
          </button>
        </div>
        <div className="experience">
          <div>
            <span>成长经验</span>
            <strong>{pet.experience}/{pet.experienceToNextLevel}</strong>
          </div>
          <div className="experience__track"><span style={{ width: `${experiencePercent}%` }} /></div>
        </div>
        <div className="status-grid">
          <StatusBar label="饱食" value={pet.hunger} tone="#f3a85d" />
          <StatusBar label="心情" value={pet.mood} tone="#ed7e9a" />
          <StatusBar label="精力" value={pet.energy} tone="#66b9ad" />
          <StatusBar label="健康" value={pet.health} tone="#82a9e9" />
        </div>
      </div>
    </section>
  )
}
