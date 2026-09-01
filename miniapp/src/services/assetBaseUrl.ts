/**
 * 静态资产根地址解析（正式 COS 版本目录）。
 * 构建时注入：TARO_ASSET_BASE_URL 必填（正式域名+版本目录）；TARO_ASSET_DEV_BASE_URL 仅本地
 * 开发构建注入（本机 http-server 服务 public/ 模拟 COS，如 http://127.0.0.1:8787）。
 * 子路径由各功能自持：塔罗拼 {根}/tarot/...，衣柜套装拼 {根}/wardrobe/...，本模块只管根地址。
 * 注意：这里不能静态 import @tarojs/taro（在 node/vitest 里导入即崩），平台读取走守卫式 wx 全局。
 */

const prodBaseUrl = (
  typeof TARO_ASSET_BASE_URL === 'string' ? TARO_ASSET_BASE_URL : ''
).replace(/\/$/, '')
const devBaseUrl = (
  typeof TARO_ASSET_DEV_BASE_URL === 'string' ? TARO_ASSET_DEV_BASE_URL : ''
).replace(/\/$/, '')

/**
 * 纯函数核心（便于单测）：开发者工具模拟器且注入了本地模拟地址时走本机地址，
 * 真机与正式包（未注入 dev 地址）一律走正式域名。入参自动去尾部斜杠。
 */
export function resolveAssetBaseUrlForPlatform(
  platform: string,
  prodBaseUrlOverride = prodBaseUrl,
  devBaseUrlOverride = devBaseUrl,
): string {
  const prod = prodBaseUrlOverride.replace(/\/$/, '')
  const dev = devBaseUrlOverride.replace(/\/$/, '')
  if (platform === 'devtools' && dev) return dev
  return prod
}

function currentPlatform(): string {
  try {
    const wxApi = (globalThis as { wx?: { getSystemInfoSync?: () => { platform?: string } } }).wx
    return wxApi?.getSystemInfoSync?.().platform ?? ''
  } catch {
    return ''
  }
}

let cachedBaseUrl: string | null = null

/** 运行时资产根地址：每次启动按宿主平台解析一次后缓存 */
export function resolveAssetBaseUrl(): string {
  if (cachedBaseUrl === null) {
    cachedBaseUrl = resolveAssetBaseUrlForPlatform(currentPlatform())
  }
  return cachedBaseUrl
}
