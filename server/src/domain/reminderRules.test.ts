import { describe, expect, it } from 'vitest'
import { parseReminderCancel, parseReminderRequest } from './reminderRules.js'

const now = new Date('2026-08-12T02:00:00.000Z')

describe('parseReminderRequest', () => {
  it('parses a relative reminder', () => {
    expect(parseReminderRequest('30分钟后提醒我关火', now)).toEqual({
      content: '关火',
      scheduleType: 'once',
      nextRunAt: new Date('2026-08-12T02:30:00.000Z')
    })
  })

  it('parses tomorrow morning in Asia/Shanghai', () => {
    expect(parseReminderRequest('明天早上8点提醒我带伞', now)).toEqual({
      content: '带伞',
      scheduleType: 'once',
      nextRunAt: new Date('2026-08-13T00:00:00.000Z')
    })
  })

  it('parses daily reminders', () => {
    expect(parseReminderRequest('每天晚上11点提醒我睡觉', now)).toEqual({
      content: '睡觉',
      scheduleType: 'daily',
      nextRunAt: new Date('2026-08-12T15:00:00.000Z')
    })
  })

  it('parses weekly reminders', () => {
    expect(parseReminderRequest('每周一早上9点提醒我开会', now)).toEqual({
      content: '开会',
      scheduleType: 'weekly',
      weekday: 1,
      nextRunAt: new Date('2026-08-17T01:00:00.000Z')
    })
  })

  it('rejects ambiguous reminder times', () => {
    expect(parseReminderRequest('提醒我交作业', now)).toBeNull()
  })
})

describe('parseReminderCancel', () => {
  it('detects cancel intents that mention reminders', () => {
    expect(parseReminderCancel('取消提醒')).toBe(true)
    expect(parseReminderCancel('帮我撤掉明天的提醒')).toBe(true)
    expect(parseReminderCancel('别提醒我了，谢谢')).toBe(true)
    expect(parseReminderCancel('那个提醒不要了')).toBe(true)
  })

  it('does not treat normal reminder requests as cancels', () => {
    expect(parseReminderCancel('明天早上8点提醒我开会')).toBe(false)
    expect(parseReminderCancel('今天天气不错')).toBe(false)
  })
})
