export type MiniappLaunchState = 'shared-room' | 'invite' | 'room-list' | 'waiting-room'

export interface MiniappLaunchContext {
  entry: MiniappLaunchState
  activeRoomId?: string
  rooms: Array<{ id: string }>
}

export function resolveMiniappLaunchState(
  context: MiniappLaunchContext,
  invitationToken?: string
): MiniappLaunchState {
  if (invitationToken) return 'invite'
  return context.entry
}
