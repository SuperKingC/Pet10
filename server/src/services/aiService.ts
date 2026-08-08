import type { ChatMessage, Pet, PetMemory, User } from '../domain/models.js'
import type { ServerConfig } from '../config.js'
import { buildSystemPrompt } from '../ai/persona.js'

export interface AiReplyInput {
  messages: ChatMessage[]
  memories: PetMemory[]
  pet: Pet
  owners?: User[]
  moodsText?: string
  roomType?: 'pair' | 'pet_dm'
}

export interface AiService {
  reply(input: AiReplyInput): Promise<string>
  /** 从近期聊天中提取一条值得记住的事实（无则 null） */
  extractMemory(recentMessages: ChatMessage[], existingTexts: string[]): Promise<string | null>
}

export function createAiService(config: ServerConfig['ai']): AiService {
  async function chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ model: config.model, temperature: 0.9, messages })
    })
    if (!response.ok) {
      const errorBody = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 500)
      throw new Error(`ai_request_failed:${response.status}${errorBody ? `:${errorBody}` : ''}`)
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content?.trim() || ''
  }

  return {
    async reply({ messages, memories, pet, owners = [], moodsText, roomType = 'pair' }) {
      if (!config.enabled || !config.apiKey) {
        return '汪！我在认真听。等主人配置好 AI 接口后，我就能更聪明地陪你们聊天啦。'
      }
      const system = buildSystemPrompt({ pet, memories, owners, moodsText, roomType, hour: new Date().getHours() })
      // 消息分层：最近 20 条全文，更早的压缩为摘要行
      const recent = messages.slice(-20)
      const older = messages.slice(0, -20)
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
      if (older.length > 0) {
        history.push({
          role: 'user',
          content: `（更早的聊天摘要：${older.slice(-10).map((message) => message.text).join('；')}）`
        })
        history.push({ role: 'assistant', content: '汪！（我记得之前聊的哦）' })
      }
      history.push(...recent.map((message) => ({
        role: message.senderType === 'pet' ? 'assistant' as const : 'user' as const,
        content: message.text
      })))
      try {
        const text = await chat([{ role: 'system', content: system }, ...history])
        return text || '汪？小多利刚刚走神了，再叫我一次吧。'
      } catch {
        return '汪呜，小多利刚才打了个盹，稍后再叫我一次吧。'
      }
    },

    async extractMemory(recentMessages, existingTexts) {
      if (!config.enabled || !config.apiKey) return null
      const userMessages = recentMessages.filter((message) => message.senderType === 'user')
      if (userMessages.length === 0) return null
      const prompt = [
        '你是记忆提取器。下面是一段宠物与主人的聊天记录。',
        `已有记忆：${existingTexts.slice(0, 30).join('；') || '无'}`,
        `近期聊天：${userMessages.slice(-12).map((message) => message.text).join('；')}`,
        '判断主人是否透露了值得长期记住的个人事实（如职业/学校/城市/喜好/忌口/生日/计划/宠物昵称/重要的人）。',
        '若有，用一句不超过30字的中文陈述句输出这条记忆（例：“主人小陈在学吉他”）；若没有值得记的内容，严格输出 NULL。',
        '不要输出任何解释，只输出记忆句子或 NULL。已有记忆里的内容不要重复。'
      ].join('\n')
      try {
        const raw = await chat([{ role: 'user', content: prompt }])
        const text = raw.replace(/^["'“”]+|["'“”]+$/g, '').trim()
        if (!text || /^null$/i.test(text) || text.length > 60) return null
        if (existingTexts.includes(text)) return null
        return text.slice(0, 30)
      } catch {
        return null
      }
    }
  }
}
