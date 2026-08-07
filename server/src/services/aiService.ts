import type { ChatMessage, Pet, PetMemory } from '../domain/models.js'
import type { ServerConfig } from '../config.js'

export interface AiReplyInput {
  messages: ChatMessage[]
  memories: PetMemory[]
  pet: Pet
}

export interface AiService {
  reply(input: AiReplyInput): Promise<string>
}

export function createAiService(config: ServerConfig['ai']): AiService {
  return {
    async reply({ messages, memories, pet }) {
      if (!config.enabled || !config.apiKey) {
        return '汪！我在认真听。等主人配置好 AI 接口后，我就能更聪明地陪你们聊天啦。'
      }

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.8,
          messages: [
            {
              role: 'system',
              content: [
                '你是共享宠物小狗“小多利”，同时陪伴两位好友。',
                '语气温暖、活泼、简短，不泄露其他聊天室信息。',
                `当前状态：等级${pet.level}，饱食${pet.hunger}，心情${pet.mood}，精力${pet.energy}。`,
                `共同记忆：${memories.map((memory) => memory.text).join('；') || '暂无'}`
              ].join('\n')
            },
            ...messages.slice(-30).map((message) => ({
              role: message.senderType === 'pet' ? 'assistant' : 'user',
              content: message.text
            }))
          ]
        })
      })
      if (!response.ok) {
        const errorBody = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 500)
        throw new Error(`ai_request_failed:${response.status}${errorBody ? `:${errorBody}` : ''}`)
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
      return data.choices?.[0]?.message?.content?.trim() || '汪？小多利刚刚走神了，再叫我一次吧。'
    }
  }
}
