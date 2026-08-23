import type { PetState } from '../domain/types'
import type { LaunchContext } from './launchContextApi'
import { mapRoomPet } from './petMapper'
import type { RoomBootstrap } from './petApi'

export interface PreparedLaunchContext {
  context: LaunchContext
  roomId: string
  pet: PetState | null
}

export async function prepareLaunchContext(
  getContext: () => Promise<LaunchContext>,
  getPet: (roomId: string) => Promise<RoomBootstrap>,
): Promise<PreparedLaunchContext> {
  const context = await getContext()
  const roomId = context.activeRoomId || ''
  const pet = roomId ? (await getPet(roomId)).pet : null
  return { context, roomId, pet: pet ? mapRoomPet(pet) : null }
}
