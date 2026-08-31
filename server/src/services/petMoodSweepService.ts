import type { RepositoryBundle } from '../repositories/contracts.js'

interface PetMoodSweepDependencies {
  repositories: RepositoryBundle
  decayIfIdle: (roomId: string) => Promise<void>
  logError?: (message: string, error: unknown) => void
}

/** 每小时把所有房间闲置的宠物心情衰减一点；单房失败不影响其他房间 */
export function createPetMoodSweepService({
  repositories,
  decayIfIdle,
  logError = (message, error) => console.error(message, error)
}: PetMoodSweepDependencies) {
  async function runOnce() {
    let rooms
    try {
      rooms = await repositories.rooms.listAll()
    } catch (error) {
      logError('pet mood sweep failed', error)
      return
    }
    for (const room of rooms) {
      try {
        await decayIfIdle(room.id)
      } catch (error) {
        logError('pet mood decay failed', error)
      }
    }
  }

  return {
    runOnce,
    start(intervalMs = 60 * 60 * 1000) {
      const timer = setInterval(() => {
        void runOnce()
      }, intervalMs)
      timer.unref?.()
      return () => clearInterval(timer)
    }
  }
}
