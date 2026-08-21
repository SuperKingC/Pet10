import type { PetAction, PetState } from '../../domain/types'
import type { LaunchContext } from '../../services/launchContextApi'

export interface MainViewProps {
  context: LaunchContext | null
  pet: PetState | null
  roomId: string
  onAction(action: PetAction): void
  onSelectRoom(roomId: string): void
  onOpenRoom(): void
}
