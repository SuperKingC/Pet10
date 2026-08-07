import type { MessageKind } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import type { AiService } from './aiService.js'

interface RoomServiceDependencies {
  repositories: RepositoryBundle
  ai: AiService
}

export function createRoomService({ repositories, ai }: RoomServiceDependencies) {
  async function assertMember(roomId: string, userId: string) {
    if (!(await repositories.rooms.isMember(roomId, userId))) throw new Error('room_forbidden')
  }

  return {
    async bootstrap(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      return {
        room: await repositories.rooms.findById(roomId),
        pet,
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
      return repositories.messages.create({
        roomId,
        senderType: 'user',
        senderId: userId,
        kind,
        text: input.text,
        imageUrl: input.imageUrl
      })
    },
    async requestPetReply(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      const messages = await repositories.messages.listRecent(roomId, 50)
      const memories = await repositories.memories.listByRoom(roomId)
      let text: string
      try {
        text = await ai.reply({ messages, memories, pet })
      } catch {
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
