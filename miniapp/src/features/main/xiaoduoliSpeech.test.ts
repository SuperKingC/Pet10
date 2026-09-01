import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getXiaoduoliSpeech } from './xiaoduoliSpeech'

const basePet = {
  hunger: 80,
  mood: 90,
  energy: 90,
  health: 100,
  moodLabel: 'happy' as const,
}

describe('xiaoduoliSpeech', () => {
  it('prioritizes pressing needs over idle chat', () => {
    expect(getXiaoduoliSpeech({ ...basePet, hunger: 0 }, 0)).toBe('肚子咕咕叫了，想吃东西…')
    expect(getXiaoduoliSpeech({ ...basePet, energy: 10 }, 0)).toBe('跑累啦，让我歇一会儿')
    expect(getXiaoduoliSpeech({ ...basePet, health: 15 }, 0)).toBe('有点不舒服，多陪陪我')
    expect(getXiaoduoliSpeech({ ...basePet, moodLabel: 'sleepy' }, 0)).toBe('困困的，想打个盹')
    expect(getXiaoduoliSpeech({ ...basePet, mood: 20 }, 0)).toBe('有点小情绪，哄哄我嘛')
  })

  it('cycles the idle phrases by index and stays in range for negative indexes', () => {
    expect(getXiaoduoliSpeech(basePet, 0)).toBe('开心地陪着你们')
    expect(getXiaoduoliSpeech(basePet, 1)).toBe('最喜欢和你们待在一起啦')
    expect(getXiaoduoliSpeech(basePet, 5)).toBe('开心地陪着你们')
    expect(getXiaoduoliSpeech(basePet, -1)).toBe(getXiaoduoliSpeech(basePet, 4))
  })

  it('speaks with mood-engine lines when the pet feels neglected', () => {
    expect(getXiaoduoliSpeech({ ...basePet, moodState: 'bored' }, 0)).toBe('好无聊呀，陪我玩玩嘛')
    expect(getXiaoduoliSpeech({ ...basePet, moodState: 'sulky' }, 1)).toBe('哦～终于想起我啦？')
    expect(getXiaoduoliSpeech({ ...basePet, moodState: 'angry' }, -1)).toBe(
      getXiaoduoliSpeech({ ...basePet, moodState: 'angry' }, 1)
    )
    // 需求状态仍然最高优先
    expect(getXiaoduoliSpeech({ ...basePet, moodState: 'sulky', hunger: 0 }, 0)).toBe('肚子咕咕叫了，想吃东西…')
  })
})

describe('nest scene layout', () => {
  const stylesPath = path.resolve(__dirname, 'MiniappNestView.scss')

  it('keeps shortcuts inside the shorter scene with balanced spacing', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    expect(styles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*?top:\s*108px;/)
    expect(styles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*?gap:\s*16px;/)
  })
})
