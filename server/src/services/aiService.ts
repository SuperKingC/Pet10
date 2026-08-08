import type { ChatMessage, FortuneContent, Pet, PetMemory, User } from '../domain/models.js'
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

export interface AiFortuneInput {
  ownerNames: [string, string]
  zodiacs: [string | null, string | null]
  moodsText?: string
  pet: Pet
}

export interface AiService {
  reply(input: AiReplyInput): Promise<string>
  fortune(input: AiFortuneInput): Promise<FortuneContent | undefined>
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

    async fortune({ ownerNames, zodiacs, moodsText, pet }) {
      if (!config.enabled || !config.apiKey) return undefined
      const [a, b] = ownerNames
      const prompt = [
        '你是玄学运势写手，文风俏皮神秘、短句、无 AI 腔。',
        `为两位好友${a}（${zodiacs[0] ?? '星座未知'}）与${b}（${zodiacs[1] ?? '星座未知'}）和他们的宠物小狗（等级${pet.level}）写今日共养运势。`,
        moodsText ? `今日心情：${moodsText}` : '',
        '严格输出 JSON，字段：mine(给第一人的一句运势)、friend(给第二人的一句运势)、pair(两人+宠物的一句共养运势)、luckyAction(取值 feed/play/clean/sleep)、luckyColor(一个颜色词)、luckyNumber(1-99整数)。只输出 JSON。'
      ].filter(Boolean).join('\n')
      try {
        const raw = await chat([{ role: 'user', content: prompt }])
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Partial<FortuneContent>
        if (typeof parsed.mine !== 'string' || typeof parsed.friend !== 'string' || typeof parsed.pair !== 'string') return undefined
        const actions = ['feed', 'play', 'clean', 'sleep'] as const
        return {
          mine: parsed.mine.slice(0, 80),
          friend: parsed.friend.slice(0, 80),
          pair: parsed.pair.slice(0, 80),
          luckyAction: actions.includes(parsed.luckyAction as typeof actions[number]) ? parsed.luckyAction as FortuneContent['luckyAction'] : 'play',
          luckyColor: typeof parsed.luckyColor === 'string' ? parsed.luckyColor.slice(0, 10) : '奶油黄',
          luckyNumber: typeof parsed.luckyNumber === 'number' ? Math.max(1, Math.min(99, Math.round(parsed.luckyNumber))) : 7
        }
      } catch {
        return undefined
      }
    }
  }
}
