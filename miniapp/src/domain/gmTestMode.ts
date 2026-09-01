/** GM 本地测试模式（纯函数）：照顾动作与换装不依赖服务端，本地推进状态，
 *  供验收行为表现（睡姿/闲逛/叼娃/换装立绘）使用。开关持久化见 services/gmTestStorage。 */

import type { MiniappInventory } from './nestTaskModel'
import type { PetAction, PetState } from './types'
import {
  EMPTY_OUTFIT,
  type OutfitPieces,
  type SuitKey,
  type WardrobeView
} from './wardrobeModel'

/** 动作 → 恢复的状态项：喂食回饱食、玩耍回心情、清洁回健康、睡觉回精力 */
const ACTION_STAT: Record<PetAction, 'hunger' | 'mood' | 'energy' | 'health'> = {
  feed: 'hunger',
  play: 'mood',
  clean: 'health',
  sleep: 'energy'
}

const MOCK_STAT_GAIN = 18
const MOCK_EXP_GAIN = 10
const MOCK_ITEM_COUNT = 99

/** 与服务端 wardrobeCatalog 同口径的目录镜像（顺序与 key 一致；测试模式全部解锁，
 *  conditionText 不会展示，留空省体积） */
export const MOCK_WARDROBE_CATALOG: Array<{ key: SuitKey; name: string; conditionText: string }> = [
  { key: 'default', name: '原装小多利', conditionText: '' },
  { key: 'scarf', name: '围巾', conditionText: '' },
  { key: 'hoodie', name: '连帽衫', conditionText: '' },
  { key: 'overalls', name: '背带裤', conditionText: '' },
  { key: 'dress', name: '小裙子', conditionText: '' },
  { key: 'raincoat', name: '雨衣', conditionText: '' },
  { key: 'pajamas', name: '睡衣', conditionText: '' },
  { key: 'bag', name: '小包', conditionText: '' },
  { key: 'hat', name: '帽子', conditionText: '' }
]

/** 本地测试衣柜视图：全部解锁 + 给定穿戴；默契态清零（提交只在本地登记 myPick） */
export function buildMockWardrobeView(pieces: OutfitPieces = EMPTY_OUTFIT): WardrobeView {
  return {
    equipped: pieces.body,
    outfit: { body: pieces.body, hat: pieces.hat, scarf: pieces.scarf, bag: pieces.bag },
    items: MOCK_WARDROBE_CATALOG.map((item) => ({ ...item, unlocked: true })),
    match: { myPick: null, partnerPicked: false, matchedToday: false, streak: 0, bestStreak: 0 }
  }
}

/** 测试库存：三件照顾道具各 99，动作按钮永远可点 */
export const MOCK_INVENTORY: MiniappInventory = {
  items: [
    { itemId: 'dog_food', name: '狗粮', count: MOCK_ITEM_COUNT },
    { itemId: 'ball', name: '皮球', count: MOCK_ITEM_COUNT },
    { itemId: 'soap', name: '香皂', count: MOCK_ITEM_COUNT }
  ]
}

/** 本地推进宠物状态：对应状态 +18（封顶 100）、经验 +10（满则升级，升级门槛不变）；
 *  清掉服务端下发的心情档文案，让说话/弹幕回落到按数值推导，测试时反馈与状态一致 */
export function applyMockPetAction(pet: PetState, action: PetAction): PetState {
  const stat = ACTION_STAT[action]
  const next: PetState = {
    ...pet,
    [stat]: Math.min(100, pet[stat] + MOCK_STAT_GAIN),
    experience: pet.experience + MOCK_EXP_GAIN,
    moodState: undefined,
    moodCaption: undefined
  }
  if (next.experience >= next.experienceToNextLevel) {
    next.level += 1
    next.experience -= next.experienceToNextLevel
  }
  return next
}
