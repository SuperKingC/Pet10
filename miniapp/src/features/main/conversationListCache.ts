import { socialApi, type MiniappConversation } from '../../services/socialApi'

/**
 * 会话列表内存缓存（单槽）：消息 tab 每次切换都会重挂载视图，
 * 没有这层缓存时每次进入都要等首轮接口返回，期间闪「无好友空态页」再跳成会话列表。
 * 只存最后一次成功结果，tab 切入时先渲染缓存直出列表，后台静默刷新替换；
 * 与周日记缓存同模式。请求失败时保留缓存，不闪空态。
 */
let cachedConversations: MiniappConversation[] | null = null
let fetchInFlight = false

export function getCachedConversations(): MiniappConversation[] | null {
  return cachedConversations
}

export function fetchConversationsWithCache(): Promise<MiniappConversation[]> {
  if (cachedConversations !== null && fetchInFlight) {
    return Promise.resolve(cachedConversations)
  }
  fetchInFlight = true
  return socialApi.listConversations()
    .then((result) => {
      cachedConversations = result
      return result
    })
    .finally(() => {
      fetchInFlight = false
    })
}

export function clearCachedConversations() {
  cachedConversations = null
}
