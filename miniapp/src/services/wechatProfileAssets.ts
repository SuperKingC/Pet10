import Taro from '@tarojs/taro'
import { compressImageToDataUrl } from './imageCompression'

// 与服务端 sessionRoutes / authRoutes 的 avatarUrl 上限保持一致
export const MAX_AVATAR_CHARS = 700_000

/**
 * 把微信返回的头像临时文件转成 dataURL。
 * 已经是 http(s) 或 dataURL 的地址原样返回。
 */
export async function wechatAvatarToDataUrl(src: string): Promise<string> {
  if (src.startsWith('http') || src.startsWith('data:')) return src

  return compressImageToDataUrl(src, {
    widths: [640, 480, 360],
    maxChars: MAX_AVATAR_CHARS,
    oversizeMessage: '头像太大，请换一张',
  })
}
