import { describe, expect, it } from 'vitest'
import {
  getFortuneAvailability,
  getGenderLabel,
  getInvitationButtonState,
  getNestActionButton,
  getNestSceneMode,
  getProfilePresentation,
  getMessagePresentation,
  hasFriendConversations,
  shouldShowNestFeedback
} from './miniappViewModel'
import type { LaunchContext } from '../../services/launchContextApi'
import type { PetState } from '../../domain/types'

describe('miniapp view model', () => {
  it('shows only active loading or actionable Pet10 feedback on the nest tab', () => {
    expect(shouldShowNestFeedback('nest', true, '')).toBe(true)
    expect(shouldShowNestFeedback('nest', false, '读取 Pet10 状态失败')).toBe(true)
    expect(shouldShowNestFeedback('nest', false, '')).toBe(false)
    expect(shouldShowNestFeedback('calendar', true, '读取 Pet10 状态失败')).toBe(false)
  })

  it('prefers the authenticated profile name and avatar', () => {
    expect(getProfilePresentation({
      displayName: '小明',
      avatarUrl: 'https://example.com/avatar.png',
    })).toEqual({
      displayName: '小明',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })

  it('falls back when profile data is unavailable', () => {
    expect(getProfilePresentation(null)).toEqual({
      displayName: '微信用户',
      avatarUrl: null,
    })
  })

  it('shows readable gender labels and defaults to private', () => {
    expect(getGenderLabel('female')).toBe('女')
    expect(getGenderLabel('male')).toBe('男')
    expect(getGenderLabel('private')).toBe('保密')
    expect(getGenderLabel(undefined)).toBe('保密')
  })

  it('offers a retry instead of leaving invitation permanently disabled', () => {
    expect(getInvitationButtonState(false, false)).toEqual({
      label: '重新准备邀请',
      disabled: false,
      shareReady: false,
    })
    expect(getInvitationButtonState(false, true)).toEqual({
      label: '正在准备邀请…',
      disabled: true,
      shareReady: false,
    })
    expect(getInvitationButtonState(true, false)).toEqual({
      label: '邀请好友一起养一只小多利吧~',
      disabled: false,
      shareReady: true,
    })
  })

  it('does not request fortune before a birthday is set', () => {
    expect(getFortuneAvailability(null)).toEqual({
      ready: false,
      message: '请先在“我的”中设置生日',
    })
    expect(getFortuneAvailability('1990-01-01')).toEqual({
      ready: true,
      message: '',
    })
  })

  it('derives the nest scene mode from context, pet and unlock state', () => {
    const emptyContext = { rooms: [] } as unknown as LaunchContext
    const petlessRoomContext = { rooms: [{ id: 'room-1', pet: null }] } as unknown as LaunchContext
    const roomContext = { rooms: [{ id: 'room-1', pet: { id: 'pet-1' } }] } as unknown as LaunchContext
    const pet = {} as PetState
    const unlocked = { initialized: true, unlockedRoomIds: ['room-1'] }
    const locked = { initialized: true, unlockedRoomIds: [] }

    expect(getNestSceneMode(null, null)).toBe('loading')
    expect(getNestSceneMode(emptyContext, null)).toBe('empty')
    expect(getNestSceneMode(petlessRoomContext, null)).toBe('empty')
    expect(getNestSceneMode(petlessRoomContext, pet)).toBe('empty')
    expect(getNestSceneMode(roomContext, null)).toBe('loading')
    expect(getNestSceneMode(roomContext, pet, 'room-1')).toBe('active')
    expect(getNestSceneMode(roomContext, pet, 'room-1', unlocked)).toBe('active')
    expect(getNestSceneMode(roomContext, pet, 'room-1', locked)).toBe('locked')
  })

  it('replaces the invite button with the unlock button after a friend accepts', () => {
    const invite = getInvitationButtonState(true, false)
    // 小多利一人一只：已在养（active）时不再展示邀请好友入口
    expect(getNestActionButton('active', invite)).toBeNull()
    expect(getNestActionButton('empty', invite)).toEqual({
      kind: 'invite',
      label: '邀请好友一起养一只小多利吧~',
      disabled: false,
      shareReady: true,
    })
    expect(getNestActionButton('locked', invite)).toEqual({
      kind: 'unlock',
      label: '玩家已接受邀请解锁小多利~',
      disabled: false,
      shareReady: false,
    })
    expect(getNestActionButton('locked', invite, true)?.disabled).toBe(true)
  })

  it('treats only pair rooms as friend conversations on the messages tab', () => {
    expect(hasFriendConversations([])).toBe(false)
    expect(hasFriendConversations([{ type: 'pet_dm' }])).toBe(false)
    expect(hasFriendConversations([{ type: 'pet_dm' }, { type: 'pair' }])).toBe(true)
  })

  it('tells my messages apart from friend and pet messages in shared rooms', () => {
    expect(getMessagePresentation({ senderType: 'user', senderId: 'me-1' }, 'me-1', '真好友')).toEqual({
      mine: true,
      name: '我'
    })
    expect(getMessagePresentation({ senderType: 'user', senderId: 'friend-1' }, 'me-1', '真好友')).toEqual({
      mine: false,
      name: '真好友'
    })
    expect(getMessagePresentation({ senderType: 'pet' }, 'me-1', '真好友')).toEqual({
      mine: false,
      name: '小多利'
    })
    // 历史数据没有 senderId 时保持旧行为，按自己的消息处理
    expect(getMessagePresentation({ senderType: 'user' }, 'me-1', '真好友')).toEqual({
      mine: true,
      name: '我'
    })
  })
})
