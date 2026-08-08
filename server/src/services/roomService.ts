import type { MessageKind } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { AiService } from './aiService.js'
import type { createPetBrain } from './petBrain.js'

interface RoomServiceDependencies {
  repositories: RepositoryBundle
  ai: AiService
  brain?: ReturnType<typeof createPetBrain>
  logError?: (message: string, error: unknown) => void
}

export function createRoomService({
  repositories,
  ai,
  brain,
  logError = (message, error) => console.error(message, error)
}: RoomServiceDependencies) {
  async function assertMember(roomId: string, userId: string) {
    if (!(await repositories.rooms.isMember(roomId, userId))) throw new Error('room_forbidden')
  }

  return {
    async bootstrap(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      const room = await repositories.rooms.findById(roomId)
      const pet = await repositories.pets.findByRoomId(roomId)
      // 私聊房（pet_dm）没有宠物，其余房间必须有
      if (!pet && room?.type !== 'pet_dm') throw new Error('pet_not_found')
      // 每日首开问候（后台触发，通过 socket 送达）
      void brain?.dailyGreeting(roomId)
      return {
        room,
        pet: pet ?? null,
        messages: await repositories.messages.listRecent(roomId, 50),
        memories: await repositories.memories.listByRoom(roomId)
      }
    },
    async listMessages(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      return repositories.messages.listRecent(roomId, 50)
    },
    async sendMessage(roomId: string, userId: string, input: { text: string; imageUrl?: string }) {
      await assertMember(roomId, userId)
      const kind: MessageKind = input.imageUrl ? 'image' : 'text'
      const message = await repositories.messages.create({
        roomId,
        senderType: 'user',
        senderId: userId,
        kind,
        text: input.text,
        imageUrl: input.imageUrl
      })
      // 小多利始终“看”到每条消息，按规则决定是否接话（不阻塞发送响应）
      void brain?.onUserMessage(roomId, message)
      return message
    },
    async requestPetReply(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      if (brain) return brain.forceReply(roomId)
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      const messages = await repositories.messages.listRecent(roomId, 50)
      const memories = await repositories.memories.listByRoom(roomId)
      let text: string
      try {
        text = await ai.reply({ messages, memories, pet })
      } catch (error) {
        logError('Pet AI reply failed', error)
        text = '汪呜，小多利刚才打了个盹，稍后再叫我一次吧。'
      }
      return repositories.messages.create({
        roomId,
        senderType: 'pet',
        kind: 'pet',
        text
      })
    },
    async listMemories(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      return repositories.memories.listByRoom(roomId)
    },
    async deleteMemory(roomId: string, userId: string, memoryId: string) {
      await assertMember(roomId, userId)
      await repositories.memories.deleteById(roomId, memoryId)
    }
  }
}
